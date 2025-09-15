import React from "react";

export default function WinOverlay({ line }) {
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

