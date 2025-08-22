import React, { useEffect, useRef, useState } from "react";
import * as Engine from "../../ai/engine.js";
import Board from "./Board.jsx";
import ResultModal from "./Modal.jsx";
import { lsGet, lsSet } from "../utils/storage.js";
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
} from "../utils/gameHelpers.js";

export default function Game({ mode, seedDaily, onBack }) {
  const [board, setBoard] = useState(() => emptyBoard());
  const [turn, setTurn] = useState(1);
  const [end, setEnd] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [talk, setTalk] = useState("");
  const [aiExplain, setAiExplain] = useState("");
  const [focusCol, setFocusCol] = useState(3);
  const [cautionCols, setCautionCols] = useState([]);

  const [level, setLevel] = useState(() => lsGet("mm4_level", "Auto"));
  const lockedLevelRef = useRef(level);
  const moves = totalPieces(board);
  useEffect(() => {
    if (moves === 0) lockedLevelRef.current = level;
  }, [level, moves]);

  const setLevelPersist = (v) => {
    setLevel(v);
    lsSet("mm4_level", v);
  };

  const [stats, setStats] = useState(() =>
    JSON.parse(
      lsGet(
        "mm4_stats",
        `{"games":0,"wins":0,"losses":0,"draws":0,"streak":0}`
      )
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
    lsSet("mm4_stats", JSON.stringify(s));
    setStats(s);
  };
  const resetStats = () => {
    const s = { games: 0, wins: 0, losses: 0, draws: 0, streak: 0 };
    lsSet("mm4_stats", JSON.stringify(s));
    setStats(s);
  };

  const startRef = useRef(Date.now());
  const lastSaved = useRef("");

  useEffect(() => {
    const raw = lsGet("mm4_autosave");
    if (!raw) return;
    try {
      const { b, t } = JSON.parse(raw);
      if (b && Array.isArray(b) && b.length === COLS) {
        setBoard(b);
        setTurn(t ?? 1);
        setWinLine(null);
        setTalk("");
        setAiExplain("");
      }
    } catch {}
  }, []);
  useEffect(() => {
    const snap = JSON.stringify({ b: board, t: turn, m: mode, e: end });
    if (snap !== lastSaved.current) {
      lsSet("mm4_autosave", snap);
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
    if (lsGet(key)) return;
    lsSet(key, "1");
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
      ? "P1 wins!"
      : end === "ai_win"
      ? "P2 wins!"
      : "Draw"
    : turn === 1
    ? mode === "ai"
      ? "Your move (Yellow)"
      : "P1 move (Yellow)"
    : mode === "ai"
    ? "AI is thinking…"
    : "P2 move (Red)";

  function place(col, who) {
    if (end) return false;
    const c = clampCol(col);
    if (!canPlay(board, c)) return false;
    const nb = play(board, c, who);
    setBoard(nb);
    const w = Engine.winner(nb);
    if (w === 1) return finish("player_win", Engine.findWinLine(nb));
    if (w === -1) return finish("ai_win", Engine.findWinLine(nb));
    if (w === 2) return finish("draw", null);
    const nt = -who;
    setTurn(nt);
    if (mode === "ai" && nt === -1) {
      window.dispatchEvent(new CustomEvent("mm4:turn", { detail: { turn: -1 } }));
    }
    return true;
  }

  function finish(outcomeKey, line) {
    setEnd(outcomeKey);
    setWinLine(line);
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
    window.dispatchEvent(
      new CustomEvent("mm4:gameend", { detail: { outcome: outcomeKey } })
    );
    if (window.MindMatchAI?.onGameEnd) window.MindMatchAI.onGameEnd(outcomeKey);
    return true;
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn(1);
    setEnd(null);
    setWinLine(null);
    setTalk("");
    setAiExplain("");
    startRef.current = Date.now();
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
        <button onClick={onBack}>Home</button>
        <button onClick={reset}>Reset</button>
        {mode === "ai" && <button id="btnHint">Hint</button>}
        {mode === "ai" && (
          <label
            className="tiny"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Level
            <select
              value={level}
              onChange={(e) => setLevelPersist(e.target.value)}
              aria-label="AI difficulty"
              disabled={totalPieces(board) > 0}
              style={{ padding: "6px 8px", borderRadius: 8 }}
            >
              <option>Auto</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
              <option>Expert</option>
            </select>
          </label>
        )}
      </div>

      {mode === "ai" && totalPieces(board) === 0 && (
        <p
          className="tiny"
          style={{ textAlign: "center", margin: "0 0 6px", opacity: 0.9 }}
        >
          AI Level: <b>{lockedLevelRef.current}</b>
        </p>
      )}

      <p
        className="tiny"
        role="status"
        aria-live="polite"
        style={{ textAlign: "center", margin: "4px 0 2px" }}
      >
        {statusText}
      </p>
      {aiExplain && turn === 1 && !end && totalPieces(board) > 0 && (
        <p
          className="tiny"
          style={{ textAlign: "center", margin: "0 0 6px", opacity: 0.9 }}
        >
          AI played that because: <em>{aiExplain}</em>
        </p>
      )}

      <Board
        board={board}
        focusCol={focusCol}
        setFocusCol={setFocusCol}
        cautionCols={cautionCols}
        winLine={winLine}
        onDrop={handleDrop}
        boardRef={boardRef}
      />

      <div className="stats">
        <div>
          📊 Games: <b>{stats.games}</b> · ✅ Wins: <b>{stats.wins}</b> · ❌ Losses:
          <b>{stats.losses}</b> · 🤝 Draws: <b>{stats.draws}</b> · 🔥 Streak:
          <b>{stats.streak}</b>
        </div>
        <div style={{ marginTop: "6px" }}>
          <button onClick={reset} style={{ marginRight: 8 }}>
            Rematch
          </button>
          {mode === "ai" && (
            <button
              onClick={() => {
                reset();
                setTurn(-1);
                window.dispatchEvent(
                  new CustomEvent("mm4:turn", { detail: { turn: -1 } })
                );
              }}
            >
              AI first move
            </button>
          )}
          <button onClick={resetStats} style={{ marginLeft: 8 }}>
            Reset stats
          </button>
          <button onClick={share} style={{ marginLeft: 8 }}>
            Share
          </button>
        </div>
      </div>

      <ResultModal
        end={end}
        mode={mode}
        talk={talk}
        onRematch={reset}
        onShare={share}
        onAIFirst={
          mode === "ai"
            ? () => {
                reset();
                setTurn(-1);
                window.dispatchEvent(
                  new CustomEvent("mm4:turn", { detail: { turn: -1 } })
                );
              }
            : null
        }
        onBack={onBack}
      />
    </>
  );
}
