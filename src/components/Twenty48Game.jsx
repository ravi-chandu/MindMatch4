import React, { useEffect, useRef, useState, useCallback } from "react";
import { SND } from "../utils/gameHelpers.js";
import { recordGame } from "../utils/progress.js";
import {
  SIZE, WIN_TILE,
  newBoard, slide, loadBest, saveBest, maxTile,
} from "../utils/twentyHelpers.js";

const TILE_COLORS = {
  2:    { bg: "#eee4da", fg: "#776e65" },
  4:    { bg: "#ede0c8", fg: "#776e65" },
  8:    { bg: "#f2b179", fg: "#fff" },
  16:   { bg: "#f59563", fg: "#fff" },
  32:   { bg: "#f67c5f", fg: "#fff" },
  64:   { bg: "#f65e3b", fg: "#fff" },
  128:  { bg: "#edcf72", fg: "#fff" },
  256:  { bg: "#edcc61", fg: "#fff" },
  512:  { bg: "#edc850", fg: "#fff" },
  1024: { bg: "#edc53f", fg: "#fff" },
  2048: { bg: "#edc22e", fg: "#fff" },
};
const HIGH = { bg: "#3c3a32", fg: "#fff" };

function tileStyle(value) {
  const c = TILE_COLORS[value] || HIGH;
  // Smaller font for huge numbers so they fit on mobile.
  let fontSize = "clamp(1.4rem, 5.5vw, 2.4rem)";
  if (value >= 1024) fontSize = "clamp(1.05rem, 4.2vw, 1.9rem)";
  else if (value >= 128) fontSize = "clamp(1.2rem, 5vw, 2.1rem)";
  return { background: c.bg, color: c.fg, fontSize };
}

export default function Twenty48Game({ onBack }) {
  const [state, setState] = useState(newBoard);
  const [best, setBest] = useState(loadBest);
  const [popGain, setPopGain] = useState(null); // last gained score for animation
  const [continued, setContinued] = useState(false); // keep playing after 2048
  const touchRef = useRef(null);
  const recordedRef = useRef(false);

  // Record to progress system once when game ends (win or over)
  useEffect(() => {
    if (recordedRef.current) return;
    if (state.won || state.over) {
      recordedRef.current = true;
      recordGame("twenty48", { won: !!state.won, score: state.score, durationSec: 0 });
    }
  }, [state.won, state.over, state.score]);

  // Persist best score
  useEffect(() => {
    if (state.score > best) {
      setBest(state.score);
      saveBest(state.score);
    }
  }, [state.score, best]);

  // Score-pop animation reset
  useEffect(() => {
    if (state.lastGain && state.lastGain > 0) {
      setPopGain({ amt: state.lastGain, key: state.moves });
      const id = setTimeout(() => setPopGain(null), 600);
      return () => clearTimeout(id);
    }
  }, [state.lastGain, state.moves]);

  const move = useCallback((dir) => {
    setState(prev => {
      const next = slide(prev, dir);
      if (next === prev) return prev;
      // Sound cues
      if (next.lastMerges > 0) SND.click();
      else SND.tick();
      if (!prev.won && next.won) SND.win();
      if (next.over) setTimeout(() => SND.lose(), 200);
      return next;
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handler = (e) => {
      const map = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    addEventListener("keydown", handler, { passive: false });
    return () => removeEventListener("keydown", handler);
  }, [move]);

  // Touch / swipe controls
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 24) return; // ignore taps
    if (adx > ady) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
    touchRef.current = null;
  };

  function reset() {
    SND.select();
    setState(newBoard());
    setContinued(false);
    recordedRef.current = false;
  }

  const showWinModal = state.won && !continued;
  const showOverModal = state.over;

  return (
    <div className="t48-page">
      {/* ── Top bar ── */}
      <header className="t48-topbar">
        <div className="t48-topbar-left">
          <button className="gk-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="t48-title">2048</h1>
          <span className="gk-badge">Best: {best}</span>
        </div>
        <div className="t48-scores">
          <div className="t48-score-box">
            <div className="t48-score-label">SCORE</div>
            <div className="t48-score-val">
              {state.score}
              {popGain && <span key={popGain.key} className="t48-score-pop">+{popGain.amt}</span>}
            </div>
          </div>
          <div className="t48-score-box">
            <div className="t48-score-label">MOVES</div>
            <div className="t48-score-val">{state.moves}</div>
          </div>
        </div>
        <div className="t48-topbar-right">
          <button className="gk-icon-btn" onClick={reset} title="New game">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      <p className="t48-status" role="status" aria-live="polite">
        {state.over
          ? "No moves left — Game Over!"
          : state.won
            ? continued ? "Keep pushing — beat your high score!" : "🏆 You reached 2048!"
            : "Swipe or use Arrow keys to merge tiles. Reach 2048!"}
      </p>

      {/* ── Board ── */}
      <div
        className="t48-board"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="t48-grid-bg">
          {Array.from({ length: SIZE * SIZE }).map((_, i) => (
            <div key={i} className="t48-cell" />
          ))}
        </div>
        <div className="t48-tiles">
          {state.tiles.map(t => (
            <div
              key={t.id}
              className={`t48-tile t48-pos-${t.r}-${t.c}${t.isNew ? " t48-tile-new" : ""}${t.value >= WIN_TILE ? " t48-tile-win" : ""}`}
              style={tileStyle(t.value)}
            >
              {t.value}
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile arrow pad ── */}
      <div className="t48-pad" aria-hidden="true">
        <button className="t48-pad-btn" onClick={() => move("up")} aria-label="Up">▲</button>
        <div className="t48-pad-row">
          <button className="t48-pad-btn" onClick={() => move("left")} aria-label="Left">◀</button>
          <button className="t48-pad-btn" onClick={() => move("down")} aria-label="Down">▼</button>
          <button className="t48-pad-btn" onClick={() => move("right")} aria-label="Right">▶</button>
        </div>
      </div>

      <div className="t48-tip">
        Highest tile: <strong>{maxTile(state.grid)}</strong> · Tap arrows or swipe on mobile · Arrow keys on desktop.
      </div>

      {/* ── Modals ── */}
      {showWinModal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="dialog dialog-win">
            <div className="dialog-emoji">🏆</div>
            <h2 className="dialog-title">2048 reached!</h2>
            <p className="dialog-talk">
              You hit the legendary tile in {state.moves} moves with a score of {state.score}. Keep going for a higher tile?
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={() => setContinued(true)}>Keep Playing</button>
              <button onClick={reset}>New Game</button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}

      {showOverModal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="dialog">
            <div className="dialog-emoji">😵</div>
            <h2 className="dialog-title">Game Over</h2>
            <p className="dialog-talk">
              Final score: <strong>{state.score}</strong> · Best: <strong>{best}</strong> · Moves: {state.moves}
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={reset}>Try Again</button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
