import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api';
import { StripView } from './StripView';

type Seed = { date: string; number: number; par: number; target: number[]; colors: number[] };

const isSeed = (d: unknown): d is Seed =>
  typeof d === 'object' && d !== null && Array.isArray((d as Seed).target) && Array.isArray((d as Seed).colors);

export const Splash = () => {
  const seed = isSeed(context?.postData) ? context?.postData : null;
  const [init, setInit] = useState<InitResponse | null>(null);
  useEffect(() => {
    fetch('/api/init')
      .then((r) => r.json() as Promise<InitResponse>)
      .then(setInit)
      .catch(() => {});
  }, []);

  const p = init?.puzzle ?? seed;
  const done = init?.me.result;
  const date = p
    ? new Date(`${p.date}T00:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : '';

  return (
    <div className="screen splash">
      <div>
        <h1 className="brand big">Crease</h1>
        <p className="tagline">Fold the strip until it shows the pattern.</p>
      </div>
      {p ? (
        <>
          <div className="meta">
            #{p.number} · {date} · par {p.par}
          </div>
          <div className="splash-strips">
            <StripView colors={p.colors} size="sm" label="Today’s strip" />
            <span className="into" aria-hidden>
              ↓ fold into ↓
            </span>
            <StripView colors={p.target} size="sm" label="Target" />
          </div>
          <ol className="steps">
            <li>Tap a crease between squares</li>
            <li>Tap a side — it flips over on top</li>
            <li>Match the target in par</li>
          </ol>
        </>
      ) : (
        <div className="meta loading">Unfolding…</div>
      )}
      <button className="btn big" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
        {done ? `Solved in ${done.folds} · see results` : 'Play'}
      </button>
      <div className="meta small">
        {init ? `${init.stats.solvers} folded today` : ' '}
        {init && init.me.streak > 0 ? ` · your streak ${init.me.streak}` : ''}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
