import React from "react";
import { BLACK, GOMOKU_SIZE, WHITE, moveLabel } from "../utils/gomokuHelpers.js";

const COL_LABELS = Array.from({ length: GOMOKU_SIZE }, (_, i) =>
  String.fromCharCode(65 + i)
);

export default function GomokuBoard({
  board,
  lastMove,
  winLine,
  onMove,
  locked = false,
}) {
  const winSet = new Set(
    (winLine || []).map((s) => `${s.row}-${s.col}`)
  );

  return (
    <div className="gomoku-board-shell">
      <div className="gomoku-axis gomoku-axis-top" aria-hidden="true">
        <span />
        {COL_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>

      <div className="gomoku-grid-wrap">
        <div className="gomoku-axis gomoku-axis-side" aria-hidden="true">
          {Array.from({ length: GOMOKU_SIZE }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>

        <div
          className={`gomoku-board ${locked ? "is-locked" : ""}`}
          role="grid"
          aria-label="Gomoku board"
          aria-rowcount={GOMOKU_SIZE}
          aria-colcount={GOMOKU_SIZE}
        >
          {board.map((row, ri) =>
            row.map((cell, ci) => {
              const key = `${ri}-${ci}`;
              const isLast = lastMove?.row === ri && lastMove?.col === ci;
              const isWin = winSet.has(key);
              const canPlay = cell === 0 && !locked;

              return (
                <button
                  key={key}
                  type="button"
                  className={`gomoku-cell${isLast ? " is-last" : ""}${isWin ? " is-win" : ""}`}
                  onClick={() => canPlay && onMove({ row: ri, col: ci })}
                  disabled={!canPlay}
                  role="gridcell"
                  aria-colindex={ci + 1}
                  aria-rowindex={ri + 1}
                  aria-label={
                    cell === BLACK
                      ? `${moveLabel(ri, ci)} black stone`
                      : cell === WHITE
                      ? `${moveLabel(ri, ci)} white stone`
                      : `${moveLabel(ri, ci)} empty`
                  }
                  title={canPlay ? `Play ${moveLabel(ri, ci)}` : moveLabel(ri, ci)}
                >
                  {cell !== 0 && (
                    <span className={`gomoku-stone ${cell === BLACK ? "black" : "white"}${isWin ? " glow" : ""}`} />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
