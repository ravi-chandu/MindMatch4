import React, { useEffect, useState } from "react";

export default function WinOverlay({ line }) {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!line || line.length < 4) return;
    // Measure actual cell positions from the rendered DOM
    const first = document.querySelector(
      `.cell[data-col="${line[0].c}"][data-row="${line[0].r}"]`
    );
    const last = document.querySelector(
      `.cell[data-col="${line[3].c}"][data-row="${line[3].r}"]`
    );
    const wrap = document.querySelector(".board-wrap");
    if (!first || !last || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    const fr = first.getBoundingClientRect();
    const lr = last.getBoundingClientRect();
    setCoords({
      x1: fr.left - wr.left + fr.width / 2,
      y1: fr.top - wr.top + fr.height / 2,
      x2: lr.left - wr.left + lr.width / 2,
      y2: lr.top - wr.top + lr.height / 2,
    });
  }, [line]);

  if (!coords) return null;
  return (
    <svg className="win-line" aria-hidden="true">
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke="url(#winGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        className="win-line-anim"
      />
      <defs>
        <linearGradient id="winGrad">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

