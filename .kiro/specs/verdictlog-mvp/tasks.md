# Implementation Plan: VerdictLog MVP

## Overview

Implement VerdictLog end-to-end on the existing Devvit Web scaffold. The plan follows the dependency order: shared types → server data layer → server middleware → tRPC router → menu/form handlers → devvit.json registration → web UI lib → web UI components → web UI pages → React app entry point → tests. Each task is scoped to one focused session and builds directly on the previous steps.

## Tasks

- [x] 1. Shared types and validation constants
  - [x] 1.1 Create `src/shared/types.ts` with `Severity`, `ContentType`, `Verdict`, `Rule`, and `RetentionSettings` type aliases
    - Define all fields exactly as specified in the design data models section
    - Use type aliases, not interfaces
    - Export all types as named exports
    - _Requirements: 1.7, 4.3, 5.2_

  - [x] 1.2 Create `src/shared/validation.ts` with shared validation constants and pure validation functions
    - Export `MAX_REASON_LEN = 500`, `MAX_RULE_NAME_LEN = 100`, `MAX_RULE_DESC_LEN = 500`, `MIN_RETENTION_DAYS = 1`, `MAX_RETENTION_DAYS = 3650`, `MAX_RULES_PER_SUB = 50`, `DEFAULT_RETENTION_DAYS = 90`
    - Export `validateReason(s: string): { ok: true } | { ok: false; message: string }` — rejects length > 500 or any `\n`/`\r`
    - Export `validateUsername(s: string): { ok: true } | { ok: false; message: string }` — rejects empty or chars outside `[A-Za-z0-9_-]`
    - Export `validateRuleName(s: string): { ok: true } | { ok: false; message: string }` — rejects empty or length > 100
    - Export `validateRetentionDays(n: number): { ok: true } | { ok: false; message: string }` — rejects outside [1, 3650] with message "Retention period must be between 1 and 3650 days"
    - Export `computeExpiresAt(createdAt: number, retentionDays: number): number` — returns `createdAt + retentionDays * 86400 * 1000`
    - Export `DECISION_TEMPLATES: readonly string[]` — the seven pre-defined template strings from Requirement 1.12
    - _Requirements: 1.6, 1.8, 1.12, 2.2, 4.3, 4.9, 5.2, 5.6_

- [ ] 2. Redis data layer — verdict core
  - [ ] 2.1 Create `src/server/core/verdict.ts` with `createVerdict`, `getCaseFile`, `deleteVerdict`, and `getPriorCount`
    - `createVerdict(input, subredditId, retentionDays)`: generates `id = 'v_' + crypto.randomUUID()`, sets `createdAt = Date.now()`, computes `expiresAt = computeExpiresAt(createdAt, retentionDays ?? DEFAULT_RETENTION_DAYS)`, calls `hSet vl:{subId}:verdict:{id}` with all Verdict fields (no body fields), sets Redis TTL via `expire`, calls `lPush vl:{subId}:user:{username}:verdicts {id}`, then calls `expireAt vl:{subId}:user:{username}:verdicts Math.ceil(expiresAt / 1000)` to extend the user index TTL to at least the new verdict's expiry
    - `getCaseFile(username, subredditId)`: calls `lRange` to get all IDs; for each ID calls `hGetAll`; prunes IDs whose hash is missing or whose `expiresAt <= Date.now()` via `lRem`; filters remaining verdicts to `expiresAt > Date.now()`; sorts by `createdAt` descending; returns `Verdict[]`
    - `deleteVerdict(verdictId, subredditId)`: calls `hGetAll vl:{subId}:verdict:{verdictId}` to fetch the verdict and resolve `username`; returns 404 if not found; returns 403 if `verdict.subredditId !== subredditId`; calls `del` on the hash key; calls `lRem vl:{subId}:user:{username}:verdicts 0 {verdictId}`
    - `getPriorCount(username, subredditId)`: calls `lRange`, fetches each hash, filters `expiresAt > Date.now()`, returns `{ count, mostRecent: { ruleName, severity, createdAt } | null }`
    - _Requirements: 1.7, 1.8, 1.10, 1.13, 2.3, 2.7, 6.4, 8.1, 8.2_

  - [ ]* 2.2 Write property test for verdict storage round-trip (Property 3)
    - **Property 3: Verdict storage round-trip preserves all required fields**
    - **Validates: Requirements 1.7**
    - Use fast-check `fc.record` to generate valid Verdict inputs; mock Redis with an in-memory map; assert every required field survives the round-trip

  - [ ]* 2.3 Write property test for no body text in stored verdicts (Property 4)
    - **Property 4: Stored verdicts never contain body text**
    - **Validates: Requirements 1.10**
    - Assert the Redis hash written by `createVerdict` contains no field named `body`, `text`, `content`, `postBody`, or `commentBody`

  - [ ]* 2.4 Write property test for TTL computation (Property 5)
    - **Property 5: TTL computation is correct for any retentionDays value**
    - **Validates: Requirements 1.8**
    - Use `fc.integer({ min: 1, max: 3650 })` for `retentionDays` and `fc.integer()` for `createdAt`; assert `computeExpiresAt(createdAt, retentionDays) === createdAt + retentionDays * 86400 * 1000`; also assert that when `retentionDays` is absent the default of 90 days is used

  - [ ]* 2.5 Write property test for user index TTL extension (Property 21)
    - **Property 21: User verdict index TTL is extended to the newest verdict's expiresAt on each create**
    - **Validates: Design — user index TTL**
    - After `createVerdict`, assert the TTL of `vl:{subId}:user:{username}:verdicts` is >= `Math.ceil(expiresAt / 1000) - Date.now() / 1000`

