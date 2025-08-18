# MindMatch4 — Adaptive AI & Coach

This PR adds a modular AI (negamax + alpha-beta + iterative deepening), a local skill model,
hints/explanations, and daily challenge seeds.

## Files
- `ai/engine.js` — core search & board logic
- `ai/rating.js` — simple Elo-like skill model in localStorage
- `ai/coach.js` — difficulty control, hints, game-end updates
- `ai/challenge.js` — rotating daily seed positions
- `ai/mm4-plugin.js` — exposes `window.MindMatchAI` and optional UI hooks

## Minimal integration
Add at the bottom of `index.html` (before `</body>`):
```html
<script type="module">
  import "./ai/mm4-plugin.js";
</script>
<!-- Optional UI helpers -->
<button id="btnHint" aria-label="Show hint">Hint</button>
<button id="btnDaily">Daily Puzzle</button>
<div id="announce" aria-live="polite" class="sr-only"></div>
```

Wire your game to call:
```js
// When it's AI's turn:
const moveCol = window.MindMatchAI.aiMove(board, -1);

// When the game ends:
window.MindMatchAI.onGameEnd("ai_win"|"player_win"|"draw");
```

Optionally implement these helpers for the plugin's default buttons:
- `window.getBoardState()` -> returns board array[7] (columns bottom-up)
- `window.highlightCols(colsArray)` -> glow those columns
- `window.loadBoardState(board)` -> replace current board with given state
