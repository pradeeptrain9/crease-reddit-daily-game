import { useEffect, useRef } from 'react';
import { fold, toStrip, visible } from '../shared/crease';
import { StripView } from './StripView';

// Worked example computed with the real engine, so the picture can never disagree with the rules.
const BEFORE = [0, 1, 2, 3];
const AFTER = visible(fold(toStrip(BEFORE), { k: 2, dir: 'L' }));

export const HowTo = ({ par, onClose }: { par: number; onClose: () => void }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="howto-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="howto-title">How to play</h2>
        <ol className="howto">
          <li>
            <b>Pick a crease.</b> Tap the gap between two squares.
          </li>
          <li>
            <b>Fold a side over.</b> Tap the left or right part. It flips over the crease and lands on top, so its
            order reverses.
            <div className="example" aria-label="Example: folding the left half over">
              <StripView colors={BEFORE} size="sm" label="Before" />
              <span aria-hidden>→</span>
              <StripView colors={AFTER} size="sm" label="After folding the left half over" />
            </div>
          </li>
          <li>
            <b>Match the target</b> shown at the top. Today’s best is {par} folds. Undo and Restart are free. Stuck? <b>Hint</b> shows the next
            crease, tap again for the side. Hints are noted on your score.
          </li>
        </ol>
        <p className="fine">Everyone gets the same strip each day. Solve it to keep your streak and see how others folded.</p>
        <button ref={closeRef} className="btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
};
