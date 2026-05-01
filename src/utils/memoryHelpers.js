/* ════════════════════════════════════════════════════
   Memory Match helpers — pure functions, no React.
   ════════════════════════════════════════════════════ */

export const DECKS = {
  Easy:   { pairs:  6, cols: 4 }, // 12 cards (3 rows × 4 cols)
  Medium: { pairs:  8, cols: 4 }, // 16 cards (4 × 4)
  Hard:   { pairs: 10, cols: 5 }, // 20 cards (4 × 5)
  Expert: { pairs: 12, cols: 6 }, // 24 cards (4 × 6)
};

const EMOJI_POOL = [
  "🧠","⚡","🎯","🔥","🌟","🎲","🚀","🍀","🌈","🎵","💎","🎨",
  "🐉","🦄","🐙","🦊","🐼","🦋","🌙","☀️","⭐","🍕","🍩","🎮",
];

export const BEST_KEY = (level) => `mm4_mem_best_${level}`;

/** Shuffle array (Fisher-Yates). */
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a fresh deck of cards.
 * @returns Array<{ id, pairId, emoji, flipped, matched }>
 */
export function createDeck(level = "Medium") {
  const cfg = DECKS[level] || DECKS.Medium;
  const symbols = shuffle(EMOJI_POOL).slice(0, cfg.pairs);
  const pairs = [];
  symbols.forEach((emoji, i) => {
    pairs.push({ id: i * 2,     pairId: i, emoji, flipped: false, matched: false });
    pairs.push({ id: i * 2 + 1, pairId: i, emoji, flipped: false, matched: false });
  });
  return shuffle(pairs);
}

export function isWin(deck) {
  return deck.length > 0 && deck.every(c => c.matched);
}

export function loadBest(level) {
  try {
    const raw = localStorage.getItem(BEST_KEY(level));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function saveBest(level, record) {
  try { localStorage.setItem(BEST_KEY(level), JSON.stringify(record)); } catch {}
}
