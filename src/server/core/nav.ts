import { redis } from '@devvit/web/server';

export type PendingPage = 'search' | 'rules' | 'settings';

function pendingPageKey(subredditId: string): string {
  return `vl:${subredditId}:pendingPage`;
}

const PENDING_PAGE_TTL_SECONDS = 300;

export async function setPendingPage(subredditId: string, page: PendingPage): Promise<void> {
  const key = pendingPageKey(subredditId);
  await redis.set(key, page);
  await redis.expire(key, PENDING_PAGE_TTL_SECONDS);
}

export async function consumePendingPage(subredditId: string): Promise<PendingPage | null> {
  const key = pendingPageKey(subredditId);
  const raw = await redis.get(key);
  if (!raw) {
    return null;
  }
  await redis.del(key);
  if (raw === 'search' || raw === 'rules' || raw === 'settings') {
    return raw;
  }
  return null;
}
