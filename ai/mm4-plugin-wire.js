// ai/mm4-plugin-wire.js
import * as Engine from "./engine.js";
import { aiMove, onGameEnd, computeHints } from "./coach.js";
import { todaySeed } from "./challenge.js";

function currentOutcome(){
  const b = window.getBoardState();
  const w = Engine.winner(b);
  if (w===1) return "player_win";
  if (w===-1) return "ai_win";
  if (w===2) return "draw";
  return null;
}

function maybeFinish(){
  const o = currentOutcome();
  if (o){
    onGameEnd(o);
    window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome:o}}));
    const an = document.getElementById("announce");
    if (an) an.textContent = (o==="player_win"?"You win!":o==="ai_win"?"AI wins!":"Draw.");
    return true;
  }
  return false;
}

function aiTurn(){
  const move = aiMove(window.getBoardState(), -1);
  if (move!=null){
    window.applyMove(move);
    window.dispatchEvent(new CustomEvent("mm4:aimove",{detail:{col:move}}));
  }
  maybeFinish();
}

window.addEventListener("DOMContentLoaded", () => {
  const btnHint = document.getElementById("btnHint");
  const btnDaily = document.getElementById("btnDaily");
  const announcer = document.getElementById("announce");

  if (btnHint){
    btnHint.addEventListener("click", () => {
      const st = window.getBoardState();
      const h = computeHints(st, 1);
      window.highlightCols(h.best);
      if (announcer) announcer.textContent = h.note + " ("+h.best.join(",")+")";
      window.dispatchEvent(new CustomEvent("mm4:hint",{detail:h}));
    });
  }
  if (btnDaily){
    btnDaily.addEventListener("click", () => {
      window.loadBoardState(todaySeed());
      if (announcer) announcer.textContent = "Daily puzzle loaded.";
      window.dispatchEvent(new Event("mm4:daily"));
    });
  }
  if (window.turn === -1 || document.body.dataset.turn === "ai"){
    setTimeout(aiTurn, 0);
  }
});
