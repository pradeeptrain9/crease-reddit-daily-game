import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { telemetry } from '@devvit/analytics/server/reddit';
import type { CompleteRequest, CompleteResponse, InitResponse, Me, Stats } from '../../shared/api';
import { makePuzzle, prevDay, todayUTC, verify, type Puzzle } from '../../shared/crease';

export const api = new Hono();

const postDate = async () => {
  const { postId } = context;
  return (postId && (await redis.get(`post:${postId}:date`))) || todayUTC();
};

// puzzle generation is a small BFS; cache per date so hot paths stay cheap
const puzzleFor = async (date: string): Promise<Puzzle> => {
  const cached = await redis.get(`puzzle:${date}`);
  if (cached) return JSON.parse(cached) as Puzzle;
  const p = makePuzzle(date);
  await redis.set(`puzzle:${date}`, JSON.stringify(p));
  return p;
};

const getStats = async (date: string): Promise<Stats> => {
  const dist = await redis.hGetAll(`day:${date}:dist`);
  const solvers = Object.values(dist).reduce((a, b) => a + Number(b), 0);
  return { solvers, dist: Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, Number(v)])) };
};

const getMe = async (username: string | null, date: string): Promise<Me> => {
  if (!username) return { username: null, streak: 0, best: 0, solvedDays: 0, result: null };
  const [u, result] = await Promise.all([
    redis.hGetAll(`user:${username}`),
    redis.hGet(`day:${date}:results`, username),
  ]);
  // a streak only counts if the last solve was today or yesterday
  const alive = u.last === todayUTC() || u.last === prevDay(todayUTC());
  return {
    username,
    streak: alive ? Number(u.streak ?? 0) : 0,
    best: Number(u.best ?? 0),
    solvedDays: Number(u.solved ?? 0),
    result: result ? JSON.parse(result) : null,
  };
};

api.get('/init', async (c) => {
  const date = await postDate();
  const username = (await reddit.getCurrentUsername()) ?? null;
  const [puzzle, me, stats] = await Promise.all([puzzleFor(date), getMe(username, date), getStats(date)]);
  telemetry.appReady().catch(() => {});
  return c.json<InitResponse>({ puzzle, isToday: date === todayUTC(), me, stats });
});

api.post('/start', async (c) => {
  try {
    const { journeyId } = await telemetry.startJourney();
    return c.json({ journeyId });
  } catch {
    return c.json({ journeyId: null });
  }
});

api.post('/complete', async (c) => {
  const body = await c.req.json<CompleteRequest>().catch(() => null);
  const username = await reddit.getCurrentUsername();
  if (!body || !username) return c.json<CompleteResponse>({ ok: false, error: 'Log in to save your result' }, 400);

  const date = await postDate();
  const puzzle = await puzzleFor(date);
  const folds = verify(puzzle, body.moves);
  if (folds === null) return c.json<CompleteResponse>({ ok: false, error: 'That fold sequence does not solve it' }, 400);

  // client-reported, but it can only make a result look worse, so a range check is enough
  const hints = typeof body.hints === 'number' && Number.isInteger(body.hints) && body.hints >= 0 && body.hints < 100 ? body.hints : 0;
  const resultKey = `day:${date}:results`;
  const isFirst =
    (await redis.hSetNX(resultKey, username, JSON.stringify({ folds, moves: body.moves, hints }))) === 1;
  if (isFirst) {
    await redis.hIncrBy(`day:${date}:dist`, String(folds), 1);
    const uKey = `user:${username}`;
    const u = await redis.hGetAll(uKey);
    // streaks advance only on the live daily puzzle, not on archive posts
    if (date === todayUTC() && u.last !== date) {
      const streak = u.last === prevDay(date) ? Number(u.streak ?? 0) + 1 : 1;
      await redis.hSet(uKey, {
        last: date,
        streak: String(streak),
        best: String(Math.max(streak, Number(u.best ?? 0))),
      });
    }
    await redis.hIncrBy(uKey, 'solved', 1);
  }

  if (body.journeyId) {
    telemetry
      .endJourney({ journeyId: body.journeyId, complete: true, game: { win: true, score: folds } })
      .catch(() => {});
  }

  const me = await getMe(username, date);
  if (isFirst && me.streak >= 2 && context.subredditName) {
    // flair is a bonus; app may lack flair perms in some subs
    reddit
      .setUserFlair({ subredditName: context.subredditName, username, text: `${me.streak}-day crease streak` })
      .catch((e) => console.warn('flair skipped', e));
  }
  return c.json<CompleteResponse>({ ok: true, me, stats: await getStats(date) });
});

api.post('/comment', async (c) => {
  const username = await reddit.getCurrentUsername();
  const { postId } = context;
  if (!username || !postId) return c.json({ ok: false }, 400);
  const date = await postDate();
  const [result, puzzle, sticky] = await Promise.all([
    redis.hGet(`day:${date}:results`, username),
    puzzleFor(date),
    redis.get(`post:${postId}:sticky`),
  ]);
  if (!result) return c.json({ ok: false, error: 'Solve it first' }, 400);
  const { folds, hints = 0 } = JSON.parse(result) as { folds: number; hints?: number };
  const me = await getMe(username, date);
  const marks = '◆'.repeat(Math.min(folds, puzzle.par)) + '◇'.repeat(Math.max(0, folds - puzzle.par));
  const hintNote = hints > 0 ? ` · ${hints} hint${hints === 1 ? '' : 's'}` : '';
  const streakNote = me.streak > 1 ? ` · ${me.streak}-day streak` : '';
  const text = `Crease #${puzzle.number}: ${folds} fold${folds === 1 ? '' : 's'} (par ${puzzle.par}) ${marks}${hintNote}${streakNote}`;
  try {
    const id = (sticky ?? postId) as `t1_${string}` | `t3_${string}`;
    await reddit.submitComment({ id, text, runAs: 'USER' });
    return c.json({ ok: true });
  } catch (e) {
    console.error('comment failed', e);
    return c.json({ ok: false, error: 'Could not post comment' }, 500);
  }
});

api.post('/subscribe', async (c) => {
  try {
    await reddit.subscribeToCurrentSubreddit();
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 500);
  }
});
