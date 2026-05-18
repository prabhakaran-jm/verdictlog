import { redis } from '@devvit/web/server';
import type { ContentType, Severity, Verdict } from '../../shared/types';
import {
  computeExpiresAt,
  DEFAULT_RETENTION_DAYS,
  filterUnexpiredVerdicts,
  sortVerdictsByCreatedAtDesc,
} from '../../shared/validation';

// ─── Input / result types ─────────────────────────────────────────────────────

export type CreateVerdictInput = {
  subredditName: string;
  username: string;
  authorId?: string;
  contentType: ContentType;
  contentId: string;
  permalink: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  decisionTemplate: string;
  reason: string;
  actingMod: string;
};

export type PriorCountResult = {
  count: number;
  mostRecent: {
    ruleName: string;
    severity: Severity;
    createdAt: number;
  } | null;
};

export class VerdictNotFoundError extends Error {
  constructor() {
    super('Verdict not found');
    this.name = 'VerdictNotFoundError';
  }
}

export class VerdictForbiddenError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'VerdictForbiddenError';
  }
}

// ─── Redis key helpers ────────────────────────────────────────────────────────

function verdictKey(subredditId: string, verdictId: string): string {
  return `vl:${subredditId}:verdict:${verdictId}`;
}

function userVerdictsKey(subredditId: string, username: string): string {
  return `vl:${subredditId}:user:${username}:verdicts`;
}

// ─── Serialization ──────────────────────────────────────────────────────────────

function verdictToHash(verdict: Verdict): Record<string, string> {
  const hash: Record<string, string> = {
    id: verdict.id,
    subredditId: verdict.subredditId,
    subredditName: verdict.subredditName,
    username: verdict.username,
    contentType: verdict.contentType,
    contentId: verdict.contentId,
    permalink: verdict.permalink,
    ruleId: verdict.ruleId,
    ruleName: verdict.ruleName,
    severity: verdict.severity,
    decisionTemplate: verdict.decisionTemplate,
    reason: verdict.reason,
    actingMod: verdict.actingMod,
    createdAt: String(verdict.createdAt),
    expiresAt: String(verdict.expiresAt),
  };
  if (verdict.authorId !== undefined) {
    hash.authorId = verdict.authorId;
  }
  return hash;
}

function verdictFromHash(hash: Record<string, string>): Verdict | null {
  const { id, subredditId, subredditName, username, contentType, contentId, permalink } =
    hash;
  const {
    ruleId,
    ruleName,
    severity,
    decisionTemplate,
    reason,
    actingMod,
    createdAt,
    expiresAt,
  } = hash;

  if (
    !id ||
    !subredditId ||
    !subredditName ||
    !username ||
    !contentType ||
    !contentId ||
    !permalink ||
    !ruleId ||
    !ruleName ||
    !severity ||
    !decisionTemplate ||
    !reason ||
    !actingMod ||
    !createdAt ||
    !expiresAt
  ) {
    return null;
  }

  if (contentType !== 'post' && contentType !== 'comment') {
    return null;
  }

  if (severity !== 'low' && severity !== 'medium' && severity !== 'high') {
    return null;
  }

  const verdict: Verdict = {
    id,
    subredditId,
    subredditName,
    username,
    contentType,
    contentId,
    permalink,
    ruleId,
    ruleName,
    severity,
    decisionTemplate,
    reason,
    actingMod,
    createdAt: Number(createdAt),
    expiresAt: Number(expiresAt),
  };

  if (hash.authorId !== undefined && hash.authorId !== '') {
    verdict.authorId = hash.authorId;
  }

  return verdict;
}

// ─── User verdict index (JSON list — Devvit Redis has no list commands) ───────

