import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, makePuzzle, minFolds, solve, solveFrom, toStrip, verify, visible, prevDay, dayNumber } from './crease.ts';

test('fold L puts reversed flap on top, reading from crease', () => {
  // [0][1][2] | [3]  fold left over -> crease at left edge
  const s = fold(toStrip([0, 1, 2, 3]), { k: 3, dir: 'L' });
  assert.deepEqual(s, [[3, 2], [1], [0]]);
  assert.deepEqual(visible(s), [2, 1, 0]);
});

test('fold R mirrors onto left', () => {
  const s = fold(toStrip([0, 1, 2, 3]), { k: 1, dir: 'R' });
  assert.deepEqual(s, [[3], [2], [0, 1]]);
});

test('stacked flap flips layer order', () => {
  const s = fold([[0, 1], [2]], { k: 1, dir: 'L' });
  assert.deepEqual(s, [[2, 1, 0]]);
});

test('puzzles are deterministic, solvable at par, and verified', () => {
  for (let i = 0; i < 21; i++) {
    const date = new Date(Date.UTC(2026, 10, 11 + i)).toISOString().slice(0, 10);
    const p = makePuzzle(date);
    assert.deepEqual(p, makePuzzle(date));
    assert.equal(minFolds(p.colors, p.target, p.par), p.par);
    assert.equal(verify(p, solve(p.colors, p.target, p.par)), p.par);
    assert.ok(p.target.length >= 3);
  }
});

test('verify rejects junk and accepts a found solution', () => {
  const p = { date: 'x', number: 1, colors: [0, 1, 2, 3], target: [2, 1, 0], par: 1 };
  assert.equal(verify(p, [{ k: 3, dir: 'L' }]), 1);
  assert.equal(verify(p, [{ k: 9, dir: 'L' }]), null);
  assert.equal(verify(p, 'nope'), null);
  assert.equal(verify(p, [{ k: 1, dir: 'X' }]), null);
});

test('dates', () => {
  assert.equal(prevDay('2026-12-01'), '2026-11-30');
  assert.equal(dayNumber('2026-11-11'), 1);
});

test('hint search continues from a partly folded strip', () => {
  const p = makePuzzle('2026-11-15');
  const path = solve(p.colors, p.target, p.par)!;
  const mid = fold(toStrip(p.colors), path[0]!);
  const rest = solveFrom(mid, p.target, p.par)!;
  assert.ok(rest.length <= p.par - 1);
  assert.equal(verify(p, [path[0], ...rest]), rest.length + 1);
});
