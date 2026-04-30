/**
 * Progress system — XP, streak, per-game stats, achievements.
 * All client-side, localStorage-backed. No accounts.
 */

const KEY = "mm4_progress_v1";

const DEFAULT = {
  xp: 0,
  totalGames: 0,
  streak: 0,
  longestStreak: 0,
  lastPlayDate: null,         // YYYY-MM-DD
  freezesAvailable: 1,        // weekly freeze
  freezeWeekStart: null,
  perGame: {},                // { [gameId]: { plays, wins, bestScore, totalSec } }
  unlocked: [],               // achievement ids
  history: [],                // last 30 entries: { date, gameId, score, xp }
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return { ...DEFAULT };
  }
}

function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 86400000);
}

function weekStartStr() {
  const d = new Date();
  const day = d.getDay(); // 0 Sun
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/* ── Levels ──
 * level n requires 100 * n * (n+1) / 2 XP cumulative
 *   L1=0, L2=100, L3=300, L4=600, L5=1000 ...
 */
export function levelFromXp(xp) {
  let lvl = 1;
  while (100 * lvl * (lvl + 1) / 2 <= xp) lvl++;
  const curBase = 100 * (lvl - 1) * lvl / 2;
  const nextBase = 100 * lvl * (lvl + 1) / 2;
  return {
    level: lvl,
    xpInLevel: xp - curBase,
    xpForNext: nextBase - curBase,
    pct: Math.min(1, (xp - curBase) / (nextBase - curBase)),
  };
}

export function getProgress() {
  return load();
}

/* Touch streak whenever the user plays at least one game. */
function touchStreak(p) {
  const today = todayStr();
  const wk = weekStartStr();

  if (p.freezeWeekStart !== wk) {
    p.freezeWeekStart = wk;
    p.freezesAvailable = 1;
  }

  if (p.lastPlayDate === today) return p;

  const gap = p.lastPlayDate ? daysBetween(p.lastPlayDate, today) : null;
  if (gap === null || gap < 0) {
    p.streak = 1;
  } else if (gap === 1) {
    p.streak += 1;
  } else if (gap === 2 && p.freezesAvailable > 0) {
    p.freezesAvailable -= 1;
    p.streak += 1;
  } else {
    p.streak = 1;
  }
  p.lastPlayDate = today;
  if (p.streak > p.longestStreak) p.longestStreak = p.streak;
  return p;
}

/**
 * Record a finished game.
 * @param {string} gameId
 * @param {{won?:boolean, score?:number, durationSec?:number, difficulty?:string}} result
 * @returns {{ xpGained:number, leveledUp:boolean, newAchievements:string[], progress:object }}
 */
export function recordGame(gameId, result = {}) {
  const p = load();
  const prevLvl = levelFromXp(p.xp).level;

  touchStreak(p);
  p.totalGames += 1;

  const g = p.perGame[gameId] || { plays: 0, wins: 0, bestScore: 0, totalSec: 0 };
  g.plays += 1;
  if (result.won) g.wins += 1;
  if (typeof result.score === "number" && result.score > g.bestScore) g.bestScore = result.score;
  if (typeof result.durationSec === "number") g.totalSec += result.durationSec;
  p.perGame[gameId] = g;

  const xpGained = computeXp(gameId, result);
  p.xp += xpGained;

  p.history.unshift({
    date: todayStr(),
    gameId,
    score: result.score ?? null,
    won: !!result.won,
    xp: xpGained,
  });
  if (p.history.length > 30) p.history.length = 30;

  const newAchievements = checkAchievements(p);

  save(p);
  const newLvl = levelFromXp(p.xp).level;
  const leveledUp = newLvl > prevLvl;

  // Fire toasts (browser only)
  if (typeof window !== "undefined") {
    if (leveledUp) {
      window.dispatchEvent(new CustomEvent("mm4:toast", {
        detail: { kind: "level", emoji: "⭐", title: `Level up! Lv ${newLvl}`, body: `+${xpGained} XP` }
      }));
    }
    for (const id of newAchievements) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) window.dispatchEvent(new CustomEvent("mm4:toast", {
        detail: { kind: "ach", emoji: a.emoji, title: `Achievement: ${a.name}`, body: a.desc }
      }));
    }
    // Mascot emotional reaction
    let mood = "cheer";
    if (leveledUp || newAchievements.length > 0) mood = "celebrate";
    else if (result.won) mood = "happy";
    else if (result.won === false) mood = "sad";
    window.dispatchEvent(new CustomEvent("mm4:mascot", {
      detail: { mood, gameId, won: !!result.won, score: result.score, leveledUp }
    }));
    window.dispatchEvent(new Event("mm4:progress"));
  }

  return { xpGained, leveledUp, newLevel: newLvl, newAchievements, progress: p };
}

