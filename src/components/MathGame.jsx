import React, { useEffect, useRef, useState, useCallback } from "react";
import { SND } from "../utils/gameHelpers.js";
import {
  LEVELS, newProblem, makeChoices,
  loadBest, saveBest,
} from "../utils/mathHelpers.js";
import { recordGame } from "../utils/progress.js";

const PHASE_READY = "ready";
const PHASE_PLAY  = "play";
const PHASE_OVER  = "over";

export default function MathGame({ level = "Medium", onBack, kidsMode = false }) {
  const cfg = LEVELS[level] || LEVELS.Medium;
  const [phase, setPhase] = useState(PHASE_READY);
  const [problem, setProblem] = useState(() => newProblem(level));
  const [choices, setChoices] = useState(() => makeChoices(problem.answer, level));
  const [time, setTime] = useState(cfg.time);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => loadBest(level));
  const [feedback, setFeedback] = useState(null); // { ok, text }
  const lastAnswerAtRef = useRef(null);

  /** Timer */
  useEffect(() => {
    if (phase !== PHASE_PLAY) return;
    if (time <= 0) {
      setPhase(PHASE_OVER);
      SND.lose();
      return;
    }
    const id = setTimeout(() => setTime(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, time]);

  /** Persist best at end */
  useEffect(() => {
    if (phase !== PHASE_OVER) return;
    const record = { score, streak };
    if (!best || score > best.score) {
      setBest(record);
      saveBest(level, record);
    }
    recordGame("math", { score, won: score > 0, durationSec: cfg.time, difficulty: level });
  }, [phase, score, streak, best, level]);

  function start() {
    SND.select();
    const p = newProblem(level);
    setProblem(p);
    setChoices(makeChoices(p.answer, level));
    setTime(cfg.time);
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setPhase(PHASE_PLAY);
    lastAnswerAtRef.current = Date.now();
  }

  const handleAnswer = useCallback((value) => {
    if (phase !== PHASE_PLAY) return;
    const correct = value === problem.answer;
    if (correct) {
      SND.click();
      setScore(s => s + 1 + Math.floor(streak / 3)); // bonus for streaks
      setStreak(s => s + 1);
      setFeedback({ ok: true, text: "✓" });
    } else {
      SND.tick();
      setStreak(0);
      setFeedback({ ok: false, text: `✗ ${problem.text} = ${problem.answer}` });
    }

    // Next problem
    setTimeout(() => {
      const p = newProblem(level);
      setProblem(p);
      setChoices(makeChoices(p.answer, level));
      setFeedback(null);
    }, correct ? 250 : 800);
  }, [phase, problem, streak, level]);

  // Keyboard 1-4 to pick answers (desktop helper)
  useEffect(() => {
    if (phase !== PHASE_PLAY) return;
    const handler = (e) => {
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= choices.length) {
        handleAnswer(choices[idx - 1]);
      }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [phase, choices, handleAnswer]);

  const timePct = Math.max(0, Math.min(100, (time / cfg.time) * 100));
  const timeWarn = time <= 10;

  return (
    <div className={`math-page${kidsMode ? " kids-mode" : ""}`}>
      {/* ── Top bar ── */}
      <header className="math-topbar">
        <div className="math-topbar-left">
          <button className="gk-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="math-title">Math Sprint</h1>
          <span className="gk-badge">{level}</span>
        </div>
        <div className="math-stats">
          <div className="math-score-box">
            <div className="math-score-label">SCORE</div>
            <div className="math-score-val">{score}</div>
          </div>
          <div className="math-score-box">
            <div className="math-score-label">STREAK</div>
            <div className={`math-score-val${streak >= 3 ? " math-streak-hot" : ""}`}>
              {streak >= 3 ? "🔥" : ""}{streak}
            </div>
          </div>
          {best && (
            <div className="math-score-box">
              <div className="math-score-label">BEST</div>
              <div className="math-score-val">{best.score}</div>
            </div>
          )}
        </div>
        <div className="math-topbar-right">
          <button className="gk-icon-btn" onClick={start} title="Restart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      {/* ── Time bar ── */}
      <div className={`math-timebar${timeWarn ? " math-timebar-warn" : ""}`} aria-hidden="true">
        <div className="math-timebar-fill" style={{ width: `${timePct}%` }} />
        <div className="math-time-text">⏱ {time}s</div>
      </div>

      {/* ── Stage ── */}
      {phase === PHASE_READY && (
        <div className="math-ready">
          <div className="math-ready-emoji">🧮</div>
          <h2 className="math-ready-title">Ready?</h2>
          <p className="math-ready-text">
            Solve as many as you can in <strong>{cfg.time} seconds</strong>.
            <br />
            <span className="math-ready-sub">{cfg.label}</span>
          </p>
          <button className="btn-primary math-start-btn" onClick={start}>
            ▶ Start Sprint
          </button>
        </div>
      )}

      {phase === PHASE_PLAY && (
        <div className="math-stage">
          <div className="math-problem">
            {problem.text} <span className="math-eq">=</span> <span className="math-q">?</span>
          </div>

          {feedback && (
            <div className={`math-feedback${feedback.ok ? " math-feedback-ok" : " math-feedback-bad"}`}>
              {feedback.text}
            </div>
          )}

          <div className="math-choices">
            {choices.map((c, i) => (
              <button
                key={`${c}-${i}`}
                className="math-choice"
                onClick={() => handleAnswer(c)}
              >
                <span className="math-choice-key">{i + 1}</span>
                <span className="math-choice-val">{c}</span>
              </button>
            ))}
          </div>

          <div className="math-tip">Tap an answer · or press 1-4 on keyboard</div>
        </div>
      )}

      {phase === PHASE_OVER && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`dialog ${best && score === best.score && score > 0 ? "dialog-win" : ""}`}>
            <div className="dialog-emoji">{score >= 20 ? "🏆" : score >= 10 ? "🎉" : "🧮"}</div>
            <h2 className="dialog-title">Time's Up!</h2>
            <p className="dialog-talk">
              You solved <strong>{score}</strong> problem{score === 1 ? "" : "s"} this sprint.
              {best && score >= best.score && score > 0 && " New best! 🎉"}
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={start}>Try Again</button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
