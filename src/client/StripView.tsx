import type { CSSProperties } from 'react';
import { GLYPHS, INKS, INK_NAMES } from './inks';


type Props = {
  colors: number[];
  depths?: number[];
  size?: 'sm' | 'lg';
  label: string;
  matches?: boolean[];
};

export const StripView = ({ colors, depths, size = 'lg', label, matches }: Props) => (
  <div
    className={`strip strip-${size}`}
    style={{ '--n': colors.length } as CSSProperties}
    role="img"
    aria-label={`${label}: ${colors.map((c) => INK_NAMES[c]).join(', ')}`}
  >
    {colors.map((c, i) => (
      <div
        key={i}
        className={`cell ${INKS[c]} ${matches?.[i] ? 'match' : ''}`}
        style={{ '--depth': Math.min((depths?.[i] ?? 1) - 1, 6) } as CSSProperties}
      >
        <span aria-hidden>{GLYPHS[c]}</span>
      </div>
    ))}
  </div>
);
