# Requirements Document

## Introduction

VerdictLog is a Devvit Web moderation app for Reddit moderators. It gives moderators appeal-ready decision memory by capturing the *why* behind every moderation action. Reddit's mod log records what happened; VerdictLog records why it happened. Moderators can log a verdict from any post or comment in seconds, search a user's full case file by username, copy a formatted appeal summary for modmail, configure subreddit rules, and control how long verdict data is retained.

Tagline: Every mod action gets a reason. Every appeal gets an answer.

## Glossary

- **VerdictLog**: The Devvit Web application described in this document.
- **Verdict**: A single moderation decision record capturing the rule, severity, reason, acting moderator, and content reference for one post or comment.
- **Case File**: The chronological list of all verdicts logged against a specific Reddit username within a subreddit.
- **Appeal Summary**: A formatted, human-readable text block generated from a verdict or case file, suitable for pasting into Reddit modmail.
- **Rule**: A subreddit-specific moderation rule configured by moderators, used to categorise verdicts.
- **Severity**: A three-level classification of a verdict's seriousness: `low`, `medium`, or `high`.
- **Decision Template**: A short, pre-written text snippet that describes the type of action taken (e.g., "Removed – spam", "Warned – civility").
- **Acting Mod**: The Reddit username of the moderator who logged the verdict.
- **Retention Settings**: Subreddit-level configuration controlling how long verdicts are stored before automatic expiry.
- **TTL**: Time-to-live; the Redis expiry duration applied to verdict data.
- **Content Type**: Whether the moderated item is a `post` or a `comment`.
- **Moderator**: A Reddit user with moderator permissions on the subreddit where VerdictLog is installed.
- **Redis**: The key-value store used by VerdictLog for all persistent data.
- **Devvit Web**: The Reddit developer platform on which VerdictLog runs.
- **Menu Action**: A context menu item surfaced by Devvit on posts, comments, or the subreddit level.
- **Form**: A Devvit-rendered input form presented to the moderator inside Reddit.

---

## Requirements

### Requirement 1: Log Verdict from Post or Comment

**User Story:** As a moderator, I want to log a verdict directly from a post or comment menu, so that I can record the reason for my moderation action in under 10 seconds without leaving Reddit.

#### Acceptance Criteria

1. WHEN a moderator selects "Log Verdict" from a post context menu, THE VerdictLog App SHALL open the Log Verdict form pre-filled with the post's username, content type (`post`), content ID, permalink, and current timestamp.
2. WHEN a moderator selects "Log Verdict" from a comment context menu, THE VerdictLog App SHALL open the Log Verdict form pre-filled with the comment author's username, content type (`comment`), content ID, permalink, and current timestamp.
3. THE Log Verdict Form SHALL present a rule selector populated with the subreddit's configured and enabled rules.
4. THE Log Verdict Form SHALL present a severity selector with options `low`, `medium`, and `high`.
5. THE Log Verdict Form SHALL present a decision template selector with at least one pre-defined template option.
6. THE Log Verdict Form SHALL present a free-text reason field; IF the moderator enters more than 500 characters or includes a newline character, THEN THE VerdictLog App SHALL reject the input and display a validation error, and SHALL NOT store the verdict.
7. WHEN a moderator submits the Log Verdict form with all required fields completed, THE VerdictLog App SHALL store the verdict in Redis with the required fields: `id`, `subredditId`, `subredditName`, `username`, `contentType`, `contentId`, `permalink`, `ruleId`, `ruleName`, `severity`, `decisionTemplate`, `reason`, `actingMod`, `createdAt`, and `expiresAt`; and the optional field `authorId` when available from the Reddit API.
8. IF the subreddit has no `retentionDays` configured, THEN THE VerdictLog App SHALL apply a default TTL of 90 days to the verdict record; OTHERWISE THE VerdictLog App SHALL apply a Redis TTL equal to the configured `retentionDays`.
9. IF a moderator submits the Log Verdict form with any of the required fields `ruleId`, `severity`, `decisionTemplate`, or `reason` missing, THEN THE VerdictLog App SHALL display a validation error identifying each missing field and SHALL NOT store the verdict.
10. THE VerdictLog App SHALL NOT store the body text of the post or comment being moderated.
11. WHEN a verdict is successfully stored, THE VerdictLog App SHALL display a confirmation toast to the acting moderator.
12. THE Log Verdict Form decision template selector SHALL include the following pre-defined options: "Repeated violation after prior warning", "Good-faith mistake — educational removal", "Spam pattern across multiple posts", "Escalated behavior after temp ban", "Off-topic — redirected to appropriate subreddit", "Inflammatory or bad-faith engagement", "Custom".
13. WHEN the Log Verdict form opens for a post or comment, THE VerdictLog App SHALL display a prior-verdict banner showing the count of non-expired verdicts already logged for that username in the subreddit; IF at least one prior verdict exists, THE banner SHALL also show the most recent verdict's rule name, severity, and how long ago it was logged.

---

### Requirement 2: Search User Case File

