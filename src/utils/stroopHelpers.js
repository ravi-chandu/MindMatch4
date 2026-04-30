/**
 * Stroop Test — a word naming a color is shown in a possibly-different ink color.
 * Player must tap the INK COLOR (not the word). Trains cognitive control.
 */

export const COLORS = [
  { id: "red",    label: "Red",    hex: "#e74c3c" },
  { id: "blue",   label: "Blue",   hex: "#3498db" },
  { id: "green",  label: "Green",  hex: "#2ecc71" },
  { id: "yellow", label: "Yellow", hex: "#f1c40f" },
];

export const TIME_SEC = 45;
export const BEST_KEY = "mm4_stroop_best";
export const loadBest = () => Number(localStorage.getItem(BEST_KEY) || 0);
export const saveBest = (s) => localStorage.setItem(BEST_KEY, String(s));

export function nextTrial(prev) {
  let word, ink, attempts = 0;
  do {
    word = COLORS[Math.floor(Math.random() * COLORS.length)];
    ink  = COLORS[Math.floor(Math.random() * COLORS.length)];
    attempts++;
  } while (
    prev && (word.id === prev.word.id && ink.id === prev.ink.id) && attempts < 5
  );
  // Bias 65% conflict trials, 35% congruent — classic Stroop ratio
  if (Math.random() < 0.65 && word.id === ink.id) {
    ink = COLORS.find(c => c.id !== word.id);
  }
  return { word, ink, answer: ink.id };
}
