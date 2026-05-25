import { describe, expect, it } from 'vitest';
import {
  computeExpiresAt,
  DEFAULT_RETENTION_DAYS,
  filterEnabledRules,
  filterUnexpiredVerdicts,
  sortVerdictsByCreatedAtDesc,
  validateReason,
  validateRetentionDays,
  validateRuleName,
  validateUsername,
} from './validation';
import type { Rule, Verdict } from './types';

describe('validateReason', () => {
  it('rejects strings over 500 characters', () => {
    const result = validateReason('a'.repeat(501));
    expect(result.ok).toBe(false);
  });

  it('rejects multiline strings', () => {
    expect(validateReason('line1\nline2').ok).toBe(false);
    expect(validateReason('line1\rline2').ok).toBe(false);
  });

  it('accepts valid single-line strings', () => {
    expect(validateReason('Valid reason').ok).toBe(true);
  });
});

describe('validateUsername', () => {
  it('rejects empty usernames', () => {
    expect(validateUsername('').ok).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(validateUsername('bad.user').ok).toBe(false);
  });

  it('accepts valid usernames', () => {
    expect(validateUsername('Valid_User-1').ok).toBe(true);
  });
});

describe('validateRuleName', () => {
  it('rejects empty and oversized names', () => {
    expect(validateRuleName('').ok).toBe(false);
    expect(validateRuleName('a'.repeat(101)).ok).toBe(false);
  });
});

describe('validateRetentionDays', () => {
  it('rejects out-of-range values with spec message', () => {
    const result = validateRetentionDays(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Retention period must be between 1 and 3650 days');
    }
  });

  it('accepts in-range values', () => {
    expect(validateRetentionDays(90).ok).toBe(true);
    expect(validateRetentionDays(3650).ok).toBe(true);
  });
});

describe('computeExpiresAt', () => {
  it('adds retention days in milliseconds', () => {
    const createdAt = 1_000_000;
    expect(computeExpiresAt(createdAt, 90)).toBe(createdAt + 90 * 86400 * 1000);
  });

  it('uses default retention constant for documentation parity', () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(90);
  });
});

describe('filterEnabledRules', () => {
  it('returns only enabled rules', () => {
    const rules: Rule[] = [
      {
        id: 'r_1',
        subredditId: 't5_x',
        name: 'A',
        description: '',
        defaultSeverity: 'low',
        enabled: true,
        createdAt: 1,
      },
      {
        id: 'r_2',
        subredditId: 't5_x',
        name: 'B',
        description: '',
        defaultSeverity: 'high',
        enabled: false,
        createdAt: 2,
      },
    ];
    expect(filterEnabledRules(rules)).toHaveLength(1);
    expect(filterEnabledRules(rules)[0]?.id).toBe('r_1');
  });
});

describe('sortVerdictsByCreatedAtDesc', () => {
  it('sorts newest first', () => {
    const verdicts = [
      makeVerdict({ id: 'v_1', createdAt: 100 }),
      makeVerdict({ id: 'v_2', createdAt: 300 }),
      makeVerdict({ id: 'v_3', createdAt: 200 }),
    ];
    const sorted = sortVerdictsByCreatedAtDesc(verdicts);
    expect(sorted.map((v) => v.id)).toEqual(['v_2', 'v_3', 'v_1']);
  });
});

describe('filterUnexpiredVerdicts', () => {
  it('excludes expired verdicts', () => {
    const now = 10_000;
    const verdicts = [
      makeVerdict({ id: 'v_1', expiresAt: now + 1 }),
      makeVerdict({ id: 'v_2', expiresAt: now }),
      makeVerdict({ id: 'v_3', expiresAt: now - 1 }),
    ];
    const filtered = filterUnexpiredVerdicts(verdicts, now);
    expect(filtered.map((v) => v.id)).toEqual(['v_1']);
  });
});

function makeVerdict(overrides: Partial<Verdict>): Verdict {
  return {
    id: 'v_test',
    subredditId: 't5_test',
    subredditName: 'test',
    username: 'user',
    contentType: 'post',
    contentId: 't3_x',
    permalink: 'https://reddit.com/r/test/comments/x',
    ruleId: 'r_1',
    ruleName: 'Rule',
    severity: 'low',
    decisionTemplate: 'Custom',
    reason: 'reason',
    actingMod: 'mod',
    createdAt: 1,
    expiresAt: 9_999_999_999,
    ...overrides,
  };
}