**User Story:** As a moderator, I want to search for a Reddit username and see all verdicts logged against that user, so that I can quickly understand a user's moderation history before responding to an appeal or taking further action.

#### Acceptance Criteria

1. THE VerdictLog App SHALL provide a search interface accessible from the subreddit moderator menu.
2. IF a moderator submits the search with an empty username field or a username containing characters outside the set `[A-Za-z0-9_-]`, THEN THE VerdictLog App SHALL display a validation error and SHALL NOT query Redis.
3. WHEN a moderator enters a valid Reddit username and submits the search, THE VerdictLog App SHALL retrieve all non-expired verdicts for that username within the server-resolved current subreddit from Redis.
4. WHEN verdicts exist for the searched username, THE VerdictLog App SHALL display them in reverse-chronological order (most recent first), using the `createdAt` field as the sort key.
5. WHEN no verdicts exist for the searched username, THE VerdictLog App SHALL display only an empty-state message indicating no records were found, without rendering verdict list UI elements.
6. THE Case File View SHALL display for each verdict: the rule name, severity, decision template, reason, acting mod, content type, permalink, and creation timestamp formatted as `YYYY-MM-DD HH:mm UTC`.
7. WHEN a moderator views the Case File, THE VerdictLog App SHALL display only verdicts whose `expiresAt` timestamp is in the future at the time of the query; expired verdicts SHALL be excluded from the result set server-side.
8. IF the Redis retrieval fails, THEN THE VerdictLog App SHALL display an error message indicating the search could not be completed and SHALL NOT display a partial or stale result set.

---

### Requirement 3: Copy Appeal Summary

**User Story:** As a moderator, I want to copy a formatted appeal summary from a user's case file, so that I can paste a clear, consistent response into modmail when handling an appeal.

#### Acceptance Criteria

1. THE Case File View SHALL include a "Copy Appeal Summary" action for each individual verdict.
2. WHEN a moderator activates "Copy Appeal Summary" for a verdict, THE VerdictLog App SHALL write a formatted plain-text summary to the system clipboard using the following fixed layout, with each field on its own line and a blank line between sections:
   ```
   VerdictLog Appeal Summary
   Subreddit: r/{subredditName}
   User: u/{username}
   
   Content: {contentType} — {permalink}
   Rule: {ruleName}
   Severity: {severity}
   Decision: {decisionTemplate}
   Reason: {reason}
   Acting Mod: u/{actingMod}
   Date: {createdAt formatted as YYYY-MM-DD HH:mm UTC}
   ```
3. THE Appeal Summary text SHALL NOT include any post or comment body text.
4. WHEN the clipboard write succeeds, THE VerdictLog App SHALL display a confirmation toast reading "Appeal summary copied to clipboard".
5. IF the clipboard write fails, THEN THE VerdictLog App SHALL display an error toast and SHALL present the summary text in a read-only selectable text area that remains visible until the moderator explicitly dismisses it.
6. THE Case File View SHALL include a "Copy Case File Summary" button that is visible whenever at least one verdict is displayed.
7. WHEN a moderator activates "Copy Case File Summary", THE VerdictLog App SHALL write a single formatted plain-text block to the system clipboard containing all currently visible verdicts for the searched username, formatted as a header followed by one verdict block per verdict in reverse-chronological order:
   ```
   VerdictLog Case File
   Subreddit: r/{subredditName}
   User: u/{username}
   Verdicts: {count}
   
   --- Verdict {n} ---
   Content: {contentType} — {permalink}
   Rule: {ruleName}
   Severity: {severity}
   Decision: {decisionTemplate}
   Reason: {reason}
   Acting Mod: u/{actingMod}
   Date: {createdAt formatted as YYYY-MM-DD HH:mm UTC}
   ```
8. THE Case File Summary text SHALL NOT include any post or comment body text.
9. WHEN the Case File Summary clipboard write succeeds, THE VerdictLog App SHALL display a confirmation toast reading "Case file copied to clipboard".
10. IF the Case File Summary clipboard write fails, THEN THE VerdictLog App SHALL display an error toast and SHALL present the summary text in a read-only selectable text area that remains visible until the moderator explicitly dismisses it.

---

### Requirement 4: Configure Rule List

**User Story:** As a moderator, I want to configure the list of subreddit rules used in verdicts, so that logged verdicts consistently reference the rules that apply to my community.

#### Acceptance Criteria

