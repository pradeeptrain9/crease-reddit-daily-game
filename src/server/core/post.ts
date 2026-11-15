import { context, reddit, redis } from '@devvit/web/server';
import { makePuzzle, todayUTC } from '../../shared/crease';

const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** Creates the day's post once per subreddit+date; returns existing one if already made. */
export const createDailyPost = async (date = todayUTC()) => {
  const sub = context.subredditName ?? '';
  const key = `daily:${sub}:${date}`;
  const existing = await redis.get(key);
  if (existing) return { id: existing, created: false };

  const p = makePuzzle(date);
  const post = await reddit.submitCustomPost({
    title: `Crease #${p.number} · ${longDate(date)} · par ${p.par}`,
    // splash reads this directly so the feed view renders without a server round trip
    postData: { date, number: p.number, par: p.par, target: p.target, colors: p.colors },
  });
  await redis.set(key, post.id);
  await redis.set(`post:${post.id}:date`, date);

  // Single stickied comment that score-share replies thread under (Devvit user-action guideline).
  try {
    const c = await reddit.submitComment({
      id: post.id,
      text: [
        `**How to play Crease #${p.number}:** tap a crease between two squares, then tap the side to fold over. The folded part flips and lands on top (its order reverses). Make the strip match the target in ${p.par} folds.`,
        '',
        'Share your result as a reply here 👇 Strategy talk welcome as top-level comments; spoiler-tag your folds with >!like this!<.',
      ].join('\n'),
    });
    await c.distinguish(true);
    await redis.set(`post:${post.id}:sticky`, c.id);
  } catch (e) {
    console.error('sticky comment failed', e);
  }
  return { id: post.id, created: true };
};
