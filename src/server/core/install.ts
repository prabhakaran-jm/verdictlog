import { context, reddit } from '@devvit/web/server';
import { findAppPostUrl } from './appPost';
import { createRule, listRules } from './rules';

const DEFAULT_RULES = [
  {
    name: 'Spam',
    description: 'Unwanted or repetitive promotional content',
    defaultSeverity: 'medium' as const,
  },
  {
    name: 'Civility',
    description: 'Harassment, hate, or hostile engagement',
    defaultSeverity: 'low' as const,
  },
];

/** First-time setup when VerdictLog is installed on a subreddit. */
export async function setupSubredditOnInstall(): Promise<void> {
  const subredditId = context.subredditId;
  const subredditName = context.subredditName;

  const existingRules = await listRules(subredditId);
  if (existingRules.length === 0) {
    for (const rule of DEFAULT_RULES) {
      await createRule(rule, subredditId);
    }
  }

  const appPostUrl = await findAppPostUrl(subredditName);
  if (!appPostUrl) {
    await reddit.submitCustomPost({
      subredditName,
      title: 'VerdictLog — Moderator tools',
      entry: 'default',
    });
  }
}
