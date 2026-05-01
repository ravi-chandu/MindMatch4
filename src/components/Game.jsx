import React, { useEffect, useRef, useState } from "react";
import * as Engine from "../../ai/engine.js";
import Board from "./Board.jsx";
import ResultModal from "./Modal.jsx";
import GameTimer from "./GameTimer.jsx";
import WinBanner from "./WinBanner.jsx";
import { recordGame } from "../utils/progress.js";
import {
  ROWS,
  COLS,
  emptyBoard,
  clampCol,
  canPlay,
  play,
  totalPieces,
  nearWinScore,
  engageMessage,
  fireConfetti,
  shareText,
  computeLocalHints,
  reasonFor,
  mctsPick,
  SND,
} from "../utils/gameHelpers.js";

const C4_TIMER_PP = 300; // 5 min per player (2P mode)

export default function Game({ mode, seedDaily, difficulty = "Auto", onBack, p1Name = "Player 1", p2Name = "Player 2" }) {
  const is2P = mode === "2p";
  const [board, setBoard] = useState(() => emptyBoard());
  const [turn, setTurn] = useState(1);
  const [end, setEnd] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [talk, setTalk] = useState("");
  const [aiExplain, setAiExplain] = useState("");
  const [focusCol, setFocusCol] = useState(3);
  const [cautionCols, setCautionCols] = useState([]);
  const [timerKey, setTimerKey] = useState(0);
  const [bannerFinished, setBannerFinished] = useState(false);

  useEffect(() => {
    if (!end) setBannerFinished(false);
  }, [end]);

  /* ── Per-player timers (2P) ── */
  const [p1Time, setP1Time] = useState(C4_TIMER_PP);
  const [p2Time, setP2Time] = useState(C4_TIMER_PP);

  useEffect(() => {
    if (!is2P || end) return;
    const id = setInterval(() => {
      if (turn === 1) {
        setP1Time((t) => {
          if (t <= 1) { finish("ai_win", null); return 0; }
          return t - 1;
        });
      } else {
        setP2Time((t) => {
          if (t <= 1) { finish("player_win", null); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [is2P, end, turn]);

  const lockedLevelRef = useRef(difficulty);
  const moves = totalPieces(board);
  useEffect(() => {
    if (moves === 0) lockedLevelRef.current = difficulty;
  }, [difficulty, moves]);

  const [stats, setStats] = useState(() =>
    JSON.parse(
      localStorage.getItem("mm4_stats") ||
        `{"games":0,"wins":0,"losses":0,"draws":0,"streak":0}`
    )
  );
  const record = (outcomeKey) => {
    if (mode !== "ai") return;
    const s = { ...stats };
    s.games++;
    if (outcomeKey === "player_win") {
      s.wins++;
      s.streak = Math.max(1, s.streak + 1);
    } else if (outcomeKey === "ai_win") {
      s.losses++;
      s.streak = 0;
    } else {
      s.draws++;
    }
    localStorage.setItem("mm4_stats", JSON.stringify(s));
    setStats(s);
  };
  const resetStats = () => {
    const s = { games: 0, wins: 0, losses: 0, draws: 0, streak: 0 };
    localStorage.setItem("mm4_stats", JSON.stringify(s));
    setStats(s);
  };

  const startRef = useRef(Date.now());
  const lastSaved = useRef("");

  useEffect(() => {
    const raw = localStorage.getItem("mm4_autosave");
    if (!raw) return;
    try {
      const { b, t, e } = JSON.parse(raw);
      if (b && Array.isArray(b) && b.length === COLS) {
        const isFinished = Boolean(e) || Engine.winner(b) !== 0;
        if (isFinished) {
          localStorage.removeItem("mm4_autosave");
          return;
        }
        setBoard(b);
        setTurn(t ?? 1);
        setWinLine(null);
        setTalk("");
        setAiExplain("");
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (end) {
      localStorage.removeItem("mm4_autosave");
      lastSaved.current = "";
      return;
    }
    const snap = JSON.stringify({ b: board, t: turn, m: mode, e: null });
    if (snap !== lastSaved.current) {
      localStorage.setItem("mm4_autosave", snap);
      lastSaved.current = snap;
    }
  }, [board, turn, mode, end]);

  useEffect(() => {
    if (seedDaily && window.MindMatchAI?.todaySeed) {
      setBoard(window.MindMatchAI.todaySeed());
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    window.board = board;
    window.turn = turn;
    window.mm4Mode = mode;
    window.getBoardState = () => board;
    window.loadBoardState = (b) => {
      setBoard(b);
      setTurn(1);
      setEnd(null);
      setWinLine(null);
      setTalk("");
      setAiExplain("");
      startRef.current = Date.now();
    };
    window.renderBoard = (b) => setBoard(b);
    window.dropPiece = (col) => place(col, turn);
    window.applyMove = (col) => {
      setAiExplain(explainForMove(board, -1, col));
      place(col, -1);
    };
    window.highlightCols = (cols = []) => {
      document
        .querySelectorAll(".hint-col")
        .forEach((el) => el.classList.remove("hint-col"));
      cols.forEach((c) => {
        const el = document.querySelector(`.col[data-col="${c}"]`);
        if (el) {
          el.classList.add("hint-col");
          setTimeout(() => el.classList.remove("hint-col"), 1500);
        }
      });
    };
    window.computeHints =
      window.computeHints || ((b, p) => computeLocalHints(b, p));
  }, [board, turn, mode]);

  useEffect(() => {
    const btn = document.getElementById("btnHint");
    if (!btn || mode !== "ai") return;
    const handler = () => {
      SND.hint();
      const h = (window.computeHints
        ? window.computeHints(board, 1)
        : computeLocalHints(board, 1));
      window.highlightCols?.(h?.best || []);
      const a = document.getElementById("announce");
      if (a) a.textContent = `${h?.note || "Hint"}: ${(h?.best || []).join(", ")}`;
      window.dispatchEvent(new CustomEvent("mm4:hint", { detail: h }));
    };
    btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, [board, mode]);

  const boardRef = useRef(null);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (end) return;
      if (e.key === "ArrowLeft") {
        setFocusCol((c) => clampCol(c - 1));
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        setFocusCol((c) => clampCol(c + 1));
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        if (mode === "ai") {
          if (turn === 1) window.dropPiece(focusCol);
        } else {
          window.dropPiece(focusCol);
        }
        e.preventDefault();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [end, mode, turn, focusCol]);

  useEffect(() => {
    const opp = -turn;
    const danger = [];
    [0, 6].forEach((c) => {
      if (!canPlay(board, c)) return;
      const nb = play(board, c, turn);
      for (let oc = 0; oc < COLS; oc++) {
        if (!canPlay(nb, oc)) continue;
        if (Engine.winner(play(nb, oc, opp)) === opp) {
          danger.push(c);
          break;
        }
      }
    });
    setCautionCols(danger);
  }, [board, turn]);

  useEffect(() => {
    if (mode !== "ai" || end || turn !== -1) return;
    const timer = setTimeout(() => {
      if (end || turn !== -1) return;
      const uiLevel = lockedLevelRef.current;
      let diff;
      if (uiLevel !== "Auto") {
        diff = { Easy: 1, Medium: 3, Hard: 4, Expert: 5 }[uiLevel] || 3;
      } else {
        diff = Math.min(5, Math.max(1, Math.floor((stats.wins - stats.losses) / 3) + 2));
      }
      let chosen, note;
      if (diff <= 2) {
        const h = computeLocalHints(board, -1);
        const candidates = h.best?.length
          ? h.best.slice()
          : [3, 2, 4, 1, 5, 0, 6].filter((c) => canPlay(board, c));
        if (uiLevel === "Easy") {
          chosen =
            candidates[Math.floor(Math.random() * Math.max(1, candidates.length))] ??
            3;
          note = "Simple heuristic (Easy)";
        } else {
          chosen =
            candidates && candidates[0] != null
              ? candidates[0]
              : [3, 2, 4, 1, 5, 0, 6].find((c) => canPlay(board, c));
          note = "Heuristic (Medium)";
        }
      } else {
        const iters = uiLevel === "Expert" ? 1000 : 600;
        const m = mctsPick(board, -1, iters);
        chosen = m.col;
        note = `Monte‑Carlo rollout (${iters})`;
      }
      setAiExplain(note || "");
      if (typeof chosen === "number") place(chosen, -1);
    }, 650);
    return () => clearTimeout(timer);
  }, [mode, turn, end, board, stats]);

  useEffect(() => {
    const key = "mm4_seen_onboarding";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const center = document.querySelector('[data-col="3"]');
    if (center) {
      center.classList.add("onboard-pulse");
      setTimeout(() => center.classList.remove("onboard-pulse"), 2200);
    }
  }, []);

  const statusText = end
    ? mode === "ai"
      ? end === "player_win"
        ? "You win!"
        : end === "ai_win"
        ? "AI wins!"
        : "Draw"
      : end === "player_win"
      ? `${p1Name} wins!`
      : end === "ai_win"
      ? `${p2Name} wins!`
      : "Draw"
    : turn === 1
    ? mode === "ai"
      ? "Your move (Yellow)"
      : `${p1Name} move (Yellow)`
    : mode === "ai"
    ? "AI is thinking…"
    : `${p2Name} move (Red)`;

  const playHintText = end
    ? "Tap Play Again or New to start the next round."
    : mode === "ai"
    ? turn === 1
      ? "Your turn: tap or click any column to drop Yellow."
      : "AI is thinking. You can press Hint any time."
    : `${turn === 1 ? p1Name : p2Name}: tap or click any column to drop.`;

  function place(col, who) {
    if (end) return false;
    const c = clampCol(col);
    if (!canPlay(board, c)) return false;
    SND.drop();
    const nb = play(board, c, who);
    setBoard(nb);
    const w = Engine.winner(nb);
    if (w === 1) return finish("player_win", Engine.findWinLine(nb));
    if (w === -1) return finish("ai_win", Engine.findWinLine(nb));
    if (w === 2) return finish("draw", null);
    setTurn(-who);
    return true;
  }

  function finish(outcomeKey, line) {
    setEnd(outcomeKey);
    setWinLine(line);
    if (outcomeKey === "player_win") SND.win();
    else if (outcomeKey === "ai_win") SND.lose();
    else SND.draw();
    const ms = Date.now() - startRef.current;
    const near = nearWinScore(board, 1);
    setTalk(engageMessage(outcomeKey, { ms, near }));
    const canvas = document.getElementById("mm4-confetti");
    if (
      canvas &&
      (outcomeKey === "player_win" || outcomeKey === "ai_win")
    )
      fireConfetti(canvas);
    const announce = document.getElementById("announce");
    if (announce) announce.textContent = `${statusText} — ${talk}`;
    record(outcomeKey);
    if (mode === "ai") {
      const won = outcomeKey === "player_win";
      const lost = outcomeKey === "ai_win";
      if (won || lost) {
        recordGame("connect4", { won, score: won ? 1 : 0, durationSec: Math.round(ms / 1000), difficulty });
      }
    }
    window.dispatchEvent(
      new CustomEvent("mm4:gameend", { detail: { outcome: outcomeKey } })
    );
    if (window.MindMatchAI?.onGameEnd) window.MindMatchAI.onGameEnd(outcomeKey);
    return true;
  }

  function handleTimeUp() {
    if (!end) finish(turn === 1 ? "ai_win" : "player_win", null);
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn(1);
    setEnd(null);
    setWinLine(null);
    setTalk("");
    setAiExplain("");
    startRef.current = Date.now();
    setTimerKey((k) => k + 1);
    setP1Time(C4_TIMER_PP);
    setP2Time(C4_TIMER_PP);
  }

  async function share() {
    const text = shareText(board, end);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Result copied!");
      }
    } catch {}
  }

  function explainForMove(b, p, c) {
    const r = reasonFor(b, p, c);
    return r ? r.note : "";
  }

  const handleDrop = (c) =>
    mode === "ai" ? turn === 1 && window.dropPiece(c) : window.dropPiece(c);

  return (
    <>
      <div className="modebar">
        <button onClick={onBack} title="Back to Home">🏠</button>
        <button onClick={reset} title="New game">🔄 New</button>
        {mode === "ai" && <button id="btnHint" title="Get a hint">💡 Hint</button>}
        {mode === "ai" && (
          <span className="level-badge" title="Difficulty">
            {lockedLevelRef.current}
          </span>
        )}
        {is2P ? (
          <>
            <span className={`bs-player-timer${turn === 1 ? " bs-timer-active" : ""}${p1Time <= 60 ? " bs-timer-warn" : ""}`}>
              {p1Name} ⏱ {String(Math.floor(p1Time / 60)).padStart(2, "0")}:{String(p1Time % 60).padStart(2, "0")}
            </span>
            <span className={`bs-player-timer${turn === -1 ? " bs-timer-active" : ""}${p2Time <= 60 ? " bs-timer-warn" : ""}`}>
              {p2Name} ⏱ {String(Math.floor(p2Time / 60)).padStart(2, "0")}:{String(p2Time % 60).padStart(2, "0")}
            </span>
          </>
        ) : (
          <GameTimer key={timerKey} seconds={300} paused={!!end} onTimeUp={handleTimeUp} />
        )}
      </div>

      <p className="status-bar" role="status" aria-live="polite">
        {statusText}
      </p>
      <p className="play-help">{playHintText}</p>
      <Board
        board={board}
        focusCol={focusCol}
        setFocusCol={setFocusCol}
        cautionCols={cautionCols}
        winLine={winLine}
        onDrop={handleDrop}
        boardRef={boardRef}
      />

      {mode === "ai" && (
        <div className="stats-bar">
          <span>🏆 {stats.wins}</span>
          <span>💀 {stats.losses}</span>
          <span>🤝 {stats.draws}</span>
          <span>🔥 {stats.streak}</span>
        </div>
      )}

      {end && !bannerFinished && (
        <WinBanner outcome={end} onFinished={() => setBannerFinished(true)} />
      )}

      <ResultModal
        end={bannerFinished ? end : null}
        mode={mode}
        talk={talk}
        onRematch={reset}
        onShare={share}
        onAIFirst={
          mode === "ai"
            ? () => {
                reset();
                setTurn(-1);
              }
            : null
        }
        onBack={onBack}
      />
    </>
  );
}
