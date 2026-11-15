// Crease: a strip of inked paper. Fold it at a crease; the flap lands on top
// (flipped, so its layer order reverses). Match the target pattern in as few folds as possible.

export type Stack = number[]; // colors, bottom -> top
export type Strip = Stack[];
export type Dir = 'L' | 'R'; // L: left flap folds over to the right; R: right flap folds over to the left
export type Move = { k: number; dir: Dir }; // crease k sits between cell k-1 and cell k
export type Puzzle = {
  date: string;
  number: number;
  colors: number[]; // starting strip, one color per cell
  target: number[];
  par: number;
};

export const EPOCH = '2026-11-11';
export const PALETTE_SIZE = 4;

export const fold = (strip: Strip, { k, dir }: Move): Strip => {
  const n = strip.length;
  if (!Number.isInteger(k) || k < 1 || k > n - 1) throw new Error(`bad crease ${k}`);
  const left = strip.slice(0, k);
  const right = strip.slice(k);
  const m = Math.max(left.length, right.length);
  const out: Strip = [];
  for (let j = 0; j < m; j++) {
    // j counts outward from the crease
    const base = dir === 'L' ? right[j] : left[k - 1 - j];
    const flap = dir === 'L' ? left[k - 1 - j] : right[j];
    out.push([...(base ?? []), ...(flap ? [...flap].reverse() : [])]);
  }
  // L result already reads left->right from the crease; R result reads right->left
  return dir === 'L' ? out : out.reverse();
};

export const visible = (strip: Strip): number[] => strip.map((s) => s[s.length - 1]!);
export const toStrip = (colors: number[]): Strip => colors.map((c) => [c]);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export const allMoves = (len: number): Move[] => {
  const out: Move[] = [];
  for (let k = 1; k < len; k++) out.push({ k, dir: 'L' }, { k, dir: 'R' });
  return out;
};

/** Shortest fold sequence making `colors` show `target`, searching up to maxDepth. null if none. */
export const solve = (colors: number[], target: number[], maxDepth: number): Move[] | null => {
  let frontier: { s: Strip; path: Move[] }[] = [{ s: toStrip(colors), path: [] }];
  const seen = new Set<string>();
  for (let d = 0; d <= maxDepth; d++) {
    const next: typeof frontier = [];
    for (const { s, path } of frontier) {
      if (same(visible(s), target)) return path;
      if (s.length <= target.length) continue; // folding only shrinks
      for (const mv of allMoves(s.length)) {
        const f = fold(s, mv);
        if (f.length < target.length) continue;
        const key = JSON.stringify(f);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ s: f, path: [...path, mv] });
      }
    }
    frontier = next;
  }
  return null;
};

export const minFolds = (colors: number[], target: number[], maxDepth: number) =>
  solve(colors, target, maxDepth)?.length ?? -1;

export const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const dayNumber = (date: string) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${EPOCH}T00:00:00Z`)) / 86400000) + 1;

/** Difficulty curve over the week: Mon easy (2 folds) -> weekend hard (4 folds). */
export const parFor = (date: string) => [4, 2, 2, 3, 3, 3, 4][new Date(`${date}T00:00:00Z`).getUTCDay()]!;

export const makePuzzle = (date: string): Puzzle => {
  const rand = mulberry32(hash(`crease:${date}`));
  const want = parFor(date);
  const len = want >= 4 ? 12 : 10;
  for (let tries = 0; ; tries++) {
    const colors = Array.from({ length: len }, () => Math.floor(rand() * PALETTE_SIZE));
    let s = toStrip(colors);
    for (let i = 0; i < want; i++) {
      const moves = allMoves(s.length);
      s = fold(s, moves[Math.floor(rand() * moves.length)]!);
    }
    const target = visible(s);
    if (target.length < 3 || new Set(target).size < 2) continue;
    // accept slightly easier puzzles only after many rejections so generation always ends
    const par = minFolds(colors, target, want);
    if (par === want || (tries > 200 && par > 0)) {
      return { date, number: dayNumber(date), colors, target, par };
    }
  }
};

/** Replays moves from the puzzle start. Returns folds used if it solves, else null. Server trust boundary. */
export const verify = (p: Puzzle, moves: unknown): number | null => {
  if (!Array.isArray(moves) || moves.length === 0 || moves.length > 12) return null;
  let s = toStrip(p.colors);
  for (const mv of moves) {
    if (typeof mv !== 'object' || mv === null) return null;
    const { k, dir } = mv as Record<string, unknown>;
    if (typeof k !== 'number' || (dir !== 'L' && dir !== 'R')) return null;
    if (!Number.isInteger(k) || k < 1 || k > s.length - 1) return null;
    s = fold(s, { k, dir });
  }
  return same(visible(s), p.target) ? moves.length : null;
};

export const todayUTC = (now = new Date()) => now.toISOString().slice(0, 10);
export const prevDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
