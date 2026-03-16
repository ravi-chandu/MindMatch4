import React from "react";
import { BLACK, REVERSI_SIZE, WHITE, moveLabel } from "../utils/reversiHelpers.js";

const COL_LABELS = Array.from({ length: REVERSI_SIZE }, (_, index) =>
  String.fromCharCode(65 + index)
);

export default function ReversiBoard({
  board,
  validMoves,
  lastMove,
  onMove,
  locked = false,
}) {
  const moveMap = new Map(validMoves.map((move) => [`${move.row}-${move.col}`, move]));

  return (
    <div className="reversi-board-shell">
      <div className="reversi-axis reversi-axis-top" aria-hidden="true">
        <span />
        {COL_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="reversi-grid-wrap">
        <div className="reversi-axis reversi-axis-side" aria-hidden="true">
          {Array.from({ length: REVERSI_SIZE }, (_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>

        <div
          className={`reversi-board ${locked ? "is-locked" : ""}`}
          role="grid"
          aria-label="Reversi board"
          aria-rowcount={REVERSI_SIZE}
          aria-colcount={REVERSI_SIZE}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const move = moveMap.get(key);
              const isLast = lastMove?.row === rowIndex && lastMove?.col === colIndex;

              return (
                <button
                  key={key}
                  type="button"
                  className={`reversi-square ${isLast ? "is-last" : ""}`}
                  onClick={() => move && onMove(move)}
                  disabled={!move || locked}
                  role="gridcell"
                  aria-colindex={colIndex + 1}
                  aria-rowindex={rowIndex + 1}
                  aria-label={
                    cell === BLACK
                      ? `${moveLabel(rowIndex, colIndex)} black disc`
                      : cell === WHITE
                      ? `${moveLabel(rowIndex, colIndex)} white disc`
                      : move
                      ? `${moveLabel(rowIndex, colIndex)} valid move`
                      : `${moveLabel(rowIndex, colIndex)} empty`
                  }
                  title={move ? `Play ${moveLabel(rowIndex, colIndex)}` : moveLabel(rowIndex, colIndex)}
                >
                  {cell !== 0 && (
                    <span
                      className={`reversi-disc ${cell === BLACK ? "black" : "white"}`}
                    />
                  )}
                  {cell === 0 && move && <span className="reversi-marker" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
