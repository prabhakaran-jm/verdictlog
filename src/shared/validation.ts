import type { Rule, Verdict } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_REASON_LEN = 500;
export const MAX_RULE_NAME_LEN = 100;
export const MAX_RULE_DESC_LEN = 500;
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 3650;
export const MAX_RULES_PER_SUB = 50;
export const DEFAULT_RETENTION_DAYS = 90;

// ─── Decision Templates ───────────────────────────────────────────────────────

export const DECISION_TEMPLATES: readonly string[] = [
  'Repeated violation after prior warning',
  'Good-faith mistake — educational removal',
  'Spam pattern across multiple posts',
  'Escalated behavior after temp ban',
  'Off-topic — redirected to appropriate subreddit',
  'Inflammatory or bad-faith engagement',
  'Custom',
];

// ─── Validation Result Type ───────────────────────────────────────────────────

type ValidationOk = { ok: true };
type ValidationFail = { ok: false; message: string };
type ValidationResult = ValidationOk | ValidationFail;

// ─── Validators ──────────────────────────────────────────────────────────────

export function validateReason(s: string): ValidationResult {
  if (s.length > MAX_REASON_LEN) {
    return { ok: false, message: `Reason must be ${MAX_REASON_LEN} characters or fewer` };
  }
  if (/[\n\r]/.test(s)) {
    return { ok: false, message: 'Reason must not contain newline characters' };
  }
  return { ok: true };
}

export function validateUsername(s: string): ValidationResult {
  if (s.length === 0) {
    return { ok: false, message: 'Username must not be empty' };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(s)) {
    return { ok: false, message: 'Username may only contain letters, numbers, underscores, and hyphens' };
  }
  return { ok: true };
}

export function validateRuleName(s: string): ValidationResult {
  if (s.length === 0) {
    return { ok: false, message: 'Rule name must not be empty' };
  }
  if (s.length > MAX_RULE_NAME_LEN) {
    return { ok: false, message: `Rule name must be ${MAX_RULE_NAME_LEN} characters or fewer` };
  }
  return { ok: true };
}

export function validateRuleDescription(s: string): ValidationResult {
  if (s.length > MAX_RULE_DESC_LEN) {
    return { ok: false, message: `Rule description must be ${MAX_RULE_DESC_LEN} characters or fewer` };
  }
  return { ok: true };
}

export function validateRetentionDays(n: number): ValidationResult {
  if (n < MIN_RETENTION_DAYS || n > MAX_RETENTION_DAYS) {
    return { ok: false, message: 'Retention period must be between 1 and 3650 days' };
  }
  return { ok: true };
}

// ─── Pure Utilities ───────────────────────────────────────────────────────────

export function computeExpiresAt(createdAt: number, retentionDays: number): number {
  return createdAt + retentionDays * 86400 * 1000;
}

export function filterEnabledRules(rules: Rule[]): Rule[] {
  return rules.filter((rule) => rule.enabled === true);
}

export function sortVerdictsByCreatedAtDesc(verdicts: Verdict[]): Verdict[] {
  return [...verdicts].sort((a, b) => b.createdAt - a.createdAt);
}

export function filterUnexpiredVerdicts(verdicts: Verdict[], now?: number): Verdict[] {
  const reference = now ?? Date.now();
  return verdicts.filter((verdict) => verdict.expiresAt > reference);
}
