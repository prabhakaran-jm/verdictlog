import { context, reddit } from '@devvit/web/server';

/** Server-side moderator check using Reddit API (context has no typed isModerator field). */
export async function isModerator(): Promise<boolean> {
  const userId = context.userId;
  const subredditName = context.subredditName;

  if (!userId || !subredditName) {
    return false;
  }

  try {
    const mods = await reddit.getModerators({ subredditName }).all();
    return mods.some((mod) => mod.id === userId);
  } catch {
    return false;
  }
}
