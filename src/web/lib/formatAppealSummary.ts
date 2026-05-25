import type { Verdict } from '../../shared/types';
import { formatTimestamp } from './formatTimestamp';

export function formatAppealSummary(verdict: Verdict): string {
  return [
    'VerdictLog Appeal Summary',
    `Subreddit: r/${verdict.subredditName}`,
    `User: u/${verdict.username}`,
    '',
    `Content: ${verdict.contentType} — ${verdict.permalink}`,
    `Rule: ${verdict.ruleName}`,
    `Severity: ${verdict.severity}`,
    `Decision: ${verdict.decisionTemplate}`,
    `Reason: ${verdict.reason}`,
    `Acting Mod: u/${verdict.actingMod}`,
    `Date: ${formatTimestamp(verdict.createdAt)}`,
  ].join('\n');
}
