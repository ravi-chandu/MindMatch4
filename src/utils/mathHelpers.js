/* ════════════════════════════════════════════════════
   Math Sprint — timed arithmetic challenges.
   Pure logic helpers (no React).
   ════════════════════════════════════════════════════ */

export const LEVELS = {
  Tiny:   { ops: ["+"],            max: 5,   time: 60, label: "Ages 4–5 · counting" },
  Easy:   { ops: ["+", "-"],       max: 10,  time: 60, label: "Ages 6–7 · add/sub to 10" },
  Medium: { ops: ["+", "-"],       max: 20,  time: 60, label: "Ages 8–9 · add/sub to 20" },
  Hard:   { ops: ["+", "-", "×"],  max: 12,  time: 60, label: "Ages 10–12 · times tables" },
  Pro:    { ops: ["+", "-", "×", "÷"], max: 15, time: 60, label: "Ages 13+ · all operations" },
};

export const BEST_KEY = (level) => `mm4_math_best_${level}`;

const rnd = (n) => Math.floor(Math.random() * n);

/** Generate one problem appropriate to level. */
export function newProblem(level = "Medium") {
  const cfg = LEVELS[level] || LEVELS.Medium;
  const op = cfg.ops[rnd(cfg.ops.length)];
  let a, b, answer, text;
  switch (op) {
    case "+": {
      a = rnd(cfg.max + 1); b = rnd(cfg.max + 1);
      answer = a + b; text = `${a} + ${b}`;
      break;
    }
    case "-": {
      a = rnd(cfg.max + 1); b = rnd(a + 1); // never negative
      answer = a - b; text = `${a} − ${b}`;
      break;
    }
    case "×": {
      a = rnd(cfg.max + 1); b = rnd(cfg.max + 1);
      answer = a * b; text = `${a} × ${b}`;
      break;
    }
    case "÷": {
      // Build clean division: pick answer + divisor, then dividend.
      const div = 1 + rnd(cfg.max);
      answer = rnd(cfg.max + 1);
      a = answer * div; b = div;
      text = `${a} ÷ ${b}`;
      break;
    }
    default: {
      a = 1; b = 1; answer = 2; text = `1 + 1`;
    }
  }
  return { a, b, op, answer, text };
}

/** Generate 4 multiple-choice options including the correct answer. */
export function makeChoices(answer, level = "Medium") {
  const cfg = LEVELS[level] || LEVELS.Medium;
  const set = new Set([answer]);
  const range = Math.max(6, cfg.max);
  while (set.size < 4) {
    // distractors close to the answer for realism
    const delta = (rnd(range * 2) - range) || 1;
    const v = Math.max(0, answer + delta);
    if (v !== answer) set.add(v);
  }
  // Shuffle
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
