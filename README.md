# VerdictLog

**Every mod action gets a reason. Every appeal gets an answer.**

VerdictLog is a [Devvit Web](https://developers.reddit.com/) app that gives Reddit moderators **appeal-ready decision memory**. Reddit’s mod log records *what* happened; VerdictLog records *why* — in seconds, from the post or comment menu.

## Demo flow (60 seconds)

1. **Install** VerdictLog on your subreddit (seeds default rules + a welcome custom post).
2. On a post or comment: **⋯ → Log Verdict** → rule, severity, template, reason → submit.
3. Open the **VerdictLog** custom post → **Search** → enter username → view case file.
4. **Copy Appeal Summary** for modmail.

Full submission checklist, video script, and Devpost copy: **[DEVPOST.md](./DEVPOST.md)**

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

This app intentionally does **not** include AI summaries, analytics dashboards, auto-log on removal, notifications, or multi-subreddit sync.

## License

BSD-3-Clause — see [LICENSE](./LICENSE).