1. THE VerdictLog App SHALL provide a rule configuration interface accessible from the subreddit moderator menu.
2. THE Rule Configuration Interface SHALL display all currently configured rules with their name, description, default severity, and enabled status.
3. WHEN a moderator creates a new rule, the `name` field is required (max 100 characters) and the `description` field is optional (max 500 characters); THE VerdictLog App SHALL store the rule in Redis under the subreddit's rule list.
4. WHEN a moderator updates an existing rule's name, description, default severity, or enabled status, THE VerdictLog App SHALL persist the updated rule in Redis.
5. WHEN a moderator disables a rule, THE VerdictLog App SHALL exclude that rule from the rule selector in the Log Verdict form immediately upon the next form open; existing verdicts referencing the rule SHALL remain unchanged.
6. WHEN a moderator deletes a rule, THE VerdictLog App SHALL remove the rule from Redis and SHALL NOT delete any existing verdicts that reference that rule.
7. IF a moderator attempts to create a rule with an empty name, or with a name that is identical (case-insensitive) to an existing rule in the subreddit, THEN THE VerdictLog App SHALL display a validation error and SHALL NOT store the rule.
8. THE VerdictLog App SHALL support up to 50 configured rules per subreddit; IF a moderator attempts to create a rule when 50 rules already exist, THEN THE VerdictLog App SHALL display an error indicating the limit has been reached and SHALL NOT store the new rule.
9. IF a moderator attempts to create a rule with a name exceeding 100 characters or a description exceeding 500 characters, THEN THE VerdictLog App SHALL display a validation error and SHALL NOT store the rule.

---

### Requirement 5: Data Safety Controls — TTL Retention

**User Story:** As a moderator, I want to configure how long verdict data is retained, so that my subreddit complies with data minimisation principles and does not store moderation records indefinitely.

#### Acceptance Criteria

1. THE VerdictLog App SHALL provide a retention settings interface accessible from the subreddit moderator menu.
2. THE Retention Settings Interface SHALL allow a moderator to set `retentionDays` to a positive integer between 1 and 3650 (10 years).
3. WHEN `retentionDays` is saved, THE VerdictLog App SHALL apply the new TTL only to subsequently created verdicts; existing verdicts SHALL retain their original TTL and SHALL NOT be modified.
4. WHEN a verdict's TTL expires, THE Redis Store SHALL automatically delete the verdict record without requiring moderator action.
5. WHEN the Retention Settings Interface opens, THE VerdictLog App SHALL display the currently configured `retentionDays` value; IF no value has been configured, THE VerdictLog App SHALL display the default value of 90 days.
6. IF a moderator submits a `retentionDays` value outside the range 1–3650, THEN THE VerdictLog App SHALL display a validation error stating "Retention period must be between 1 and 3650 days" and SHALL NOT save the invalid value.
7. WHEN `retentionDays` is successfully saved, THE VerdictLog App SHALL display a confirmation toast to the moderator.
8. THE VerdictLog App data privacy model for the MVP is: no post or comment body text is stored; all verdict data expires automatically via Redis TTL; moderators can manually delete individual verdicts; all data is namespaced per subreddit and never shared across subreddits.

---

### Requirement 6: Data Safety Controls — Manual Delete

**User Story:** As a moderator, I want to manually delete individual verdicts, so that I can remove records that were logged in error or that should be expunged before their TTL expires.

#### Acceptance Criteria

1. THE Case File View SHALL include a delete action for each individual verdict.
2. WHEN a moderator activates the delete action for a verdict, THE VerdictLog App SHALL prompt the moderator to confirm the deletion before proceeding.
3. IF a moderator cancels the confirmation prompt, THEN THE VerdictLog App SHALL dismiss the prompt and SHALL NOT delete the verdict.
4. WHEN a moderator confirms deletion, THE VerdictLog App SHALL remove the verdict record from Redis within 2 seconds.
5. WHEN a verdict is successfully deleted, THE VerdictLog App SHALL remove it from the Case File View without requiring a page reload.
6. WHEN a verdict is successfully deleted, THE VerdictLog App SHALL display a confirmation toast to the moderator.
7. IF the deletion fails, THEN THE VerdictLog App SHALL display an error toast indicating the deletion failed and SHALL retain the verdict record in Redis.

---

### Requirement 7: Access Control

**User Story:** As a subreddit owner, I want VerdictLog features to be restricted to moderators, so that regular users cannot view, create, or delete moderation records.

#### Acceptance Criteria

1. THE VerdictLog App SHALL expose all menu actions exclusively to users with moderator permissions on the subreddit.
2. WHEN a non-moderator user attempts to access any VerdictLog web UI page, THE VerdictLog App SHALL display an "Access denied" message and SHALL NOT render any verdict, rule, or settings data.
3. WHEN a non-moderator user attempts to call any VerdictLog server endpoint directly, THE VerdictLog App SHALL return an HTTP 403 response with an error message indicating unauthorised access and SHALL NOT return any data.
4. THE VerdictLog App SHALL verify moderator status server-side on every request (read and mutating), including: retrieve case file, create verdict, delete verdict, save rules, and save retention settings.

---

### Requirement 8: Data Isolation

**User Story:** As a moderator, I want verdict data to be isolated per subreddit, so that records from one community are never visible in another.

#### Acceptance Criteria

1. THE VerdictLog App SHALL namespace all Redis keys by `subredditId`, where `subredditId` is resolved from the server-side Devvit context and SHALL NOT be accepted from client-supplied input.
2. WHEN a moderator searches for a username, THE VerdictLog App SHALL return only verdicts whose Redis key namespace matches the server-resolved `subredditId` of the current request.
3. IF a request is received with a `subredditId` that does not match the server-resolved context, THEN THE VerdictLog App SHALL return an HTTP 403 response and SHALL NOT return any verdict data.