- [ ] 3. Redis data layer — rules and settings
  - [ ] 3.1 Create `src/server/core/rules.ts` with `listRules`, `createRule`, `updateRule`, and `deleteRule`
    - `listRules(subredditId)`: `hGetAll vl:{subId}:rules`, parse each value as `Rule`, return `Rule[]`
    - `createRule(input, subredditId)`: validate name (non-empty, ≤ 100 chars), validate description (≤ 500 chars), check case-insensitive name uniqueness, check count < 50, generate `id`, `hSet vl:{subId}:rules {id} JSON.stringify(rule)`
    - `updateRule(id, patch, subredditId)`: fetch existing rule, validate patched fields, check name uniqueness if name changed, merge and persist
    - `deleteRule(id, subredditId)`: `hDel vl:{subId}:rules {id}` — do NOT touch verdict records
    - _Requirements: 4.3, 4.4, 4.6, 4.7, 4.8, 4.9_

  - [ ] 3.2 Create `src/server/core/settings.ts` with `getRetentionSettings` and `saveRetentionSettings`
    - `getRetentionSettings(subredditId)`: `hGet vl:{subId}:settings retentionDays`, return parsed integer or default `DEFAULT_RETENTION_DAYS` (90)
    - `saveRetentionSettings(retentionDays, subredditId)`: validate range [1, 3650], `hSet` both `retentionDays` and `updatedAt`; do NOT modify existing verdict TTLs
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

  - [ ]* 3.3 Write property test for rule name validation (Property 12)
    - **Property 12: Rule name validation rejects empty names and names exceeding 100 characters**
    - **Validates: Requirements 4.3, 4.9**
    - Use `fc.string()` filtered to empty or length > 100; assert `validateRuleName` returns `{ ok: false }`

  - [ ]* 3.4 Write property test for rule name uniqueness (Property 13)
    - **Property 13: Rule name uniqueness check is case-insensitive**
    - **Validates: Requirements 4.7**
    - Generate a rule set and a candidate name whose `.toLowerCase()` matches an existing rule; assert `createRule` returns a conflict error

  - [ ]* 3.5 Write property test for rule deletion isolation (Property 14)
    - **Property 14: Rule deletion does not affect verdicts**
    - **Validates: Requirements 4.6**
    - After `deleteRule`, assert all verdict hashes that referenced the deleted `ruleId` are unchanged

  - [ ]* 3.6 Write property test for retention days validation (Properties 15 and 16)
    - **Property 15: Retention days validation rejects out-of-range values**
    - **Property 16: Retention days validation accepts all in-range values**
    - **Validates: Requirements 5.2, 5.6**
    - Use `fc.integer()` outside [1, 3650] for Property 15; use `fc.integer({ min: 1, max: 3650 })` for Property 16