function computeXp(gameId, r) {
  let xp = 10;
  if (r.won) xp += 15;
  if (typeof r.score === "number") xp += Math.min(40, Math.floor(r.score / 5));
  const diffMul = { Easy: 1, Medium: 1.25, Hard: 1.5, Expert: 1.75, Pro: 2, Auto: 1.25 }[r.difficulty] || 1;
  return Math.round(xp * diffMul);
}

/* ── Achievements ── */
export const ACHIEVEMENTS = [
  { id: "first_game",    emoji: "🎮", name: "First Steps",       desc: "Play your first game",            test: p => p.totalGames >= 1 },
  { id: "streak_3",      emoji: "🔥", name: "On Fire",           desc: "3-day streak",                     test: p => p.streak >= 3 },
  { id: "streak_7",      emoji: "⚡", name: "Week Warrior",      desc: "7-day streak",                     test: p => p.streak >= 7 },
  { id: "streak_30",     emoji: "💎", name: "Diamond Mind",      desc: "30-day streak",                    test: p => p.longestStreak >= 30 },
  { id: "level_5",       emoji: "⭐", name: "Rising Star",       desc: "Reach Level 5",                    test: p => levelFromXp(p.xp).level >= 5 },
  { id: "level_10",      emoji: "🌟", name: "Brain Athlete",     desc: "Reach Level 10",                   test: p => levelFromXp(p.xp).level >= 10 },
  { id: "play_10",       emoji: "🎯", name: "Getting Going",     desc: "Play 10 games",                    test: p => p.totalGames >= 10 },
  { id: "play_50",       emoji: "🏅", name: "Half-Century",      desc: "Play 50 games",                    test: p => p.totalGames >= 50 },
  { id: "play_100",      emoji: "🏆", name: "Centurion",         desc: "Play 100 games",                   test: p => p.totalGames >= 100 },
  { id: "explore_5",     emoji: "🧭", name: "Explorer",          desc: "Try 5 different games",            test: p => Object.keys(p.perGame).length >= 5 },
  { id: "explore_all",   emoji: "🗺️", name: "Completionist",     desc: "Try every game",                   test: p => Object.keys(p.perGame).length >= 10 },
  { id: "math_50",       emoji: "🧮", name: "Math Whiz",         desc: "Score 50+ in Math Sprint",         test: p => (p.perGame.math?.bestScore ?? 0) >= 50 },
  { id: "simon_10",      emoji: "🎵", name: "Echo Master",       desc: "Reach level 10 in Simon",          test: p => (p.perGame.simon?.bestScore ?? 0) >= 10 },
  { id: "memory_perfect",emoji: "🧠", name: "Total Recall",      desc: "Win Memory Match",                 test: p => (p.perGame.memory?.wins ?? 0) >= 1 },
  { id: "stroop_30",     emoji: "🌈", name: "Color Boss",        desc: "Score 30+ in Stroop",              test: p => (p.perGame.stroop?.bestScore ?? 0) >= 30 },
  { id: "word_20",       emoji: "📖", name: "Word Smith",        desc: "Score 20+ in Word Scramble",       test: p => (p.perGame.word?.bestScore ?? 0) >= 20 },
];

function checkAchievements(p) {
  const newOnes = [];
  for (const a of ACHIEVEMENTS) {
    if (p.unlocked.includes(a.id)) continue;
    if (a.test(p)) {
      p.unlocked.push(a.id);
      newOnes.push(a.id);
    }
  }
  return newOnes;
}

export function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function resetProgress() {
  localStorage.removeItem(KEY);
}
