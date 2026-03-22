import React, { useEffect, useMemo, useState } from "react";
import { SND } from "../utils/gameHelpers.js";
import ReversiBoard from "./ReversiBoard.jsx";
import GameTimer from "./GameTimer.jsx";
import WinBanner from "./WinBanner.jsx";
import {
  BLACK,
  WHITE,
  applyReversiMove,
  countDiscs,
  createReversiBoard,
  getValidMoves,
  getWinner,
  isGameOver,
  moveLabel,
  pickBestReversiMove,
} from "../utils/reversiHelpers.js";

function playerName(player) {
  return player === BLACK ? "Black" : "White";
}

const RV_TIMER_PP = 450; // 7.5 min per player (2P mode)

export default function ReversiGame({ startInDemo = false, mode = "ai", difficulty = "Hard", onBack, p1Name = "Player 1", p2Name = "Player 2" }) {
  const is2P = mode === "2p";
  const [board, setBoard] = useState(() => createReversiBoard());
  const [turn, setTurn] = useState(BLACK);
  const [demoMode, setDemoMode] = useState(Boolean(startInDemo));
  const [showGuide, setShowGuide] = useState(true);
  const [coachNote, setCoachNote] = useState(
    startInDemo
      ? "Demo mode is running. Watch how corners and edges become priority targets."
      : is2P
      ? `Black opens. ${p1Name} picks a highlighted square.`
      : "Black opens. Choose one of the highlighted moves to begin."
  );
  const [end, setEnd] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [timerKey, setTimerKey] = useState(0);
  const [bannerFinished, setBannerFinished] = useState(false);

  useEffect(() => {
    if (!end) setBannerFinished(false);
  }, [end]);

  /* ── Per-player timers (2P) ── */
  const [p1Time, setP1Time] = useState(RV_TIMER_PP);
  const [p2Time, setP2Time] = useState(RV_TIMER_PP);

  useEffect(() => {
    if (!is2P || end || demoMode) return;
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
  }, [is2P, end, demoMode, turn]);

  const validMoves = useMemo(() => getValidMoves(board, turn), [board, turn]);
  const counts = useMemo(() => countDiscs(board), [board]);

  useEffect(() => {
    if (end || validMoves.length) return;

    const nextPlayer = -turn;
    const nextMoves = getValidMoves(board, nextPlayer);

    if (!nextMoves.length || isGameOver(board)) {
      finishGame(board);
      return;
    }

    setCoachNote(`${playerName(turn)} has no legal move, so the turn passes.`);
    setTurn(nextPlayer);
  }, [board, turn, validMoves, end]);

  useEffect(() => {
    if (end || !validMoves.length) return;

    const shouldAutoPlay = demoMode || (!is2P && turn === WHITE);
    if (!shouldAutoPlay) return;

    const timer = setTimeout(() => {
      const move = pickBestReversiMove(board, turn, difficulty);
      if (move) commitMove(move, turn, move.note);
    }, demoMode ? 500 : 700);

    return () => clearTimeout(timer);
  }, [board, turn, validMoves, demoMode, end]);

  function finishGame(finalBoard) {
    const winner = getWinner(finalBoard);

    if (winner === BLACK) {
      SND.win();
      setEnd("black");
      setCoachNote("Black controls more territory and takes the match.");
    } else if (winner === WHITE) {
      SND.lose();
      setEnd("white");
      setCoachNote("White finishes stronger by owning the stable positions.");
    } else {
      SND.draw();
      setEnd("draw");
      setCoachNote("Perfect balance. Neither side finished ahead.");
    }
  }

  function commitMove(move, player, note) {
    if (end) return false;

    const nextBoard = applyReversiMove(board, move, player);
    if (!nextBoard) return false;

    SND.click();
    setTimeout(() => SND.flip(), 100); // Slight delay for the flip sound to sync with CSS animation
    setBoard(nextBoard);
    setLastMove({ row: move.row, col: move.col, player });
    setCoachNote(`${playerName(player)} plays ${moveLabel(move.row, move.col)}. ${note}`);

    if (isGameOver(nextBoard)) {
      finishGame(nextBoard);
    } else {
      setTurn(-player);
    }

    return true;
  }

  function handleHumanMove(move) {
    if (demoMode || end) return;
    if (!is2P && turn !== BLACK) return;
    commitMove(move, turn, is2P
      ? `${playerName(turn)} flipped the lane.`
      : "You flipped the lane and kept the initiative."
    );
  }

  function handleTimeUp() {
    if (!end) finishGame(board);
  }

  function resetGame(nextDemoMode = demoMode) {
    setBoard(createReversiBoard());
    setTurn(BLACK);
    setDemoMode(nextDemoMode);
    setLastMove(null);
    setEnd(null);
    setTimerKey((k) => k + 1);
    setP1Time(RV_TIMER_PP);
    setP2Time(RV_TIMER_PP);
    setCoachNote(
      nextDemoMode
        ? "Fresh demo started. Notice how the opening avoids risky squares near empty corners."
        : is2P
        ? `New match ready. ${p1Name} is Black, ${p2Name} is White.`
        : "New match ready. Black moves first and highlighted cells show your legal options."
    );
  }

  const statusText = end
    ? end === "draw"
      ? "Match tied"
      : `${end === "black" ? "Black" : "White"} wins`
    : demoMode
    ? `${playerName(turn)} is thinking in demo mode`
    : is2P
    ? `${playerName(turn)}'s turn`
    : turn === BLACK
    ? "Your move as Black"
    : "White AI is thinking";

  const endTitle = end === "black" ? "Black wins" : end === "white" ? "White wins" : "It's a draw";
  const endEmoji = end === "black" ? "⚫" : end === "white" ? "⚪" : "🤝";

  return (
    <div className="reversi-page">
      {/* ── Top bar: back + title + scores + controls ── */}
      <header className="rv-topbar">
        <div className="rv-topbar-left">
          <button className="rv-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="rv-title">Reversi</h1>
          <span className="rv-badge">{demoMode ? "Demo" : is2P ? "2P" : difficulty}</span>
        </div>

        <div className="rv-scores" aria-label="Current score">
          <span className="rv-score rv-score-black" aria-label="Black discs">
            <span className="rv-score-dot rv-dot-black" />
            {counts.black}
          </span>
          <span className="rv-score-sep">–</span>
          <span className="rv-score rv-score-white" aria-label="White discs">
            <span className="rv-score-dot rv-dot-white" />
            {counts.white}
          </span>
        </div>

        <div className="rv-topbar-right">
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
            <GameTimer key={timerKey} seconds={900} paused={!!end || demoMode} onTimeUp={handleTimeUp} />
          )}
          <button className="rv-icon-btn" onClick={() => resetGame(false)} title="New match">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button
            className={`rv-icon-btn ${demoMode ? "rv-btn-active" : ""}`}
            onClick={() => {
              if (demoMode) {
                setDemoMode(false);
                setCoachNote("Demo paused. You now control Black from the current position.");
              } else {
                resetGame(true);
              }
            }}
            title={demoMode ? "Take control" : "Demo Play"}
          >
            {demoMode ? "⏸" : "▶"}
          </button>
          <button
            className={`rv-icon-btn ${showGuide ? "rv-btn-active" : ""}`}
            onClick={() => setShowGuide((v) => !v)}
            title={showGuide ? "Hide guide" : "Show guide"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
        </div>
      </header>

      {/* ── Status line ── */}
      <p className="rv-status" role="status" aria-live="polite">{statusText}</p>

      {/* ── Main area: board + optional sidebar ── */}
      <div className={`rv-body ${showGuide ? "rv-body-with-guide" : ""}`}>
        <section className="rv-board-area">
          <ReversiBoard
            board={board}
            validMoves={validMoves}
            lastMove={lastMove}
            onMove={handleHumanMove}
            locked={end || (!is2P && turn === WHITE && !demoMode)}
          />

          {/* Coach note — compact strip below board */}
          <div className="rv-coach">
            <span className="rv-coach-label">Coach</span>
            <span className="rv-coach-text">{coachNote}</span>
          </div>
        </section>

        {showGuide && (
          <aside className="rv-guide">
            <h3 className="rv-guide-title">How to Play</h3>
            <p className="rv-guide-text">
              Place a disc to trap opposing discs in a straight line — they flip to your color.
              No legal move? You pass. Game ends when neither side can move.
            </p>

            <div className="rv-guide-section">
              <h4>Strategy Tips</h4>
              <ul className="rv-guide-list">
                <li><strong>Corners</strong> — can never be flipped back.</li>
                <li><strong>Edges</strong> — usually safer than center grabs.</li>
                <li><strong>Near empty corners</strong> — often traps, not prizes.</li>
                <li><strong>Mobility</strong> — keep your options open.</li>
              </ul>
            </div>
          </aside>
        )}
      </div>

      {/* ── End-game modal & banner ── */}
      {end && !bannerFinished && !demoMode && (
        <WinBanner 
          outcome={
            end === "tie" ? "draw" : 
            mode === "ai" ? (end === "black" ? "player_win" : "ai_win") : 
                            (end === "black" ? "p1_win" : "p2_win")
          } 
          onFinished={() => setBannerFinished(true)} 
        />
      )}
      
      {end && (bannerFinished || demoMode) && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`dialog ${end === "black" ? "dialog-win" : ""}`}>
            <div className="dialog-emoji">{endEmoji}</div>
            <h2 className="dialog-title">{endTitle}</h2>
            <p className="dialog-talk">
              Final score: Black {counts.black}, White {counts.white}.
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={() => resetGame(false)}>
                Play Again
              </button>
              <button onClick={() => resetGame(true)}>Watch Demo</button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
