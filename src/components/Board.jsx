import React from "react";
import { ROWS, COLS } from "../utils/gameHelpers.js";

function HazardBadge() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", zIndex: 3, pointerEvents: "none" }}
    >
      <path d="M12 2 1 21h22L12 2z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
      <rect x="11" y="8" width="2" height="7" rx="1" fill="#111827" />
      <rect x="11" y="17" width="2" height="2" rx="1" fill="#111827" />
    </svg>
  );
}

function WinOverlay({ line }) {
  const gap = 10;
  const cell =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--cell")
    ) || 56;
  const pad = 8;
  const x = (c) => pad + c * (cell + gap) + cell / 2;
  const y = (r) => pad + r * (cell + gap) + cell / 2;
  const first = { X: x(line[0].c), Y: y(line[0].r) };
  const last = { X: x(line[3].c), Y: y(line[3].r) };
  return (
    <div className="win-overlay" aria-hidden="true">
      <svg>
        <line
          x1={first.X}
          y1={first.Y}
          x2={last.X}
          y2={last.Y}
          stroke="gold"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function Board({
  board,
  focusCol,
  setFocusCol,
  cautionCols,
  winLine,
  onDrop,
  boardRef,
}) {
  return (
    <div className="board-wrap">
      <div
        className="board"
        role="grid"
        aria-label="Connect Four"
        aria-rowcount={ROWS}
        aria-colcount={COLS}
        tabIndex={0}
        ref={boardRef}
      >
        {Array.from({ length: COLS }).map((_, c) => {
          const isFocused = focusCol === c;
          const caution = cautionCols.includes(c);
          return (
            <div
              key={c}
              className={`col ${isFocused ? "kbd-focus" : ""} ${caution ? "edge-caution" : ""}`}
              data-col={c}
              role="columnheader"
              aria-colindex={c + 1}
              onMouseEnter={() => setFocusCol(c)}
              onClick={() => onDrop(c)}
              title={
                caution ? "Careful: edge here can enable opponent reply" : ""
              }
              style={{
                position: "relative",
                ...(isFocused
                  ? {
                      outline: "2px solid var(--blue)",
                      outlineOffset: "2px",
                      borderRadius: 12,
                    }
                  : null),
              }}
            >
              {caution && <HazardBadge />}
              {Array.from({ length: ROWS }).map((_, rr) => {
                const r = ROWS - 1 - rr;
                const v = board[c][r] ?? 0;
                const fill = v === 1 ? "yellow" : v === -1 ? "red" : "empty";
                return (
                  <div
                    key={r}
                    className={`cell ${fill}`}
                    data-col={c}
                    data-row={rr}
                    data-val={v}
                    role="gridcell"
                    aria-colindex={c + 1}
                    aria-rowindex={rr + 1}
                    aria-label={
                      v === 1 ? "Yellow" : v === -1 ? "Red" : "Empty"
                    }
                    style={{ position: "relative", zIndex: 1 }}
                  >
                    {v !== 0 && <span className={`disc ${fill}`} />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {!!winLine && <WinOverlay line={winLine} />}
    </div>
  );
}