- [ ] 4. Moderator auth middleware
  - [ ] 4.1 Create `src/server/middleware/modGuard.ts` as a Hono middleware
    - Import `context` from `@devvit/web/server`
    - If `context.isModerator` is falsy, return `c.json({ error: 'Forbidden' }, 403)` and call `return`
    - Otherwise call `await next()`
    - Export as named export `modGuard`
    - _Requirements: 7.3, 7.4_

  - [ ]* 4.2 Write property test for access control (Property 18)
    - **Property 18: All endpoints return 403 for non-moderator callers**
    - **Validates: Requirements 7.3, 7.4**
    - For each tRPC procedure and Hono route, simulate a context where `isModerator = false`; assert HTTP 403 is returned and no data is leaked

- [ ] 5. tRPC router
  - [ ] 5.1 Create `src/server/trpc.ts` with the full tRPC v11 app router
    - Initialise tRPC with `initTRPC.create()`; define `modGuardProcedure` that checks `context.isModerator` and throws `TRPCError({ code: 'FORBIDDEN' })` if false
    - Implement `verdictRouter` with:
      - `getCaseFile` (input: `{ username }`, calls `validateUsername` then `getCaseFile`)
      - `delete` (input: `{ verdictId }`, calls `deleteVerdict(verdictId, subredditId)` — no username in input; username resolved inside `deleteVerdict`)
      - `getPriorCount` (input: `{ username }`, calls `getPriorCount`)
    - Implement `rulesRouter` with `list`, `create`, `update`, and `delete`
    - Implement `settingsRouter` with `get` and `save`
    - Export `appRouter` and `AppRouter` type
    - Mount the tRPC Hono adapter at `/api/trpc` in `src/server/index.ts`
    - _Requirements: 1.13, 2.3, 2.7, 4.3, 4.4, 4.6, 5.2, 6.4, 7.3, 7.4, 8.1, 8.2_

  - [ ]* 5.2 Write property test for Redis key namespacing (Property 19)
    - **Property 19: All Redis keys are namespaced by server-resolved subredditId**
    - **Validates: Requirements 8.1**
    - Intercept all Redis write calls; assert every key starts with `vl:{subredditId}:` using the server-context value, not any client-supplied value

  - [ ]* 5.3 Write property test for subreddit data isolation (Property 20)
    - **Property 20: Case file search returns only verdicts for the queried subreddit**
    - **Validates: Requirements 8.2**
    - Seed Redis with verdicts for two different subredditIds; assert `getCaseFile` returns only verdicts matching the server-resolved subredditId

- [ ] 6. Checkpoint — server data layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Menu action handlers
  - [ ] 7.1 Replace `src/server/routes/menu.ts` with VerdictLog menu handlers
    - Remove the `post-create` handler
    - Add `modGuard` middleware to the menu router
    - Implement `POST /log-verdict`:
      - Read `context.postId` / `context.commentId`, `context.authorUsername`, `context.permalink`
      - Call `getPriorCount(username, subredditId)` to get `{ count, mostRecent }`
      - Fetch enabled rules via `listRules`
      - Call `showForm(logVerdictForm, { username, contentType, contentId, permalink, timestamp, priorCount, priorRuleName, priorSeverity, priorCreatedAt })` — return as `UiResponse`
      - The form description field renders a prior-verdict banner using the passed context values
    - Implement `POST /open-search`: call `navigateTo` to `game.html?page=search` — return as `UiResponse`
    - Implement `POST /open-rules`: call `navigateTo` to `game.html?page=rules` — return as `UiResponse`
    - Implement `POST /open-settings`: call `navigateTo` to `game.html?page=settings` — return as `UiResponse`
    - _Requirements: 1.1, 1.2, 1.3, 1.13, 2.1, 4.1, 5.1, 7.1_

