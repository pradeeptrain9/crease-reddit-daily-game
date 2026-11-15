import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createDailyPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const { id, created } = await createDailyPost();
    return c.json<UiResponse>({
      ...(created ? {} : { showToast: "Today's Crease already exists" }),
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});
