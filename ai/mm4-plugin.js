// ai/mm4-plugin.js
// Zero-config plugin: exposes window.MindMatchAI and optional UI hooks.
// Integrate by calling provided APIs from your existing game loop.
import * as Engine from "./engine.js"; 
import { aiMove, onGameEnd, computeHints } from "./coach.js";
import { todaySeed } from "./challenge.js";
import { getSkill } from "./rating.js";

window.MindMatchAI = {
  Engine, aiMove, onGameEnd, computeHints, todaySeed, getSkill
};

// Optional: wire default buttons if found
window.addEventListener("DOMContentLoaded", () => {
  const btnHint = document.getElementById("btnHint");
  const btnDaily = document.getElementById("btnDaily");
  const announcer = document.getElementById("announce");

  if (btnHint && window.getBoardState && window.highlightCols){
    btnHint.addEventListener("click", () => {
      const st = window.getBoardState(); // expects array[7] of columns bottom-up
      const h = computeHints(st, /*player=*/1);
      window.highlightCols(h.best);
      if (announcer) announcer.textContent = h.note + " (" + h.best.join(",") + ")";
    });
  }
  if (btnDaily && window.loadBoardState){
    btnDaily.addEventListener("click", () => {
      window.loadBoardState(todaySeed());
      if (announcer) announcer.textContent = "Daily puzzle loaded.";
    });
  }
});