- [ ] 8. Log Verdict form definition and submit handler
  - [ ] 8.1 Replace `src/server/routes/forms.ts` with the Log Verdict form submit handler
    - Remove the `example-submit` handler
    - Define `logVerdictFormFields` with the four visible fields: `ruleId` select (enabled rules), `severity` select (`low`/`medium`/`high`), `decisionTemplate` select (seven templates from `DECISION_TEMPLATES`), `reason` text (max 500 chars, no newlines, required)
    - Hidden pre-filled context fields: `username`, `contentType`, `contentId`, `permalink`, `timestamp`, `priorCount`, `priorRuleName`, `priorSeverity`, `priorCreatedAt`
    - Implement `POST /log-verdict-submit`: parse form values, validate all required fields (return `showToast` with error if any missing or invalid), call `getRetentionSettings` (default 90 if unconfigured), call `createVerdict`, return `showToast("Verdict logged")` on success
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [ ]* 8.2 Write unit test for form submit handler — success path
    - Assert `showToast("Verdict logged")` is returned when all fields are valid
    - Assert the verdict is written to Redis with the correct fields and no body text
    - _Requirements: 1.7, 1.11_

  - [ ]* 8.3 Write unit test for form submit handler — validation failure paths
    - Assert `showToast` with error message is returned for missing `ruleId`, `severity`, `decisionTemplate`, and `reason`
    - Assert `showToast` with error message is returned for reason > 500 chars and reason containing `\n`
    - Assert no Redis write occurs on validation failure
    - _Requirements: 1.6, 1.9_

  - [ ]* 8.4 Write property test for reason validation (Properties 1 and 2)
    - **Property 1: Reason validation rejects oversized or multiline strings**
    - **Property 2: Reason validation accepts valid strings**
    - **Validates: Requirements 1.6**
    - Use `fc.string()` with length > 500 or containing `\n`/`\r` for Property 1; use `fc.string({ maxLength: 500 }).filter(s => s.length > 0 && !/[\n\r]/.test(s))` for Property 2

- [ ] 9. devvit.json registration
  - [ ] 9.1 Update `devvit.json` to register all VerdictLog menu items and the Log Verdict form
    - Replace existing `menu.items` entries with the five VerdictLog items: `Log Verdict` (post), `Log Verdict` (comment), `VerdictLog — Search User` (subreddit), `VerdictLog — Configure Rules` (subreddit), `VerdictLog — Retention Settings` (subreddit) — all with `"forUserType": "moderator"`
    - Replace the `forms.exampleForm` entry with `"logVerdictForm": "/internal/form/log-verdict-submit"`
    - _Requirements: 1.1, 1.2, 2.1, 4.1, 5.1, 7.1_

