import type { MiddlewareHandler } from 'hono';
import { isModerator } from './isModerator';

export const modGuard: MiddlewareHandler = async (c, next) => {
  if (!(await isModerator())) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
};
