// ai/rating.js
const DEFAULT = { rating: 1200, games: 0 };
export function getSkill(){
  try {
    return JSON.parse(localStorage.getItem("mm4_skill") || JSON.stringify(DEFAULT));
  } catch (e) {
    return DEFAULT;
  }
}
export function saveSkill(s){
  try {
    localStorage.setItem("mm4_skill", JSON.stringify(s));
  } catch (e) {
    // ignore
  }
}

// result: 1=AI wins, 0=AI loses, 0.5=draw
export function updateSkill(result){
  const s = getSkill();
  const expected = 1/(1+Math.pow(10, (1300 - s.rating)/400)); // target ~1300
  const K = 16;
  s.rating = Math.round(s.rating + K * (result - expected));
  s.games++;
  saveSkill(s);
  return s.rating;
}

export function paramsFor(r){
  const time = Math.max(80, Math.min(900, Math.round((r-900)*0.9)));
  const depthCap = r>1400 ? 14 : r>1250 ? 12 : r>1100 ? 10 : 8;
  const blunderProb = r<1100 ? 0.18 : r<1200 ? 0.10 : r<1300 ? 0.05 : 0.0;
  return { timeMs: time, maxDepth: depthCap, blunderProb };
}
