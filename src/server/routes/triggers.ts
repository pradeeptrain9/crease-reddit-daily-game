import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { createDailyPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    await createDailyPost();
    return c.json<TriggerResponse>({ status: 'success', message: 'daily post created' });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to create post' }, 400);
  }
});

// cron: new puzzle every day at 00:00 UTC
triggers.post('/daily', async (c) => {
  try {
    await createDailyPost();
    return c.json({ status: 'ok' });
  } catch (error) {
    console.error(`daily post failed: ${error}`);
    return c.json({ status: 'error' }, 500);
  }
});
