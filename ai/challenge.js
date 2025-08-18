// ai/challenge.js
import { clone } from "./engine.js";

const SEEDS = [
  [[1,-1,1],[1,-1],[1],[],[-1,1],[],[]],
  [[1,1,-1],[-1,1],[],[],[-1],[],[1]],
  [[-1,1],[1,-1,1],[],[1],[-1],[],[]]
];

export function todaySeed(){
  const d = new Date();
  const idx = (d.getFullYear()*100 + (d.getMonth()+1)*10 + d.getDate()) % SEEDS.length;
  return clone(SEEDS[idx]);
}
