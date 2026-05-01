/* ════════════════════════════════════════════════════
   Game Catalog — single source of truth.
   Every game has: ages, skills, category, accessibility tags.
   ════════════════════════════════════════════════════ */

export const AGE_GROUPS = [
  { id: "all",    label: "All Ages",   range: [1, 99], emoji: "🌍" },
  { id: "tots",   label: "Tots 1–3",   range: [1, 3],  emoji: "🍼" },
  { id: "kids",   label: "Kids 4–7",   range: [4, 7],  emoji: "🧒" },
  { id: "tweens", label: "Tweens 8–12", range: [8, 12], emoji: "🎒" },
  { id: "teens",  label: "Teens 13–17", range: [13, 17], emoji: "🎧" },
  { id: "adults", label: "Adults 18–59", range: [18, 59], emoji: "👤" },
  { id: "seniors",label: "Seniors 60+",  range: [60, 99], emoji: "🌿" },
];

export const SKILL_ICONS = {
  memory:    { label: "Memory",    emoji: "💭", color: "#a78bfa" },
  logic:     { label: "Logic",     emoji: "🧩", color: "#22d3ee" },
  math:      { label: "Math",      emoji: "🧮", color: "#10b981" },
  words:     { label: "Words",     emoji: "📝", color: "#f59e0b" },
  focus:     { label: "Focus",     emoji: "🎯", color: "#ef4444" },
  strategy:  { label: "Strategy",  emoji: "♟",  color: "#3b82f6" },
  reflexes:  { label: "Reflexes",  emoji: "⚡", color: "#fbbf24" },
  spatial:   { label: "Spatial",   emoji: "🔷", color: "#06b6d4" },
};

export const CATEGORIES = [
  { id: "all",      label: "All Games",   emoji: "✨" },
  { id: "memory",   label: "Memory",      emoji: "💭" },
  { id: "logic",    label: "Logic & Puzzle", emoji: "🧩" },
  { id: "math",     label: "Math",        emoji: "🧮" },
  { id: "focus",    label: "Focus & Reflex", emoji: "⚡" },
  { id: "strategy", label: "Strategy",    emoji: "♟" },
  { id: "twoplayer",label: "2-Player",    emoji: "👥" },
];

/** Master game list. Add new games here — UI will auto-pick them up. */
export const GAMES = [
  {
    id: "simon",
    name: "Simon Says",
    icon: "🎵",
    tagline: "Watch, listen, repeat. How long can you remember?",
    ages: [3, 99],
    bestFor: [4, 12],
    skills: ["memory", "focus"],
    categories: ["memory", "focus"],
    twoPlayer: false,
    kidFriendly: true,
    nonReader: true, // playable without reading
  },
  {
    id: "math",
    name: "Math Sprint",
    icon: "🧮",
    tagline: "Solve as many problems as you can in 60 seconds!",
    ages: [5, 99],
    bestFor: [6, 14],
    skills: ["math", "focus"],
    categories: ["math", "focus"],
    twoPlayer: false,
    kidFriendly: true,
    nonReader: false,
  },
  {
    id: "memory",
    name: "Memory Match",
    icon: "🧠",
    tagline: "Flip cards and match every pair.",
    ages: [3, 99],
    bestFor: [4, 70],
    skills: ["memory", "focus"],
    categories: ["memory", "focus", "twoplayer"],
    twoPlayer: true,
    kidFriendly: true,
    nonReader: true,
  },
  {
    id: "twenty48",
    name: "2048",
    icon: "🔢",
    tagline: "Swipe and merge. Reach the legendary 2048 tile!",
    ages: [8, 99],
    bestFor: [10, 60],
    skills: ["math", "logic", "strategy"],
    categories: ["math", "logic"],
    twoPlayer: false,
    kidFriendly: false,
    nonReader: false,
  },
  {
    id: "connect4",
    name: "Connect Four",
    icon: "⚡",
    tagline: "Drop discs in an epic 4-in-a-row battle!",
    ages: [6, 99],
    bestFor: [7, 60],
    skills: ["strategy", "logic"],
    categories: ["strategy", "logic", "twoplayer"],
    twoPlayer: true,
    kidFriendly: true,
    nonReader: true,
  },
  {
    id: "gomoku",
    name: "Gomoku",
    icon: "🏯",
    tagline: "Five in a row! Conquer the board with strategy.",
    ages: [7, 99],
    bestFor: [10, 70],
    skills: ["strategy", "logic"],
    categories: ["strategy", "logic", "twoplayer"],
    twoPlayer: true,
    kidFriendly: false,
    nonReader: true,
  },
  {
    id: "reversi",
    name: "Reversi",
    icon: "🌀",
    tagline: "Flip the tide! Master the board.",
    ages: [8, 99],
    bestFor: [10, 70],
    skills: ["strategy", "logic"],
    categories: ["strategy", "logic", "twoplayer"],
    twoPlayer: true,
    kidFriendly: false,
    nonReader: true,
  },
  {
    id: "battleship",
    name: "Battleship",
    icon: "💥",
    tagline: "Command your fleet! Hunt the enemy armada.",
    ages: [8, 99],
    bestFor: [10, 60],
    skills: ["strategy", "logic", "focus"],
    categories: ["strategy", "logic", "twoplayer"],
    twoPlayer: true,
    kidFriendly: false,
    nonReader: false,
  },
  {
    id: "word",
    name: "Word Scramble",
    icon: "📖",
    tagline: "Unscramble letters before time runs out.",
    ages: [6, 99],
    bestFor: [7, 80],
    skills: ["words", "focus"],
    categories: ["focus"],
    twoPlayer: false,
    kidFriendly: true,
    nonReader: false,
  },
  {
    id: "stroop",
    name: "Stroop Test",
    icon: "🌈",
    tagline: "Tap the ink color — ignore the word!",
    ages: [7, 99],
    bestFor: [8, 80],
    skills: ["focus", "reflexes"],
    categories: ["focus"],
    twoPlayer: false,
    kidFriendly: true,
    nonReader: false,
  },
];

/** Filter helpers */
export function filterGames({ ageGroup = "all", category = "all", query = "" } = {}) {
  const q = query.trim().toLowerCase();
  return GAMES.filter(g => {
    if (category !== "all" && !g.categories.includes(category)) return false;
    if (ageGroup !== "all") {
      const grp = AGE_GROUPS.find(a => a.id === ageGroup);
      if (grp) {
        const [aMin, aMax] = grp.range;
        const [gMin, gMax] = g.ages;
        // Game must overlap the age window
        if (gMax < aMin || gMin > aMax) return false;
      }
    }
    if (q) {
      const hay = `${g.name} ${g.tagline} ${g.skills.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Quick lookup */
export function getGame(id) {
  return GAMES.find(g => g.id === id);
}
