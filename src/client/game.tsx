import './index.css';

import { StrictMode, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { context, showToast } from '@devvit/web/client';
import { fold, solve, toStrip, visible, type Dir, type Move, type Puzzle, type Strip } from '../shared/crease';
import type { CompleteResponse, InitResponse, Me, Stats } from '../shared/api';
import { StripView } from './StripView';
import { HowTo } from './HowTo';
import { GLYPHS, INKS } from './inks';

const FOLD_MS = 420;
const HINT_KEY = 'crease.seenHint';

const post = async <T,>(path: string, body: unknown = {}): Promise<T> => {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return (await r.json()) as T;
};

const seenHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};

const untilTomorrow = () => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const m = Math.max(0, Math.floor((next - now.getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const App = () => {
  const [data, setData] = useState<InitResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<Strip[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [crease, setCrease] = useState<number | null>(null);
  const [anim, setAnim] = useState<Move | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [replay, setReplay] = useState(false);
  const [hint, setHint] = useState(!seenHint());
  const [help, setHelp] = useState(false);
  const journey = useRef<string | null>(null);
  const [sent, setSent] = useState({ comment: false, sub: false });

  useEffect(() => {
    fetch('/api/init')
      .then((r) => r.json() as Promise<InitResponse>)
      .then((d) => {
        setData(d);
        setMe(d.me);
        setStats(d.stats);
        setHistory([toStrip(d.puzzle.colors)]);
      })
      .catch(() => setFailed(true));
  }, []);

  const strip = useMemo(() => history[history.length - 1] ?? [], [history]);
  const shown = visible(strip);
  const target = useMemo(() => data?.puzzle.target ?? [], [data]);
  const solved = shown.length === target.length && shown.every((c, i) => c === target[i]);
  const stuck = !solved && strip.length > 0 && strip.length <= target.length;
  const showResult = !!me?.result && !replay;

  const finish = useCallback(
    async (finalMoves: Move[]) => {
      if (replay) return;
      const r = await post<CompleteResponse>('/api/complete', { moves: finalMoves, journeyId: journey.current });
      if (r.ok) {
        setMe(r.me);
        setStats(r.stats);
      } else showToast(r.error);
    },
    [replay]
  );

  const doFold = useCallback(
    (dir: Dir) => {
      if (crease === null || anim || solved) return;
      const mv = { k: crease, dir };
      if (hint) {
        setHint(false);
        try {
          localStorage.setItem(HINT_KEY, '1');
        } catch {
          /* storage blocked: hint just shows again next time */
        }
      }
      if (!journey.current && !replay) {
        // first committed fold = explicit start of a play session
        post<{ journeyId: string | null }>('/api/start').then((r) => (journey.current = r.journeyId)).catch(() => {});
      }
      setAnim(mv);
      setTimeout(() => {
        const next = fold(strip, mv);
        const nextMoves = [...moves, mv];
        setHistory((h) => [...h, next]);
        setMoves(nextMoves);
        setAnim(null);
        setCrease(null);
        const v = visible(next);
        if (v.length === target.length && v.every((c, i) => c === target[i])) {
          setTimeout(() => void finish(nextMoves), 650);
        }
      }, FOLD_MS);
    },
    [crease, anim, solved, hint, replay, strip, moves, target, finish]
  );

  const undo = () => {
    if (history.length < 2 || anim) return;
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m.slice(0, -1));
    setCrease(null);
  };
  const restart = () => {
    if (anim || !data) return;
    setHistory([toStrip(data.puzzle.colors)]);
    setMoves([]);
    setCrease(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (help) return;
      const n = strip.length;
      if (e.key === 'ArrowRight') setCrease((c) => Math.min(n - 1, (c ?? 0) + 1));
      else if (e.key === 'ArrowLeft') setCrease((c) => Math.max(1, (c ?? n) - 1));
      else if (e.key === '[') doFold('L');
      else if (e.key === ']') doFold('R');
      else if (e.key === 'z' || e.key === 'Backspace') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const matches = useMemo(
    () => shown.map((c, i) => shown.length === target.length && c === target[i]),
    [shown, target]
  );

  if (failed) return <div className="screen center">Couldn’t load today’s paper. Pull to refresh.</div>;
  if (!data || !me || !stats) return <div className="screen center loading">Unfolding…</div>;
  const { puzzle } = data;

  return (
    <div className="screen">
      <header className="top">
        <div>
          <h1 className="brand">Crease</h1>
          <div className="meta">
            #{puzzle.number} · {shortDate(puzzle.date)}
            {!data.isToday && <span className="tag">archive</span>}
          </div>
        </div>
        <div className="top-right">
          {!showResult && (
            <div className="counter" aria-live="polite">
              <b>{moves.length}</b>
              <span>
                fold{moves.length === 1 ? '' : 's'} · par {puzzle.par}
              </span>
            </div>
          )}
          <button className="help" onClick={() => setHelp(true)} aria-label="How to play">
            ?
          </button>
        </div>
      </header>
      {help && <HowTo par={puzzle.par} onClose={() => setHelp(false)} />}

      {showResult ? (
        <Result
          me={me}
          stats={stats}
          puzzle={puzzle}
          isToday={data.isToday}
          sent={sent}
          onComment={async () => {
            const r = await post<{ ok: boolean; error?: string }>('/api/comment');
            if (r.ok) setSent((s) => ({ ...s, comment: true }));
            showToast(r.ok ? 'Posted to the thread' : (r.error ?? 'Could not post'));
          }}
          onSubscribe={async () => {
            const r = await post<{ ok: boolean }>('/api/subscribe');
            if (r.ok) setSent((s) => ({ ...s, sub: true }));
            showToast(r.ok ? 'Joined — new paper drops daily' : 'Could not join');
          }}
          onReplay={() => {
            setReplay(true);
            restart();
          }}
        />
      ) : (
        <main className="play">
          <section className="goal">
            <div className="label">Make this</div>
            <StripView colors={target} size="sm" label="Target" />
          </section>

          <section className="board" aria-label="Your paper strip">
            <Board strip={strip} crease={crease} anim={anim} onCrease={setCrease} onFold={doFold} matches={matches} />
          </section>

          <div className="status" aria-live="polite">
            {solved
              ? replay
                ? 'Matched! (practice run)'
                : 'Matched!'
              : stuck
                ? 'Too narrow to match — undo a fold.'
                : hint
                  ? crease === null
                    ? 'Tap a crease between two squares.'
                    : 'Now tap the side to fold over.'
                  : crease === null
                    ? 'Pick a crease'
                    : 'Pick a side to fold'}
          </div>

          <footer className="controls">
            <button className="btn ghost" onClick={undo} disabled={history.length < 2 || !!anim}>
              Undo
            </button>
            <button className="btn ghost" onClick={restart} disabled={history.length < 2 || !!anim}>
              Restart
            </button>
            {replay && me.result && (
              <button className="btn ghost" onClick={() => setReplay(false)}>
                My result
              </button>
            )}
          </footer>
        </main>
      )}
    </div>
  );
};

type BoardProps = {
  strip: Strip;
  crease: number | null;
  anim: Move | null;
  onCrease: (k: number) => void;
  onFold: (d: Dir) => void;
  matches: boolean[];
};

const Board = ({ strip, crease, anim, onCrease, onFold, matches }: BoardProps) => {
  const n = strip.length;
  const cells = visible(strip);
  const split = anim?.k ?? crease ?? 0;
  const renderCells = (from: number, to: number) =>
    cells.slice(from, to).map((c, i) => (
      <div
        key={from + i}
        className={`cell ${INKS[c]} ${matches[from + i] ? 'match' : ''}`}
        style={{ '--depth': Math.min(strip[from + i]!.length - 1, 6) } as CSSProperties}
      >
        <span aria-hidden>{GLYPHS[c]}</span>
      </div>
    ));

  return (
    <div className="strip strip-lg board-strip" style={{ '--n': n } as CSSProperties}>
      {split > 0 ? (
        <>
          <div
            className={`half left ${anim?.dir === 'L' ? 'flip-l' : ''} ${crease !== null && !anim ? 'pickable' : ''}`}
            onClick={() => onFold('L')}
            role="button"
            aria-label={`Fold the left ${split} squares over to the right`}
          >
            {renderCells(0, split)}
            {crease !== null && !anim && <span className="arrow">↷</span>}
          </div>
          <div
            className={`half right ${anim?.dir === 'R' ? 'flip-r' : ''} ${crease !== null && !anim ? 'pickable' : ''}`}
            onClick={() => onFold('R')}
            role="button"
            aria-label={`Fold the right ${n - split} squares over to the left`}
          >
            {renderCells(split, n)}
            {crease !== null && !anim && <span className="arrow">↶</span>}
          </div>
        </>
      ) : (
        renderCells(0, n)
      )}
      {!anim &&
        Array.from({ length: n - 1 }, (_, i) => i + 1).map((k) => (
          <button
            key={k}
            className={`notch ${crease === k ? 'on' : ''}`}
            style={{ '--k': k } as CSSProperties}
            onClick={(e) => {
              e.stopPropagation();
              onCrease(k);
            }}
            aria-label={`Crease after square ${k}`}
          />
        ))}
    </div>
  );
};

type ResultProps = {
  me: Me;
  stats: Stats;
  puzzle: Puzzle;
  isToday: boolean;
  sent: { comment: boolean; sub: boolean };
  onComment: () => void;
  onSubscribe: () => void;
  onReplay: () => void;
};

const Result = ({ me, stats, puzzle, isToday, sent, onComment, onSubscribe, onReplay }: ResultProps) => {
  const { par, number } = puzzle;
  const folds = me.result!.folds;
  const rows = Array.from(new Set([par, par + 1, par + 2, folds, ...Object.keys(stats.dist).map(Number)]))
    .filter((f) => f >= par)
    .sort((a, b) => a - b)
    .slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => stats.dist[r] ?? 0));
  const verdict = folds <= par ? 'Clean fold' : folds === par + 1 ? 'Nearly crisp' : 'Folded!';

  return (
    <main className="result">
      <div className="card">
        <div className="hero">
          {context?.snoovatar && <img className="snoo" src={context?.snoovatar} alt="" />}
          <div>
            <div className="verdict">{verdict}</div>
            <div className="score">
              <b>{folds}</b> fold{folds === 1 ? '' : 's'} <span>· par {par}</span>
            </div>
          </div>
        </div>

        <div className="nums">
          <div>
            <b>{me.streak}</b>
            <span>streak</span>
          </div>
          <div>
            <b>{me.best}</b>
            <span>best</span>
          </div>
          <div>
            <b>{me.solvedDays}</b>
            <span>solved</span>
          </div>
        </div>

        <div className="dist" aria-label="How everyone folded today">
          <div className="label">
            {stats.solvers} player{stats.solvers === 1 ? '' : 's'} folded #{number}
          </div>
          {rows.map((r) => (
            <div key={r} className={`bar ${r === folds ? 'mine' : ''}`}>
              <span>{r}</span>
              <i style={{ width: `${((stats.dist[r] ?? 0) / max) * 100}%` }} />
              <em>{stats.dist[r] ?? 0}</em>
            </div>
          ))}
        </div>

        <div className="actions">
          <button className="btn" onClick={onComment} disabled={sent.comment}>
            {sent.comment ? 'Shared ✓' : 'Share result in comments'}
          </button>
          <button className="btn ghost" onClick={onSubscribe} disabled={sent.sub}>
            {sent.sub ? 'Joined ✓' : 'Join for daily puzzles'}
          </button>
        </div>
        <ParRoute puzzle={puzzle} />
        <div className="foot">
          {isToday ? <>Fresh paper in {untilTomorrow()}</> : <>Archive puzzle — streaks count on today’s post</>}
          {' · '}
          <button className="link" onClick={onReplay}>
            practice again
          </button>
        </div>
      </div>
    </main>
  );
};

// Shown only after solving: one shortest route, step by step, so players can compare in comments.
const ParRoute = ({ puzzle }: { puzzle: Puzzle }) => {
  const [steps, setSteps] = useState<{ mv: Move; flap: number; after: number[] }[] | null>(null);
  const reveal = () => {
    const path = solve(puzzle.colors, puzzle.target, puzzle.par) ?? [];
    let s = toStrip(puzzle.colors);
    setSteps(
      path.map((mv) => {
        const flap = mv.dir === 'L' ? mv.k : s.length - mv.k;
        s = fold(s, mv);
        return { mv, flap, after: visible(s) };
      })
    );
  };
  if (!steps)
    return (
      <button className="btn ghost" onClick={reveal}>
        Show a par route
      </button>
    );
  return (
    <ol className="route" aria-label="A shortest fold route">
      {steps.map(({ mv, flap, after }, i) => (
        <li key={i}>
          <span>
            Fold the {mv.dir === 'L' ? 'left' : 'right'} {flap} over {mv.dir === 'L' ? '→' : '←'}
          </span>
          <StripView colors={after} size="sm" label={`After fold ${i + 1}`} />
        </li>
      ))}
    </ol>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