- [ ] 10. Web UI lib utilities
  - [ ] 10.1 Create `src/web/lib/formatTimestamp.ts`
    - Export `formatTimestamp(ms: number): string` — returns `new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'`
    - _Requirements: 2.6, 3.2_

  - [ ] 10.2 Create `src/web/lib/formatAppealSummary.ts`
    - Export `formatAppealSummary(verdict: Verdict): string` — produces the exact single-verdict fixed layout from the design spec
    - Uses `formatTimestamp` for the Date field; pure function, no side effects, no body text
    - _Requirements: 3.2, 3.3_

  - [ ] 10.3 Create `src/web/lib/formatCaseFileSummary.ts`
    - Export `formatCaseFileSummary(subredditName: string, username: string, verdicts: Verdict[]): string`
    - Produces the multi-verdict layout from the design spec: header block then one `--- Verdict N ---` block per verdict in the order supplied (caller passes reverse-chronological)
    - Pure function, no side effects, no body text
    - _Requirements: 3.7, 3.8_

  - [ ] 10.4 Create `src/web/lib/validateUsername.ts`
    - Re-export `validateUsername` from `src/shared/validation.ts`
    - _Requirements: 2.2_

  - [ ] 10.5 Create `src/web/lib/trpc.ts` — tRPC client setup
    - Create a tRPC client using `createTRPCClient` pointed at `/api/trpc`
    - Export the typed client as `trpc`
    - _Requirements: 2.3, 4.3, 5.2_

  - [ ]* 10.6 Write property test for appeal summary completeness (Property 10)
    - **Property 10: Appeal summary contains all required fields for any verdict**
    - **Validates: Requirements 3.2**
    - Use `fc.record` to generate valid `Verdict` objects; assert `formatAppealSummary` output contains all required fields and a `YYYY-MM-DD HH:mm UTC` timestamp

  - [ ]* 10.7 Write property test for case file summary completeness (Property 22)
    - **Property 22: Case file summary contains all required fields for every verdict in the list**
    - **Validates: Requirements 3.7, 3.8**
    - Use `fc.array(fc.record(...))` to generate verdict lists; assert `formatCaseFileSummary` output contains all required fields for each verdict and no body text

  - [ ]* 10.8 Write property test for username validation (Properties 6 and 7)
    - **Property 6: Username validation rejects invalid characters and empty input**
    - **Property 7: Username validation accepts valid Reddit usernames**
    - **Validates: Requirements 2.2**
    - Use `fc.string()` filtered to empty or containing chars outside `[A-Za-z0-9_-]` for Property 6; use `fc.stringMatching(/^[A-Za-z0-9_-]+$/)` for Property 7

  - [ ]* 10.9 Write unit test for `formatTimestamp`
    - Assert `formatTimestamp(0)` returns `"1970-01-01 00:00 UTC"`
    - Assert a known Unix ms value produces the correct `YYYY-MM-DD HH:mm UTC` string
    - _Requirements: 2.6_

  - [ ]* 10.10 Write unit test for `formatAppealSummary` exact layout
    - Construct a known `Verdict` object; assert the output matches the exact fixed layout from the design spec line-by-line
    - _Requirements: 3.2_

- [ ] 11. Web UI components
  - [ ] 11.1 Create `src/web/components/NavBar.tsx`
    - Renders three tab buttons: Search, Rules, Settings
    - Accepts `currentPage: 'search' | 'rules' | 'settings'` and `onNavigate` callback props
    - Highlights the active tab with Tailwind classes
    - _Requirements: 2.1, 4.1, 5.1_

  - [ ] 11.2 Create `src/web/components/EmptyState.tsx`
    - Accepts a `message: string` prop; renders a centred empty-state message
    - _Requirements: 2.5_

  - [ ] 11.3 Create `src/web/components/ErrorBanner.tsx`
    - Accepts a `message: string` prop; renders a dismissible error banner
    - _Requirements: 2.8, 6.7_

  - [ ] 11.4 Create `src/web/components/SearchBar.tsx`
    - Accepts `onSearch: (username: string) => void` and `loading: boolean` props
    - Validates username client-side using `validateUsername` before calling `onSearch`
    - Displays inline validation error if username is invalid
    - _Requirements: 2.2_

  - [ ] 11.5 Create `src/web/components/VerdictCard.tsx`
    - Accepts a `verdict: Verdict` prop and `onDelete: (id: string) => void` callback
    - Displays: rule name, severity, decision template, reason, acting mod, content type, permalink, and `formatTimestamp(createdAt)`
    - "Copy Appeal Summary" button: calls `navigator.clipboard.writeText(formatAppealSummary(verdict))`; on success calls `showToast("Appeal summary copied to clipboard")`; on failure renders a read-only `<textarea>` with the summary that stays visible until dismissed
    - "Delete" button: shows inline confirm UI (local state boolean — `window.confirm` unavailable); on confirm calls `onDelete(verdict.id)`
    - _Requirements: 2.6, 3.1, 3.2, 3.4, 3.5, 6.1, 6.2, 6.3_

  - [ ] 11.6 Create `src/web/components/RuleForm.tsx`
    - Accepts `onSubmit: (data: { name: string; description: string; defaultSeverity: Severity }) => void`, `initialValues?`, and `loading: boolean` props
    - Validates name (non-empty, ≤ 100 chars) and description (≤ 500 chars) client-side before submit
    - _Requirements: 4.3, 4.9_

