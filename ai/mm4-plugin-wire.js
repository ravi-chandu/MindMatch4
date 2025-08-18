import * as Engine from "./engine.js";
import { aiMove, onGameEnd, computeHints } from "./coach.js";
import { todaySeed } from "./challenge.js";

function outcome(){
  const b = window.getBoardState?.();
  const w = Engine.winner(b);
  if (w===1) return "player_win";
  if (w===-1) return "ai_win";
  if (w===2) return "draw";
  return null;
}

function aiTurn(){
  if (window.mm4Mode !== "ai") return;
  const b = window.getBoardState?.();
  if (!b) return;
  const move = aiMove(b, -1);
  if (move != null){
    window.applyMove?.(move);
    window.dispatchEvent(new CustomEvent("mm4:aimove",{detail:{col:move}}));
  }
  const o = outcome();
  if (o){ onGameEnd(o); }
  else { window.turn = 1; window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:1}})); }
}

window.addEventListener("DOMContentLoaded", () => {
  const btnHint = document.getElementById("btnHint");
  const btnDaily = document.getElementById("btnDaily");
  const announcer = document.getElementById("announce");

  if (btnHint){
    btnHint.addEventListener("click", () => {
      const st = window.getBoardState?.();
      const h = computeHints(st, 1);
      window.highlightCols?.(h.best);
      if (announcer) announcer.textContent = h.note + " ("+h.best.join(",")+")";
      window.dispatchEvent(new CustomEvent("mm4:hint",{detail:h}));
    });
  }
  if (btnDaily){
    btnDaily.addEventListener("click", () => {
      window.loadBoardState?.(todaySeed());
      if (announcer) announcer.textContent = "Daily puzzle loaded.";
      window.dispatchEvent(new Event("mm4:daily"));
      window.turn = 1;
    });
  }
});

window.addEventListener("mm4:turn", (e)=>{
  if (e.detail?.turn === -1) setTimeout(aiTurn, 0);
});
