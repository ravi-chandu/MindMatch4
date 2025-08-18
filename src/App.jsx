import React, { useEffect, useMemo, useState } from "react";
import { winner as evalWinner } from "../ai/engine.js";

const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);

function clampCol(c){ return Math.max(0, Math.min(COLS-1, c)); }

export default function App(){
  const [board, setBoard] = useState(()=> emptyBoard());
  const [turn, setTurn] = useState(1); // 1 = player (Yellow), -1 = AI (Red)
  const [message, setMessage] = useState("Your move (Yellow)");

  // mirror to window for adapter / AI
  useEffect(()=>{
    window.board = board;
    window.turn = turn;
    window.getBoardState = () => board;
    window.renderBoard = (b) => { setBoard(b); };
    window.dropPiece = (col) => {
      col = clampCol(col);
      // disallow full column
      if ((board[col]?.length ?? 0) >= ROWS) return false;

      // compute next board
      const next = board.map(c => c.slice());
      next[col] = (next[col] || []).concat(turn);

      // update now
      setBoard(next);

      // outcome?
      const w = evalWinner(next);
      if (w === 1){ setMessage("You win!"); window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome:"player_win"}})); return true; }
      if (w === -1){ setMessage("AI wins!"); window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome:"ai_win"}})); return true; }
      if (w === 2){ setMessage("Draw"); window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome:"draw"}})); return true; }

      // toggle turn + notify AI if it's their turn
      const nextTurn = -turn;
      setTurn(nextTurn);
      if (nextTurn === -1){
        window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}}));
      }
      return true;
    };
  }, [board, turn]);

  // simple header text
  useEffect(()=>{
    setMessage(turn===1 ? "Your move (Yellow)" : "AI is thinking…");
  }, [turn]);

  // reset helper (optional)
  function reset(){
    const fresh = emptyBoard();
    setBoard(fresh);
    setTurn(1);
    setMessage("Your move (Yellow)");
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">MindMatch 4</h1>
        <button className="reset" onClick={reset}>Reset</button>
      </header>

      <Board board={board} onDrop={(c)=> turn===1 && window.dropPiece(c)} />

      <p className="status" role="status" aria-live="polite">{message}</p>
    </div>
  );
}

function Board({ board, onDrop }){
  // render holes + discs; each cell carries data attributes for the adapter
  const cols = board;

  return (
    <div className="board" role="grid" aria-label="Connect Four">
      {Array.from({length: COLS}).map((_, c) => (
        <div key={c} className="col" data-col={c} onClick={()=>onDrop?.(c)}>
          {Array.from({length: ROWS}).map((_, rr) => {
            const r = ROWS-1-rr;       // visual row (top→bottom)
            const v = cols[c][r] ?? 0; // 0 empty, 1 player, -1 AI
            const fill = v===1 ? "yellow" : v===-1 ? "red" : "empty";
            return (
              <div
                key={r}
                className={`cell ${fill}`}
                data-col={c}
                data-row={rr}
                data-val={v}
                aria-label={`Row ${rr+1}, Column ${c+1}`}
              >
                {v!==0 && <span className={`disc ${fill}`} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
