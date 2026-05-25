# VerdictLog

**Every mod action gets a reason. Every appeal gets an answer.**

VerdictLog is a [Devvit Web](https://developers.reddit.com/) app that gives Reddit moderators **appeal-ready decision memory**. Reddit’s mod log records *what* happened; VerdictLog records *why* — in seconds, from the post or comment menu.

**VerdictLog does not replace native remove, removal reasons, or modmail.** It is an optional extra step for teams that want structured, searchable decision history per user.

## How this relates to Reddit’s built-in mod tools

Reddit already gives moderators several places where context can live:

| Native tool | What it captures well |
|-------------|------------------------|
| **Removal reason + modmail** | Why *this* removal was sent; modmail threads link back to the content |
| **Mod notes** | Freeform notes on a user |
| **Mod log / profile panel** | *What* happened (removes, bans, etc.) across the account |

If your team uses those consistently on every action, much of the “why” already exists — but it is **spread across individual removals, mail threads, and optional notes**, not aggregated in one structured view.

**Where VerdictLog adds value**

- **Per-user case file** — Search `u/username` and see non-expired verdicts in one list (rule, severity, template, reason, acting mod, link, date), instead of reconstructing from mod log entries and scattered notes.
- **Consistent structure** — Subreddit-configured rules, severity, and decision templates so different mods log decisions the same way.
- **Prior context at log time** — The Log Verdict form shows how many prior verdicts exist and the most recent one before you act again.
- **Appeal workflow** — **Copy Appeal Summary** produces a fixed plain-text block for modmail or appeal replies (it does not send modmail for you).
- **Data boundaries** — No post/comment body storage; configurable retention (default 90 days); manual delete per verdict.

**When VerdictLog is most useful**

- Appeal-heavy communities where mods need quick handoff context
- Subs with rotating mod teams (“why did we action this user before?”)
- Teams that want searchable decision memory beyond freeform removal reasons

**When native tools may be enough**

- Small teams with strict habits: every removal gets a reason, modmail, and a standardized mod note
- You rarely need to compare prior reasons across multiple actions on the same user

## Demo flow (60 seconds)

1. **Install** VerdictLog on your subreddit (seeds default rules + a welcome custom post).
2. On a post or comment: **⋯ → Log Verdict** → rule, severity, template, reason → submit.
3. Open the **VerdictLog** custom post → **Search** → enter username → view case file.
4. **Copy Appeal Summary** for modmail.


## Core features

- **Log Verdict** — post/comment menu; prior-verdict banner; no body text stored
- **Search User Case File** — chronological, non-expired verdicts
- **Copy Appeal Summary** — formatted plain text for appeals
- **Configure Rules** — enable/disable; used in Log Verdict form
- **Retention Settings** — TTL per subreddit (default 90 days); manual delete per verdict

## Privacy & data

- Does **not** store post/comment body text
- Redis keys scoped per subreddit: `vl:{subredditId}:*`
- Configurable retention; per-verdict delete
- Moderator-only access (server-side mod check)

## Built with

- Devvit Web · React 19 · Tailwind CSS 4 · TypeScript
- Hono · tRPC v11 · Zod · Redis · Reddit API

## Development

```bash
npm install
npx devvit login
npm run dev          # playtest — open URL from terminal
npm run type-check
npm run lint
npm test
npm run deploy       # upload
```

Playtest subreddit is configured in `devvit.json` → `"dev": { "subreddit": "verdictlog_dev" }`.

## Scope (MVP)

This app intentionally does **not** include AI summaries, analytics dashboards, automatic logging when you remove content, notifications, or multi-subreddit sync. Logging a verdict remains a deliberate mod step after (or alongside) native moderation actions.

## License

BSD-3-Clause — see [LICENSE](./LICENSE).
