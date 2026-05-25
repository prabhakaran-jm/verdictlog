import type { Verdict } from '../../shared/types';
import { formatTimestamp } from './formatTimestamp';

export function formatCaseFileSummary(
  subredditName: string,
  username: string,
  verdicts: Verdict[]
): string {
  const lines: string[] = [
    'VerdictLog Case File',
    `Subreddit: r/${subredditName}`,
    `User: u/${username}`,
    `Verdicts: ${verdicts.length}`,
    '',
  ];

  verdicts.forEach((verdict, index) => {
    lines.push(
      `--- Verdict ${index + 1} ---`,
      `Content: ${verdict.contentType} — ${verdict.permalink}`,
      `Rule: ${verdict.ruleName}`,
      `Severity: ${verdict.severity}`,
      `Decision: ${verdict.decisionTemplate}`,
      `Reason: ${verdict.reason}`,
      `Acting Mod: u/${verdict.actingMod}`,
      `Date: ${formatTimestamp(verdict.createdAt)}`,
      ''
    );
  });

  return lines.join('\n').trimEnd();
}
