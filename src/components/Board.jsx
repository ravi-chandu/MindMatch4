import React from "react";
import { ROWS, COLS } from "../utils/gameHelpers.js";
import HazardBadge from "./HazardBadge.jsx";
import WinOverlay from "./WinOverlay.jsx";

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
