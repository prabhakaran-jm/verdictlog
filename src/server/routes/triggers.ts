import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { setupSubredditOnInstall } from '../core/install';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();

  try {
    await setupSubredditOnInstall();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `VerdictLog installed: welcome post created and default rules seeded (${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error('on-app-install setup failed:', error);
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `VerdictLog installed (${input.type}). Open the app to configure rules if needed.`,
      },
      200
    );
  }
});
