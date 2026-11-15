# Crease — a daily folding puzzle for Reddit

Each day everyone gets the same strip of inked paper. Fold it at any crease — the flap flips over
and lands on top — until the strip shows the target pattern. Par is the fewest folds possible
(computed by search), and the week ramps from easy Monday (2 folds) to hard weekend (4 folds).

Built on Devvit Web (React + Hono). Reddit Game of the Day hackathon entry, Nov 2026.

## Reddit-native bits
- New post every day at 00:00 UTC (scheduler), plus a mod menu item "Post today's Crease".
- Server replays every submitted fold sequence before recording it, so streaks and stats are fair.
- Streaks, best streak, solved count; streak flair (`N-day crease streak`) when the app can set flair.
- Results histogram for the day; "Share result in comments" posts as the user, threaded under one stickied comment.
- Separate "Join for daily puzzles" subscribe button.
- Devvit Journeys: app ready on load, journey start on first committed fold, journey end with score on solve.
- Colors also carry glyphs (● ▲ ■ ✚) for color-blind players; keyboard: ←/→ pick crease, `[` / `]` fold, `z` undo.

## Develop
Requires Node 24+.

```bash
npm install
npm run login        # devvit login (once)
npm run dev          # devvit playtest in your test subreddit
npm run test:unit    # engine tests
npm run deploy       # type-check, lint, devvit upload
```

Local UI without Reddit: `npm run build && node --experimental-strip-types tools/mock-server.ts`, then open http://localhost:5178/game.html.
