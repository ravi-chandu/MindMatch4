import React from "react";
import {
  BS_SIZE,
  WATER,
  SHIP,
  HIT,
  MISS,
  SUNK,
  cellLabel,
} from "../utils/battleshipHelpers.js";

const COL_LABELS = Array.from({ length: BS_SIZE }, (_, i) =>
  String.fromCharCode(65 + i)
);

/**
 * mode: "fleet" | "attack" | "setup"
 * ghostCells: [{ row, col }] – preview cells during setup
 * ghostValid: boolean – whether ghost placement is valid
 */
export default function BattleshipBoard({
  grid,
  registry,
  mode = "attack",
  onCellClick,
  onCellHover,
  ghostCells = [],
  ghostValid = true,
  lastShot = null,
  locked = false,
  label = "",
}) {
  const ghostSet = new Set(ghostCells.map((c) => `${c.row}-${c.col}`));

  function cellClass(row, col) {
    const v = grid[row][col];
    const classes = ["bs-cell"];

    if (v === HIT) classes.push("bs-hit");
    else if (v === MISS) classes.push("bs-miss");
    else if (v === SUNK) classes.push("bs-sunk");
    else if (v === SHIP && mode !== "attack") classes.push("bs-ship");

    if (ghostSet.has(`${row}-${col}`)) {
      classes.push(ghostValid ? "bs-ghost-valid" : "bs-ghost-invalid");
    }

    if (lastShot && lastShot.row === row && lastShot.col === col) {
      classes.push("bs-last-shot");
    }

    if (mode === "attack" && v === WATER && !locked) classes.push("bs-targetable");

    return classes.join(" ");
  }

  function cellContent(row, col) {
    const v = grid[row][col];
    if (v === HIT) return <span className="bs-marker bs-marker-hit">🔥</span>;
    if (v === MISS) return <span className="bs-marker bs-marker-miss">•</span>;
    if (v === SUNK) return <span className="bs-marker bs-marker-sunk">✕</span>;
    if (v === SHIP && mode !== "attack") return <span className="bs-ship-fill" />;
    return null;
  }

  return (
    <div className="bs-board-shell">
      {label && <div className="bs-board-label">{label}</div>}

      <div className="bs-axis bs-axis-top" aria-hidden="true">
        <span />
        {COL_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>

      <div className="bs-grid-wrap">
        <div className="bs-axis bs-axis-side" aria-hidden="true">
          {Array.from({ length: BS_SIZE }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>

        <div
          className={`bs-board ${locked ? "is-locked" : ""} bs-board-${mode}`}
          role="grid"
          aria-label={`Battleship ${label || mode} board`}
          aria-rowcount={BS_SIZE}
          aria-colcount={BS_SIZE}
        >
          {Array.from({ length: BS_SIZE }, (_, row) =>
            Array.from({ length: BS_SIZE }, (_, col) => {
              const key = `${row}-${col}`;
              return (
                <button
                  key={key}
                  type="button"
                  className={cellClass(row, col)}
                  onClick={() => onCellClick?.({ row, col })}
                  onMouseEnter={() => onCellHover?.({ row, col })}
                  onMouseLeave={() => onCellHover?.(null)}
                  disabled={locked && mode === "attack"}
                  role="gridcell"
                  aria-colindex={col + 1}
                  aria-rowindex={row + 1}
                  aria-label={cellLabel(row, col)}
                  title={cellLabel(row, col)}
                >
                  {cellContent(row, col)}
                  {lastShot && lastShot.row === row && lastShot.col === col && (
                    <span
                      className={`bs-missile ${
                        grid[row][col] === HIT || grid[row][col] === SUNK
                          ? "bs-missile-hit"
                          : "bs-missile-miss"
                      }`}
                      key={`m-${row}-${col}`}
                    >
                      <span className="bs-missile-trail" />
                      <span className="bs-missile-body" />
                      <span className="bs-missile-impact" />
                    </span>
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