- [ ] 12. Web UI pages
  - [ ] 12.1 Create `src/web/pages/CaseFilePage.tsx`
    - Renders `SearchBar` at the top
    - On search: calls `trpc.verdict.getCaseFile({ username })`, shows loading state, renders `VerdictCard` list or `EmptyState` or `ErrorBanner`
    - When verdicts are displayed, renders a "Copy Case File Summary" button above the list; on click calls `navigator.clipboard.writeText(formatCaseFileSummary(subredditName, username, verdicts))`; on success calls `showToast("Case file copied to clipboard")`; on failure renders a read-only `<textarea>` with the summary
    - On delete: calls `trpc.verdict.delete({ verdictId })`, removes card from local state on success, shows error toast on failure
    - Verdicts are displayed in the order returned by the server (already sorted reverse-chronological)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.7, 2.8, 3.6, 3.7, 3.8, 3.9, 3.10, 6.1, 6.4, 6.5, 6.6, 6.7_

  - [ ] 12.2 Create `src/web/pages/RuleConfigPage.tsx`
    - On mount: calls `trpc.rules.list()`, renders rule list with name, description, default severity, enabled toggle, edit button, and delete button
    - "Add Rule" button: shows `RuleForm`; on submit calls `trpc.rules.create`
    - Edit: shows `RuleForm` pre-filled; on submit calls `trpc.rules.update`
    - Delete: inline confirm UI; on confirm calls `trpc.rules.delete`
    - Renders `ErrorBanner` on any tRPC error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ] 12.3 Create `src/web/pages/RetentionPage.tsx`
    - On mount: calls `trpc.settings.get()`, displays current `retentionDays` (default 90 if not set)
    - Number input for `retentionDays`; validates [1, 3650] client-side
    - On submit: calls `trpc.settings.save({ retentionDays })`; shows success toast on success; shows `ErrorBanner` on failure
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

- [ ] 13. React app entry point with page routing
  - [ ] 13.1 Replace `src/client/game.tsx` with the VerdictLog app shell
    - On mount: read `?page=` query param from the URL to determine initial page (`search` | `rules` | `settings`; default `search`)
    - Check moderator status via a `trpc.settings.get()` call; if the call returns 403, render an "Access denied" screen and stop
    - Render `NavBar` + the active page component (`CaseFilePage`, `RuleConfigPage`, or `RetentionPage`)
    - Use `useState` for current page; `NavBar` `onNavigate` updates the state
    - Apply Tailwind base layout: full-height, dark-mode-aware, Reddit-branded colours
    - _Requirements: 2.1, 4.1, 5.1, 7.2_

- [ ] 14. Checkpoint — full stack wired together
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Property-based tests — case file sort, filter, and deletion
  - [ ]* 15.1 Write property test for case file sort order (Property 8)
    - **Property 8: Case file results are sorted in reverse-chronological order**
    - **Validates: Requirements 2.4**
    - Use `fc.array(fc.record({ createdAt: fc.integer() }), { minLength: 2 })` with distinct timestamps; assert every adjacent pair satisfies `verdicts[i].createdAt >= verdicts[i+1].createdAt`

  - [ ]* 15.2 Write property test for expired verdict filter (Property 9)
    - **Property 9: Expired verdict filter excludes all expired records**
    - **Validates: Requirements 2.7**
    - Generate verdicts with varying `expiresAt` values and a reference `now`; assert filter returns only `expiresAt > now`

  - [ ]* 15.3 Write property test for rule selector filtering (Property 11)
    - **Property 11: Rule selector contains exactly the enabled rules**
    - **Validates: Requirements 1.3, 4.5**
    - Generate a list of rules with mixed `enabled` values; assert the filter function returns exactly the rules where `enabled === true`

  - [ ]* 15.4 Write property test for verdict deletion (Property 17)
    - **Property 17: Verdict deletion removes the record and its list entry**
    - **Validates: Requirements 6.4**
    - After `deleteVerdict`, assert `hGetAll vl:{subId}:verdict:{id}` returns null and the ID does not appear in `lRange vl:{subId}:user:{username}:verdicts`

