# Architecture Rules

Stack:
- Devvit Web
- TypeScript
- React frontend
- Devvit server endpoints
- Redis storage
- Reddit API
- Menu actions
- Forms

Data rules:
- Do not store post or comment body text.
- Store only IDs, permalinks, usernames, rules, severity, template, mod reason, acting mod, and timestamps.
- Use Redis expiry for verdict data.
- Support manual verdict deletion.
- Clean up verdicts tied to deleted Reddit content when deletion events are available.

Code rules:
- Keep shared types in src/shared.
- Keep server logic in src/server.
- Keep UI components in src/web/components.
- Keep pages in src/web/pages.
- Keep API clients and helpers in src/web/lib.
- Prefer small functions.
- Do not add new features without updating the spec.