async function getUserVerdictIds(subredditId: string, username: string): Promise<string[]> {
  const raw = await redis.get(userVerdictsKey(subredditId, username));
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

async function saveUserVerdictIds(
  subredditId: string,
  username: string,
  ids: string[],
  indexExpiresAtMs: number
): Promise<void> {
  const key = userVerdictsKey(subredditId, username);
  const currentExpireSec = await redis.expireTime(key);
  const newExpireSec = Math.ceil(indexExpiresAtMs / 1000);
  const effectiveExpireMs =
    currentExpireSec > 0
      ? Math.max(currentExpireSec * 1000, indexExpiresAtMs)
      : indexExpiresAtMs;

  if (currentExpireSec < 0 || currentExpireSec < newExpireSec) {
    await redis.set(key, JSON.stringify(ids), {
      expiration: new Date(effectiveExpireMs),
    });
    return;
  }

  await redis.set(key, JSON.stringify(ids));
  const ttlSeconds = Math.max(1, currentExpireSec - Math.floor(Date.now() / 1000));
  await redis.expire(key, ttlSeconds);
}

async function prependUserVerdictId(
  subredditId: string,
  username: string,
  verdictId: string,
  expiresAtMs: number
): Promise<void> {
  const ids = await getUserVerdictIds(subredditId, username);
  if (!ids.includes(verdictId)) {
    ids.unshift(verdictId);
  }
  await saveUserVerdictIds(subredditId, username, ids, expiresAtMs);
}

async function removeUserVerdictId(
  subredditId: string,
  username: string,
  verdictId: string
): Promise<void> {
  const key = userVerdictsKey(subredditId, username);
  const ids = await getUserVerdictIds(subredditId, username);
  const next = ids.filter((id) => id !== verdictId);
  if (next.length === ids.length) {
    return;
  }

  const currentExpireSec = await redis.expireTime(key);
  if (currentExpireSec > 0) {
    const ttlSeconds = Math.max(1, currentExpireSec - Math.floor(Date.now() / 1000));
    await redis.set(key, JSON.stringify(next));
    await redis.expire(key, ttlSeconds);
    return;
  }

  if (next.length === 0) {
    await redis.del(key);
    return;
  }

  await redis.set(key, JSON.stringify(next));
}

// ─── Core operations ──────────────────────────────────────────────────────────

export async function createVerdict(
  input: CreateVerdictInput,
  subredditId: string,
  retentionDays?: number
): Promise<Verdict> {
  const days = retentionDays ?? DEFAULT_RETENTION_DAYS;
  const createdAt = Date.now();
  const expiresAt = computeExpiresAt(createdAt, days);

  const verdict: Verdict = {
    id: `v_${crypto.randomUUID()}`,
    subredditId,
    subredditName: input.subredditName,
    username: input.username,
    contentType: input.contentType,
    contentId: input.contentId,
    permalink: input.permalink,
    ruleId: input.ruleId,
    ruleName: input.ruleName,
    severity: input.severity,
    decisionTemplate: input.decisionTemplate,
    reason: input.reason,
    actingMod: input.actingMod,
    createdAt,
    expiresAt,
    ...(input.authorId !== undefined ? { authorId: input.authorId } : {}),
  };

  const key = verdictKey(subredditId, verdict.id);
  await redis.hSet(key, verdictToHash(verdict));
  await redis.expire(key, days * 86400);
  await prependUserVerdictId(subredditId, input.username, verdict.id, expiresAt);

  return verdict;
}

async function loadVerdictsForUser(
  username: string,
  subredditId: string,
  pruneStale: boolean
): Promise<Verdict[]> {
  const now = Date.now();
  const ids = await getUserVerdictIds(subredditId, username);
  const verdicts: Verdict[] = [];
  const staleIds: string[] = [];

  for (const id of ids) {
    const hash = await redis.hGetAll(verdictKey(subredditId, id));
    const verdict = verdictFromHash(hash);

    if (verdict === null || verdict.expiresAt <= now) {
      staleIds.push(id);
      continue;
    }

    verdicts.push(verdict);
  }

  if (pruneStale && staleIds.length > 0) {
    const cleaned = ids.filter((id) => !staleIds.includes(id));
    const maxExpiresAt = verdicts.reduce(
      (max, v) => Math.max(max, v.expiresAt),
      now + DEFAULT_RETENTION_DAYS * 86400 * 1000
    );
    if (cleaned.length === 0) {
      await redis.del(userVerdictsKey(subredditId, username));
    } else {
      await saveUserVerdictIds(subredditId, username, cleaned, maxExpiresAt);
    }
  }

  return filterUnexpiredVerdicts(verdicts, now);
}

export async function getCaseFile(username: string, subredditId: string): Promise<Verdict[]> {
  const verdicts = await loadVerdictsForUser(username, subredditId, true);
  return sortVerdictsByCreatedAtDesc(verdicts);
}

export async function deleteVerdict(
  verdictId: string,
  subredditId: string
): Promise<void> {
  const key = verdictKey(subredditId, verdictId);
  const hash = await redis.hGetAll(key);

  if (!hash.id) {
    throw new VerdictNotFoundError();
  }

  const verdict = verdictFromHash(hash);
  if (verdict === null) {
    throw new VerdictNotFoundError();
  }

  if (verdict.subredditId !== subredditId) {
    throw new VerdictForbiddenError();
  }

  await redis.del(key);
  await removeUserVerdictId(subredditId, verdict.username, verdictId);
}

export async function getPriorCount(
  username: string,
  subredditId: string
): Promise<PriorCountResult> {
  const verdicts = await loadVerdictsForUser(username, subredditId, false);
  const sorted = sortVerdictsByCreatedAtDesc(verdicts);
  const mostRecent = sorted[0];

  return {
    count: verdicts.length,
    mostRecent: mostRecent
      ? {
          ruleName: mostRecent.ruleName,
          severity: mostRecent.severity,
          createdAt: mostRecent.createdAt,
        }
      : null,
  };
}