- [ ] 16. Unit tests — settings, error paths, and clipboard
  - [ ]* 16.1 Write unit tests for `settings.get` default and configured values
    - Assert `getRetentionSettings` returns `90` when no value is in Redis
    - Assert `getRetentionSettings` returns the stored value when one exists
    - _Requirements: 5.5_

  - [ ]* 16.2 Write unit test for `verdict.getCaseFile` Redis error handling
    - Mock Redis to throw; assert the tRPC procedure throws `INTERNAL_SERVER_ERROR` and returns no partial data
    - _Requirements: 2.8_

  - [ ]* 16.3 Write unit test for `deleteVerdict` — subredditId mismatch returns 403
    - Store a verdict with `subredditId = 'sub_A'`; call `deleteVerdict(verdictId, 'sub_B')`; assert 403 is returned and the verdict hash is not deleted
    - _Requirements: 8.1, 8.3_

  - [ ]* 16.4 Write unit test for non-moderator 403 response
    - Set `context.isModerator = false`; call any tRPC procedure; assert HTTP 403 is returned
    - _Requirements: 7.3, 7.4_

  - [ ]* 16.5 Write unit test for clipboard success and failure in `VerdictCard`
    - Mock `navigator.clipboard.writeText` to resolve; assert `showToast("Appeal summary copied to clipboard")` is called
    - Mock `navigator.clipboard.writeText` to reject; assert a read-only `<textarea>` is rendered with the summary text
    - _Requirements: 3.4, 3.5_

  - [ ]* 16.6 Write unit test for menu handler prior-verdict banner
    - Mock `getPriorCount` to return `{ count: 2, mostRecent: { ruleName: 'Spam', severity: 'high', createdAt: ... } }`; assert the form context passed to `showForm` includes `priorCount = 2`, `priorRuleName = 'Spam'`, `priorSeverity = 'high'`
    - Mock `getPriorCount` to return `{ count: 0, mostRecent: null }`; assert `priorCount = 0` is passed
    - _Requirements: 1.13_

- [ ] 17. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- `fast-check` must be installed: `npm install --save-dev fast-check`
- Each property test file should include the tag comment: `// Feature: verdictlog-mvp, Property {N}: {property title}`
- Minimum 100 iterations per property test (`fc.assert(fc.property(...), { numRuns: 100 })`)
- Pure functions (validators, formatters, sorters, filters) are tested without Redis mocks
- Redis-dependent properties use an in-memory mock (a plain `Map<string, unknown>`)
- Use `crypto.randomUUID()` for ID generation — `nanoid` is not in `package.json`
- `window.confirm` is unavailable in Devvit iFrames — use inline React state for delete confirmation UI
- `deleteVerdict` takes `(verdictId, subredditId)` only — it fetches the verdict internally to resolve `username` and verify `subredditId`
- Default `retentionDays` is **90** everywhere — in `DEFAULT_RETENTION_DAYS`, `settings.get`, `RetentionPage`, and Requirement 1.8
- The user verdict index key `vl:{subId}:user:{username}:verdicts` gets its TTL extended on every `createVerdict` call via `expireAt`; stale IDs are pruned during `getCaseFile` reads
- Privacy model for MVP: no body text stored, TTL-based auto-expiry, manual delete per verdict, subreddit-isolated Redis keys — no automatic deletion on Reddit content deletion

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.3", "3.4", "3.5", "3.6", "4.2"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "7.1"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "8.4", "9.1"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 8, "tasks": ["10.6", "10.7", "10.8", "10.9", "10.10", "11.1", "11.2", "11.3", "11.4"] },
    { "id": 9, "tasks": ["11.5", "11.6"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 11, "tasks": ["13.1"] },
    { "id": 12, "tasks": ["15.1", "15.2", "15.3", "15.4", "16.1", "16.2", "16.3", "16.4", "16.5", "16.6"] }
  ]
}
```
