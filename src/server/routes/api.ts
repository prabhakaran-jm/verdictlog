import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../trpc';
import { modGuard } from '../middleware/modGuard';

export const api = new Hono();

api.use('*', modGuard);

api.all('/trpc/*', (c) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  });
});
