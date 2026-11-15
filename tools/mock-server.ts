// Local UI harness only: serves dist/client with a fake /api so the game can be viewed outside Reddit.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { makePuzzle, todayUTC, verify } from '../src/shared/crease.ts';

const root = join(import.meta.dirname, '../dist/client');
const date = process.env.DATE ?? todayUTC();
const puzzle = makePuzzle(date);
let result: { folds: number; moves: unknown; hints?: number } | null = null;
const dist: Record<string, number> = { [puzzle.par]: 41, [puzzle.par + 1]: 63, [puzzle.par + 2]: 22 };
const me = () => ({ username: 'tester', streak: result ? 3 : 2, best: 5, solvedDays: 9, result });
const stats = () => ({ solvers: Object.values(dist).reduce((a, b) => a + b, 0), dist });
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const json = (o: unknown, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (url.pathname === '/api/init') return json({ puzzle, isToday: true, me: me(), stats: stats() });
  if (url.pathname === '/api/start') return json({ journeyId: 'local' });
  if (url.pathname === '/api/complete') {
    let body = ''; for await (const c of req) body += c;
    const folds = verify(puzzle, JSON.parse(body).moves);
    if (folds === null) return json({ ok: false, error: 'bad' }, 400);
    result = { folds, moves: JSON.parse(body).moves, hints: JSON.parse(body).hints }; dist[folds] = (dist[folds] ?? 0) + 1;
    return json({ ok: true, me: me(), stats: stats() });
  }
  if (url.pathname.startsWith('/api/')) return json({ ok: true });
  try {
    const p = join(root, url.pathname === '/' ? 'game.html' : url.pathname);
    const buf = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }); res.end(buf);
  } catch { res.writeHead(404); res.end(); }
}).listen(5178, () => console.log('mock on 5178', puzzle));
