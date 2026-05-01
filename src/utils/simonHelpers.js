/* ════════════════════════════════════════════════════
   Simon Says — sequence memory game.
   Pure logic helpers (no React).
   ════════════════════════════════════════════════════ */

export const PADS = [
  { id: 0, color: "#10b981", label: "green",  freq: 329.63 }, // E4
  { id: 1, color: "#ef4444", label: "red",    freq: 261.63 }, // C4
  { id: 2, color: "#f59e0b", label: "yellow", freq: 392.00 }, // G4
  { id: 3, color: "#3b82f6", label: "blue",   freq: 523.25 }, // C5
];

export const BEST_KEY = "mm4_simon_best";

/** Generate a fresh sequence of given length using random pad ids. */
export function makeSequence(length) {
  const out = [];
  for (let i = 0; i < length; i++) out.push(Math.floor(Math.random() * PADS.length));
  return out;
}

/** Append one random step to an existing sequence. */
export function nextStep(seq) {
  return seq.concat(Math.floor(Math.random() * PADS.length));
}

/** Speed table: ms per pad highlight by sequence length. */
export function stepDuration(level) {
  if (level <= 5)  return 600;
  if (level <= 10) return 480;
  if (level <= 15) return 360;
  if (level <= 20) return 280;
  return 220;
}

export function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch { return 0; }
}
export function saveBest(score) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
}
