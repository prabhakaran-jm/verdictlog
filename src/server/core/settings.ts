import { redis } from '@devvit/web/server';
import type { RetentionSettings } from '../../shared/types';
import {
  DEFAULT_RETENTION_DAYS,
  validateRetentionDays,
} from '../../shared/validation';

// ─── Redis key helper ─────────────────────────────────────────────────────────

function settingsKey(subredditId: string): string {
  return `vl:${subredditId}:settings`;
}

// ─── Parsing ────────────────────────────────────────────────────────────────────

function parseRetentionDays(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return null;
  }

  const result = validateRetentionDays(value);
  if (!result.ok) {
    return null;
  }

  return value;
}

function parseUpdatedAt(raw: string | undefined): number {
  if (raw === undefined) {
    return 0;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function defaultRetentionSettings(subredditId: string): RetentionSettings {
  return {
    subredditId,
    retentionDays: DEFAULT_RETENTION_DAYS,
    updatedAt: 0,
  };
}

// ─── Core operations ──────────────────────────────────────────────────────────

export async function getRetentionSettings(
  subredditId: string
): Promise<RetentionSettings> {
  const key = settingsKey(subredditId);
  const [retentionDaysRaw, updatedAtRaw] = await Promise.all([
    redis.hGet(key, 'retentionDays'),
    redis.hGet(key, 'updatedAt'),
  ]);

  const retentionDays = parseRetentionDays(retentionDaysRaw);
  if (retentionDays === null) {
    return defaultRetentionSettings(subredditId);
  }

  return {
    subredditId,
    retentionDays,
    updatedAt: parseUpdatedAt(updatedAtRaw),
  };
}

export async function saveRetentionSettings(
  retentionDays: number,
  subredditId: string
): Promise<RetentionSettings> {
  const result = validateRetentionDays(retentionDays);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const updatedAt = Date.now();

  await redis.hSet(settingsKey(subredditId), {
    retentionDays: String(retentionDays),
    updatedAt: String(updatedAt),
  });

  return {
    subredditId,
    retentionDays,
    updatedAt,
  };
}
