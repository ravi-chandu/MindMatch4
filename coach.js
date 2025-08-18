// ai/coach.js
import { legalMoves, play, winner, bestMoveTimeboxed } from "./engine.js";
import { getSkill, paramsFor, updateSkill } from "./rating.js";

export function aiMove(board, player=-1){
  const { rating } = getSkill();
  const { timeMs, maxDepth, blunderProb } = paramsFor(rating);
  const r = bestMoveTimeboxed(board, player, timeMs, maxDepth);

  if (Math.random() < blunderProb){
    // pick among top-2/3 using shallow look
    const end = performance.now()+12;
    const scores = legalMoves(board).map(c=>{
      const child = play(board,c,player);
      const val = -bestMoveTimeboxed(child, -player, 18, 4).val; // small probe
      return {c, s: val};
    }).sort((a,b)=>b.s-a.s);
    const alt = scores[1] || scores[0];
    return alt.c;
  }
  return r.best ?? legalMoves(board)[0];
}

export function onGameEnd(outcome){
  const result = outcome==="ai_win" ? 1 : outcome==="player_win" ? 0 : 0.5;
  const newR = updateSkill(result);
  console.log("[MM4] AI target rating vs you:", newR);
}

export function computeHints(board, player){
  const moves = legalMoves(board);
  for(const c of moves){
    if (winner(play(board, c, player))===player)
      return {type:"win_now", best:[c], note:"Winning move available."};
  }
  for(const c of moves){
    if (winner(play(board, c, -player))===-player)
      return {type:"block_now", best:[c], note:"Block opponent’s win."};
  }
  const end = performance.now()+18;
  const scored = moves.map(c=>{
    const v = -bestMoveTimeboxed(play(board,c,player), -player, 24, 6).val;
    return {col:c, score:v};
  }).sort((a,b)=>b.score-a.score);
  return {type:"best_moves", best: scored.slice(0,2).map(x=>x.col), note:"Best moves by lookahead."};
}
