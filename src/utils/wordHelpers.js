/**
 * Word Scramble — pick a random word from age-appropriate list,
 * shuffle letters, player rearranges back. 60s sprint.
 */

const WORDS_EASY = [
  "CAT","DOG","SUN","CAR","BAT","HAT","RUN","JUMP","BOOK","FISH",
  "TREE","STAR","BIRD","FROG","BALL","CAKE","LION","DUCK","MILK","RICE",
  "BLUE","RED","GREEN","SHIP","BOAT","HAND","FOOT","HEAD","NOSE","EYE",
];
const WORDS_MED = [
  "PLANET","ROCKET","BRIDGE","CANDLE","FOREST","GARDEN","HAMMER","ISLAND",
  "JUNGLE","KITTEN","LANTERN","MARKET","NEEDLE","OCTOPUS","PUZZLE","RABBIT",
  "SUNSET","TIGER","VALLEY","WINDOW","ANCHOR","BUTTON","CIRCUS","DRAGON",
];
const WORDS_HARD = [
  "AVALANCHE","BUTTERFLY","CHEMISTRY","DICTIONARY","EXPERIMENT","FESTIVAL",
  "GRADIENT","HARMONICA","IMAGINATION","JOURNALIST","KALEIDOSCOPE","LIBRARY",
  "MUSEUM","NEIGHBOR","OBSERVE","PARADISE","QUARTERLY","RADIANT","SCULPTURE",
  "TRIANGLE","UNIVERSE","VOLCANO","WHISPER","XYLOPHONE","YESTERDAY","ZEPPELIN",
];

export const WORD_LEVELS = {
  Easy:   { label: "Easy",   pool: WORDS_EASY, time: 60 },
  Medium: { label: "Medium", pool: WORDS_MED,  time: 60 },
  Hard:   { label: "Hard",   pool: WORDS_HARD, time: 75 },
};

export const BEST_KEY = (lvl) => `mm4_word_best_${lvl}`;
export const loadBest = (lvl) => Number(localStorage.getItem(BEST_KEY(lvl)) || 0);
export const saveBest = (lvl, score) => localStorage.setItem(BEST_KEY(lvl), String(score));

export function pickWord(level, recent = []) {
  const pool = (WORD_LEVELS[level] || WORD_LEVELS.Medium).pool;
  let candidates = pool.filter(w => !recent.includes(w));
  if (candidates.length === 0) candidates = pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function scramble(word) {
  const arr = word.split("");
  let attempts = 0;
  let out;
  do {
    out = [...arr].sort(() => Math.random() - 0.5);
    attempts++;
  } while (out.join("") === word && attempts < 10);
  return out;
}
