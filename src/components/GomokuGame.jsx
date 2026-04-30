import React, { useEffect, useState } from "react";
import { SND } from "../utils/gameHelpers.js";
import { recordGame } from "../utils/progress.js";
import GomokuBoard from "./GomokuBoard.jsx";
import GameTimer from "./GameTimer.jsx";
import WinBanner from "./WinBanner.jsx";
import {
  BLACK,
  WHITE,
  createGomokuBoard,
  cloneBoard,
  countStones,
  findWinningStones,
  getWinner,
  isBoardFull,
  isGameOver,
  moveLabel,
  pickBestGomokuMove,
} from "../utils/gomokuHelpers.js";

function playerName(p) {
  return p === BLACK ? "Black" : "White";
}

const GK_TIMER_PP = 600; // 10 min per player (2P)

export default function GomokuGame({ mode = "ai", difficulty = "Hard", onBack, p1Name = "Player 1", p2Name = "Player 2" }) {
  const is2P = mode === "2p";
  const [board, setBoard] = useState(() => createGomokuBoard());
  const [turn, setTurn] = useState(BLACK);
  const [showGuide, setShowGuide] = useState(true);
  const [coachNote, setCoachNote] = useState(
    is2P
      ? `Black opens. ${p1Name} places the first stone.`
      : "Black opens. Place your stone on any intersection."
  );
  const [end, setEnd] = useState(null); // null | "black" | "white" | "draw"
  const [lastMove, setLastMove] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [timerKey, setTimerKey] = useState(0);
  const [bannerFinished, setBannerFinished] = useState(false);

  useEffect(() => {
    if (!end) setBannerFinished(false);
  }, [end]);

  /* ── Per-player timers (2P) ── */
  const [p1Time, setP1Time] = useState(GK_TIMER_PP);
  const [p2Time, setP2Time] = useState(GK_TIMER_PP);

  useEffect(() => {
    if (!is2P || end) return;
    const id = setInterval(() => {
      if (turn === BLACK) {
        setP1Time((t) => {
          if (t <= 1) { finishGame(board); return 0; }
          return t - 1;
        });
      } else {
        setP2Time((t) => {
          if (t <= 1) { finishGame(board); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [is2P, end, turn]);

  /* ── AI auto-play ── */
  useEffect(() => {
    if (end) return;
    if (is2P || turn !== WHITE) return;

    const timer = setTimeout(() => {
      const move = pickBestGomokuMove(board, WHITE, difficulty);
      if (move) commitMove(move, WHITE, move.note);
    }, 600);

    return () => clearTimeout(timer);
  }, [board, turn, end]);

  function finishGame(finalBoard) {
    const winner = getWinner(finalBoard);
    const line = findWinningStones(finalBoard);

    if (line) setWinLine(line);

    if (winner === BLACK) {
      SND.win();
      setEnd("black");
      setCoachNote("Black connects five stones and takes the match!");
    } else if (winner === WHITE) {
      SND.lose();
      setEnd("white");
      setCoachNote("White builds the winning line of five!");
    } else {
      SND.draw();
      setEnd("draw");
      setCoachNote("The board is full — a rare draw!");
    }
    if (!is2P && winner !== 0) {
      recordGame("gomoku", { won: winner === BLACK, score: winner === BLACK ? 1 : 0, difficulty });
    }
  }

  function commitMove(move, player, note) {
    if (end) return false;
    if (board[move.row][move.col] !== 0) return false;

    const next = cloneBoard(board);
    next[move.row][move.col] = player;

    SND.click();
    setBoard(next);
    setLastMove({ row: move.row, col: move.col, player });
    setCoachNote(`${playerName(player)} plays ${moveLabel(move.row, move.col)}. ${note || ""}`);

    if (isGameOver(next)) {
      finishGame(next);
    } else {
      setTurn(-player);
    }

    return true;
  }

  function handleHumanMove(move) {
    if (end) return;
    if (!is2P && turn !== BLACK) return;
    commitMove(move, turn, is2P
      ? `${playerName(turn)} placed a stone.`
      : "Building your position."
    );
  }

  function handleTimeUp() {
    if (!end) finishGame(board);
  }

  function resetGame() {
    setBoard(createGomokuBoard());
    setTurn(BLACK);
    setLastMove(null);
    setWinLine(null);
    setEnd(null);
    setTimerKey((k) => k + 1);
    setP1Time(GK_TIMER_PP);
    setP2Time(GK_TIMER_PP);
    setCoachNote(
      is2P
        ? `New match ready. ${p1Name} is Black, ${p2Name} is White.`
        : "New match ready. Black moves first — place your stone anywhere."
    );
  }

  const counts = countStones(board);

  const statusText = end
    ? end === "draw"
      ? "Match tied"
      : `${end === "black" ? "Black" : "White"} wins!`
    : is2P
    ? `${playerName(turn)}'s turn`
    : turn === BLACK
    ? "Your move as Black"
    : "White AI is thinking…";

  const endTitle = end === "black" ? "Black wins!" : end === "white" ? "White wins!" : "It's a draw";
  const endEmoji = end === "black" ? "⚫" : end === "white" ? "⚪" : "🤝";

  return (
    <div className="gomoku-page">
      {/* ── Top bar ── */}
      <header className="gk-topbar">
        <div className="gk-topbar-left">
          <button className="gk-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="gk-title">Gomoku</h1>
          <span className="gk-badge">{is2P ? "2P" : difficulty}</span>
        </div>

        <div className="gk-scores" aria-label="Stone counts">
          <span className="gk-score gk-score-black" aria-label="Black stones">
            <span className="gk-score-dot gk-dot-black" />
            {counts.black}
          </span>
          <span className="gk-score-sep">–</span>
          <span className="gk-score gk-score-white" aria-label="White stones">
            <span className="gk-score-dot gk-dot-white" />
            {counts.white}
          </span>
        </div>

        <div className="gk-topbar-right">
          {is2P ? (
            <>
              <span className={`bs-player-timer${turn === BLACK ? " bs-timer-active" : ""}${p1Time <= 60 ? " bs-timer-warn" : ""}`}>
                {p1Name} ⏱ {String(Math.floor(p1Time / 60)).padStart(2, "0")}:{String(p1Time % 60).padStart(2, "0")}
              </span>
              <span className={`bs-player-timer${turn === WHITE ? " bs-timer-active" : ""}${p2Time <= 60 ? " bs-timer-warn" : ""}`}>
                {p2Name} ⏱ {String(Math.floor(p2Time / 60)).padStart(2, "0")}:{String(p2Time % 60).padStart(2, "0")}
              </span>
            </>
          ) : (
            <GameTimer key={timerKey} seconds={900} paused={!!end} onTimeUp={handleTimeUp} />
          )}
          <button className="gk-icon-btn" onClick={resetGame} title="New match">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button
            className={`gk-icon-btn ${showGuide ? "gk-btn-active" : ""}`}
            onClick={() => setShowGuide((v) => !v)}
            title={showGuide ? "Hide guide" : "Show guide"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
        </div>
      </header>

      {/* ── Status line ── */}
      <p className="gk-status" role="status" aria-live="polite">{statusText}</p>

      {/* ── Main area ── */}
      <div className={`gk-body ${showGuide ? "gk-body-with-guide" : ""}`}>
        <section className="gk-board-area">
          <GomokuBoard
            board={board}
            lastMove={lastMove}
            winLine={winLine}
            onMove={handleHumanMove}
            locked={!!end || (!is2P && turn === WHITE)}
          />

          <div className="gk-coach">
            <span className="gk-coach-label">Coach</span>
            <span className="gk-coach-text">{coachNote}</span>
          </div>
        </section>

        {showGuide && (
          <aside className="gk-guide">
            <h3 className="gk-guide-title">How to Play</h3>
            <p className="gk-guide-text">
              Place stones to form an unbroken line of five — horizontally, vertically, or diagonally. First to five wins!
            </p>

            <div className="gk-guide-section">
              <h4>Strategy Tips</h4>
              <ul className="gk-guide-list">
                <li><strong>Center</strong> — more directions to build from.</li>
                <li><strong>Open fours</strong> — unblockable two-sided threats.</li>
                <li><strong>Double threes</strong> — creates two threats at once.</li>
                <li><strong>Block early</strong> — don't let opponent reach four.</li>
              </ul>
            </div>
          </aside>
        )}
      </div>

      {/* ── End-game modal & banner ── */}
      {end && !bannerFinished && (
        <WinBanner
          outcome={
            end === "draw" ? "draw" :
            mode === "ai" ? (end === "black" ? "player_win" : "ai_win") :
                            (end === "black" ? "p1_win" : "p2_win")
          }
          onFinished={() => setBannerFinished(true)}
        />
      )}

      {end && bannerFinished && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`dialog ${end === "black" ? "dialog-win" : ""}`}>
            <div className="dialog-emoji">{endEmoji}</div>
            <h2 className="dialog-title">{endTitle}</h2>
            <p className="dialog-talk">
              Black {counts.black} stones, White {counts.white} stones.
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={resetGame}>
                Play Again
              </button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
