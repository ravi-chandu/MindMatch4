import React, { useEffect, useMemo, useRef, useState } from "react";
import { SND } from "../utils/gameHelpers.js";
import { recordGame } from "../utils/progress.js";
import {
  DECKS, createDeck, isWin, loadBest, saveBest,
} from "../utils/memoryHelpers.js";

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MemoryGame({
  difficulty = "Medium",
  mode = "solo",
  onBack,
  p1Name = "Player 1",
  p2Name = "Player 2",
}) {
  const is2P = mode === "2p";
  const cfg = DECKS[difficulty] || DECKS.Medium;
  const [deck, setDeck] = useState(() => createDeck(difficulty));
  const [picks, setPicks] = useState([]);   // currently flipped (max 2)
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [end, setEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [best, setBest] = useState(() => loadBest(difficulty));
  const [streak, setStreak] = useState(0);

  // 2P state
  const [turn, setTurn] = useState(0); // 0 or 1
  const [scores, setScores] = useState([0, 0]);

  // Preview pulse: briefly show all cards at start so it feels welcoming
  const [previewing, setPreviewing] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setPreviewing(false), 1400);
    return () => clearTimeout(id);
  }, [deck]);

  // Solo timer (counts up)
  useEffect(() => {
    if (is2P || end || previewing) return;
    if (moves === 0) return; // start counting once first flip happens
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [is2P, end, previewing, moves]);

  // End detection
  useEffect(() => {
    if (!end && isWin(deck)) {
      setEnd(true);
      SND.win();
      if (!is2P) {
        const record = { moves, seconds };
        if (!best || record.moves < best.moves || (record.moves === best.moves && record.seconds < best.seconds)) {
          setBest(record);
          saveBest(difficulty, record);
        }
        // Score: lower moves = higher score; 200 - moves bounded
        const score = Math.max(10, 200 - moves);
        recordGame("memory", { won: true, score, durationSec: seconds, difficulty });
      }
    }
  }, [deck, end, is2P, moves, seconds, best, difficulty]);

  function flipCard(idx) {
    if (busy || end || previewing) return;
    const card = deck[idx];
    if (!card || card.matched || card.flipped) return;
    if (picks.length >= 2) return;

    SND.flip();
    const nextDeck = deck.slice();
    nextDeck[idx] = { ...card, flipped: true };
    const nextPicks = picks.concat(idx);
    setDeck(nextDeck);
    setPicks(nextPicks);

    if (nextPicks.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = nextPicks;
      const cardA = nextDeck[a], cardB = nextDeck[b];
      const match = cardA.pairId === cardB.pairId;

      if (match) {
        setBusy(true);
        setTimeout(() => {
          const after = nextDeck.slice();
          after[a] = { ...cardA, matched: true };
          after[b] = { ...cardB, matched: true };
          setDeck(after);
          setPicks([]);
          setBusy(false);
          setStreak(s => s + 1);
          if (is2P) setScores(sc => { const ns = sc.slice(); ns[turn]++; return ns; });
          SND.click();
        }, 350);
      } else {
        setBusy(true);
        setTimeout(() => {
          const after = nextDeck.slice();
          after[a] = { ...cardA, flipped: false };
          after[b] = { ...cardB, flipped: false };
          setDeck(after);
          setPicks([]);
          setBusy(false);
          setStreak(0);
          if (is2P) setTurn(t => 1 - t);
          SND.tick();
        }, 850);
      }
    }
  }

  function reset() {
    SND.select();
    setDeck(createDeck(difficulty));
    setPicks([]);
    setMoves(0);
    setSeconds(0);
    setEnd(false);
    setBusy(false);
    setTurn(0);
    setScores([0, 0]);
    setStreak(0);
    setPreviewing(true);
  }

  const matchedPairs = useMemo(() => deck.filter(c => c.matched).length / 2, [deck]);
  const totalPairs = cfg.pairs;

  const status2P = is2P
    ? end
      ? scores[0] === scores[1]
        ? "It's a draw!"
        : `${scores[0] > scores[1] ? p1Name : p2Name} wins!`
      : `${turn === 0 ? p1Name : p2Name}'s turn`
    : end
      ? "All pairs found!"
      : previewing
        ? "Memorize the cards…"
        : streak >= 2
          ? `🔥 Streak: ${streak}`
          : "Find matching pairs.";

  return (
    <div className="mem-page">
      {/* ── Top bar ── */}
      <header className="mem-topbar">
        <div className="mem-topbar-left">
          <button className="gk-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="mem-title">Memory Match</h1>
          <span className="gk-badge">{is2P ? "2P" : difficulty}</span>
        </div>

        <div className="mem-stats">
          {is2P ? (
            <>
              <span className={`mem-pscore${turn === 0 && !end ? " mem-pscore-active" : ""}`}>
                {p1Name}: <strong>{scores[0]}</strong>
              </span>
              <span className={`mem-pscore${turn === 1 && !end ? " mem-pscore-active" : ""}`}>
                {p2Name}: <strong>{scores[1]}</strong>
              </span>
            </>
          ) : (
            <>
              <span className="mem-stat">⏱ {fmtTime(seconds)}</span>
              <span className="mem-stat">Moves: {moves}</span>
              <span className="mem-stat">Pairs: {matchedPairs}/{totalPairs}</span>
              {best && <span className="mem-stat mem-best">Best: {best.moves} mv · {fmtTime(best.seconds)}</span>}
            </>
          )}
        </div>

        <div className="mem-topbar-right">
          <button className="gk-icon-btn" onClick={reset} title="New game">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      <p className="mem-status" role="status" aria-live="polite">{status2P}</p>

      {/* ── Board ── */}
      <div
        className="mem-board"
        style={{ "--mem-cols": cfg.cols }}
      >
        {deck.map((c, i) => {
          const showFace = c.matched || c.flipped || previewing;
          return (
            <button
              key={c.id}
              className={`mem-card${showFace ? " mem-card-face" : ""}${c.matched ? " mem-card-matched" : ""}`}
              onClick={() => flipCard(i)}
              aria-label={showFace ? `Card ${c.emoji}` : "Hidden card"}
              disabled={c.matched}
            >
              <span className="mem-card-inner">
                <span className="mem-card-back">
                  <span className="mem-card-back-glyph">?</span>
                </span>
                <span className="mem-card-front">{c.emoji}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mem-tip">
        Tap two cards to flip. Match pairs to clear the board. {is2P ? "Match again on your turn!" : "Fewer moves = better score."}
      </div>

      {/* ── End modal ── */}
      {end && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="dialog dialog-win">
            <div className="dialog-emoji">🎉</div>
            <h2 className="dialog-title">
              {is2P
                ? scores[0] === scores[1] ? "It's a draw!" : `${scores[0] > scores[1] ? p1Name : p2Name} wins!`
                : "Cleared!"}
            </h2>
            <p className="dialog-talk">
              {is2P
                ? `${p1Name}: ${scores[0]} pairs · ${p2Name}: ${scores[1]} pairs`
                : `Solved in ${moves} moves and ${fmtTime(seconds)}.${best && best.moves === moves && best.seconds === seconds ? " New best!" : ""}`}
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={reset}>Play Again</button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
