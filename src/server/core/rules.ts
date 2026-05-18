import { redis } from '@devvit/web/server';
import type { Rule, Severity } from '../../shared/types';
import {
  MAX_RULES_PER_SUB,
  validateRuleDescription,
  validateRuleName,
} from '../../shared/validation';

// ─── Input types ──────────────────────────────────────────────────────────────

export type CreateRuleInput = {
  name: string;
  description?: string;
  defaultSeverity: Severity;
};

export type UpdateRulePatch = {
  name?: string;
  description?: string;
  defaultSeverity?: Severity;
  enabled?: boolean;
};

export class RuleNotFoundError extends Error {
  constructor() {
    super('Rule not found');
    this.name = 'RuleNotFoundError';
  }
}

// ─── Redis key helper ─────────────────────────────────────────────────────────

function rulesKey(subredditId: string): string {
  return `vl:${subredditId}:rules`;
}

// ─── Serialization ────────────────────────────────────────────────────────────

function isSeverity(value: unknown): value is Severity {
  return value === 'low' || value === 'medium' || value === 'high';
}

function parseRule(id: string, raw: string): Rule | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const {
      subredditId,
      name,
      description,
      defaultSeverity,
      enabled,
      createdAt,
    } = record;

    if (
      typeof subredditId !== 'string' ||
      typeof name !== 'string' ||
      typeof description !== 'string' ||
      !isSeverity(defaultSeverity) ||
      typeof enabled !== 'boolean' ||
      typeof createdAt !== 'number'
    ) {
      return null;
    }

    return {
      id,
      subredditId,
      name,
      description,
      defaultSeverity,
      enabled,
      createdAt,
    };
  } catch {
    return null;
  }
}

function assertValidSeverity(severity: Severity): void {
  if (!isSeverity(severity)) {
    throw new Error('Invalid severity: must be low, medium, or high');
  }
}

function hasDuplicateName(
  rules: Rule[],
  name: string,
  excludeId?: string
): boolean {
  const normalized = name.toLowerCase();
  return rules.some(
    (rule) => rule.id !== excludeId && rule.name.toLowerCase() === normalized
  );
}

async function getRuleById(subredditId: string, id: string): Promise<Rule | null> {
  const raw = await redis.hGet(rulesKey(subredditId), id);
  if (raw === undefined) {
    return null;
  }
  return parseRule(id, raw);
}

// ─── Core operations ──────────────────────────────────────────────────────────

export async function listRules(subredditId: string): Promise<Rule[]> {
  const hash = await redis.hGetAll(rulesKey(subredditId));
  const rules: Rule[] = [];

  for (const [id, raw] of Object.entries(hash)) {
    const rule = parseRule(id, raw);
    if (rule !== null) {
      rules.push(rule);
    }
  }

  return rules;
}

export async function createRule(
  input: CreateRuleInput,
  subredditId: string
): Promise<Rule> {
  const nameResult = validateRuleName(input.name);
  if (!nameResult.ok) {
    throw new Error(nameResult.message);
  }

  const description = input.description ?? '';
  const descriptionResult = validateRuleDescription(description);
  if (!descriptionResult.ok) {
    throw new Error(descriptionResult.message);
  }

  assertValidSeverity(input.defaultSeverity);

  const existing = await listRules(subredditId);

  if (hasDuplicateName(existing, input.name)) {
    throw new Error('A rule with this name already exists');
  }

  if (existing.length >= MAX_RULES_PER_SUB) {
    throw new Error(`Rule limit reached: maximum ${MAX_RULES_PER_SUB} rules per subreddit`);
  }

  const rule: Rule = {
    id: `r_${crypto.randomUUID()}`,
    subredditId,
    name: input.name,
    description,
    defaultSeverity: input.defaultSeverity,
    enabled: true,
    createdAt: Date.now(),
  };

  await redis.hSet(rulesKey(subredditId), {
    [rule.id]: JSON.stringify(rule),
  });

  return rule;
}

export async function updateRule(
  id: string,
  patch: UpdateRulePatch,
  subredditId: string
): Promise<Rule> {
  const existing = await getRuleById(subredditId, id);
  if (existing === null) {
    throw new RuleNotFoundError();
  }

  const nextName = patch.name ?? existing.name;
  const nextDescription = patch.description ?? existing.description;
  const nextSeverity = patch.defaultSeverity ?? existing.defaultSeverity;
  const nextEnabled = patch.enabled ?? existing.enabled;

  if (patch.name !== undefined) {
    const nameResult = validateRuleName(patch.name);
    if (!nameResult.ok) {
      throw new Error(nameResult.message);
    }
  }

  if (patch.description !== undefined) {
    const descriptionResult = validateRuleDescription(patch.description);
    if (!descriptionResult.ok) {
      throw new Error(descriptionResult.message);
    }
  }

  if (patch.defaultSeverity !== undefined) {
    assertValidSeverity(patch.defaultSeverity);
  }

  const allRules = await listRules(subredditId);
  if (patch.name !== undefined && hasDuplicateName(allRules, patch.name, id)) {
    throw new Error('A rule with this name already exists');
  }

  const updated: Rule = {
    id: existing.id,
    subredditId: existing.subredditId,
    name: nextName,
    description: nextDescription,
    defaultSeverity: nextSeverity,
    enabled: nextEnabled,
    createdAt: existing.createdAt,
  };

  await redis.hSet(rulesKey(subredditId), {
    [updated.id]: JSON.stringify(updated),
  });

  return updated;
}

export async function deleteRule(
  id: string,
  subredditId: string
): Promise<{ success: true }> {
  const existing = await getRuleById(subredditId, id);
  if (existing === null) {
    throw new RuleNotFoundError();
  }

  await redis.hDel(rulesKey(subredditId), [id]);

  return { success: true };
}
