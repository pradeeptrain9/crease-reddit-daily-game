# Crease: Devpost submission draft

## Links
- **Demo post:** https://www.reddit.com/r/crease_app_dev/comments/1xwh46i/crease_5_sunday_nov_15_par_4/
- **App listing:** https://developers.reddit.com/apps/crease-app
- **Source:** https://github.com/pradeeptrain9/crease-reddit-daily-game

## Tagline (one line)
A daily paper-folding puzzle: fold one strip until it shows the pattern, in as few folds as you can.

## Inspiration
Most daily games are about words or numbers. We wanted a daily game that feels physical, like folding a
paper strip on your desk. One fold changes everything because the flap flips over and its order reverses.
The rules take about five seconds to learn, but each day's puzzle still takes some thought.

## What it does
Every day at midnight UTC, Crease posts a new puzzle to the subreddit. Everyone gets the same strip of
colored squares and the same target pattern.

- **Tap a crease, then tap a side.** That side folds over and lands on top, reversed. Only the top layer shows.
- **Match the target in par.** Par is the true minimum number of folds, found by searching every possible
  fold sequence, so every puzzle is solvable and par is never a guess.
- **A weekly difficulty curve.** Monday and Tuesday take 2 folds, midweek takes 3, and the weekend takes 4
  folds on a longer strip.
- **Undo and Restart are free**, so players can experiment without losing anything.

When you solve it, a result card shows:
- your fold count against par
- your current streak, best streak and days solved
- a chart of how everyone folded that day
- a "Show a par route" reveal that walks through one shortest solution step by step

## Reddit-native touches
- **One post per day**, created automatically by the scheduler. Mods also get a "Post today's Crease" menu item.
- **The feed preview** shows today's strip, the target and three numbered how-to steps before anyone taps Play.
- **Comments as the scoreboard.** "Share result in comments" posts the player's score from their own
  account, as a reply under one pinned comment. That keeps the score replies in one place and leaves the
  rest of the thread for strategy talk with spoiler tags.
- **Streak flair** like "5-day crease streak" shows next to players' names around the subreddit.
- **The player's Reddit avatar** appears on their result card.
- **A separate "Join for daily puzzles" button.** It is never bundled with another action.
- **Devvit Journeys tracking:**
  - app ready when the game loads
  - journey start on the first fold, which is a deliberate player action, not just a page view
  - journey end with the score when the puzzle is solved

## Fairness
The server never takes a reported score on trust. The client sends its fold sequence, and the server
replays it against that day's puzzle before recording anything. So streaks and the results chart can't
be faked by sending a made-up score.

## Accessibility
- Every color also carries a symbol (● ▲ ■ ✚), so the puzzle can be played without telling colors apart.
- Full keyboard play: ←/→ picks a crease, [ and ] fold, z undoes.
- Light and dark themes follow the system setting.
- The motion respects the reduced-motion setting.
- Buttons have screen-reader labels.

## How we built it
- **Platform:** Devvit Web, with a React 19 client and a Hono server
- **Storage:** Redis holds daily results, the results chart, streaks and one cached copy of each day's puzzle
- **Shared game engine:** one TypeScript file used by both client and server. It contains:
  - the fold function
  - a seeded daily generator: same date, same puzzle, for everyone
  - the search that sets par
  - the replay check the server uses on submissions
- **Unit tests** for the engine: fold mechanics, three weeks of generated puzzles, and that par is reachable
- **Visual style:** hand-written CSS with an ink-on-paper look and no UI kit. The fold is a 3D flip animation
  around the crease.

## Challenges
- **Keeping par honest.** Random folds often produce a pattern that a shorter sequence can also reach. The
  generator keeps only puzzles whose shortest solution matches the day's difficulty.
- **Making the fold readable.** After a fold, layers stack and order reverses, which is easy to get wrong
  in your head. The flip animation and the extra paper edge under each stacked square make it visible.

## What's next
- An archive view for catching up on missed days
- Weekly leaderboards for the most days solved at par
- Themed weeks that change the colors

## Built with
devvit, devvit-web, react, typescript, hono, redis, vite

---

## Subreddit sidebar text (paste into Mod Tools → Community settings → Description)

**Crease: a new folding puzzle every day.**
1. Tap a crease between two squares.
2. Tap a side. It folds over and lands on top, reversed.
3. Match the target pattern in par.

New puzzle every day at 00:00 UTC. Keep your streak, share your score under the pinned comment, and
spoiler-tag your strategies.
