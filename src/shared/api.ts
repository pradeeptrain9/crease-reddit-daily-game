import type { Move, Puzzle } from './crease';

export type Stats = {
  solvers: number;
  dist: Record<string, number>; // folds -> players
};

export type Me = {
  username: string | null;
  streak: number;
  best: number;
  solvedDays: number;
  result: { folds: number; moves: Move[]; hints?: number } | null; // today's result on this post
};

export type InitResponse = {
  puzzle: Puzzle;
  isToday: boolean;
  me: Me;
  stats: Stats;
};

export type CompleteRequest = { moves: Move[]; hints?: number; journeyId?: string };
export type CompleteResponse = { ok: true; me: Me; stats: Stats } | { ok: false; error: string };
