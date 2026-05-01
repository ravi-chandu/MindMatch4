import React, { useEffect, useState, useCallback } from "react";
import { SND } from "../utils/gameHelpers.js";
import { COLORS, TIME_SEC, nextTrial, loadBest, saveBest } from "../utils/stroopHelpers.js";
import { recordGame } from "../utils/progress.js";

const READY = "ready", PLAY = "play", OVER = "over";

export default function StroopGame({ onBack, kidsMode = false }) {
  const [phase, setPhase] = useState(READY);
  const [trial, setTrial] = useState(() => nextTrial());
  const [time, setTime] = useState(TIME_SEC);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => loadBest());
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (phase !== PLAY) return;
    if (time <= 0) { setPhase(OVER); SND.lose(); return; }
    const id = setTimeout(() => setTime(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, time]);

  useEffect(() => {
    if (phase !== OVER) return;
    if (score > best) { saveBest(score); setBest(score); }
    recordGame("stroop", { score, won: score > 0, durationSec: TIME_SEC });
  }, [phase]); // eslint-disable-line

  const start = () => {
    setScore(0); setStreak(0); setTime(TIME_SEC); setFeedback(null);
    setTrial(nextTrial());
    setPhase(PLAY);
    SND.click();
  };

  const answer = useCallback((colorId) => {
    if (phase !== PLAY) return;
    if (colorId === trial.answer) {
      const pts = 1 + Math.floor(streak / 5);
      setScore(s => s + pts);
      setStreak(s => s + 1);
      setFeedback({ ok: true, text: `+${pts}` });
      SND.click();
    } else {
      setStreak(0);
      setTime(t => Math.max(0, t - 2));
      setFeedback({ ok: false, text: "−2s" });
      SND.lose();
    }
    setTrial(prev => nextTrial(prev));
    setTimeout(() => setFeedback(null), 350);
  }, [phase, trial, streak]);

  // Keyboard 1–4
  useEffect(() => {
    if (phase !== PLAY) return;
    const handler = (e) => {
      const idx = ["1","2","3","4"].indexOf(e.key);
      if (idx >= 0) answer(COLORS[idx].id);
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [phase, answer]);

  return (
    <div className="math-page stroop-page">
      <div className="math-topbar">
        <button className="back-link" onClick={onBack}>← Back</button>
        <h2 className="math-title">🌈 Stroop Test</h2>
        <div className="math-score-box">
          <span>Score <b>{score}</b></span>
          <span className={streak >= 5 ? "math-streak-hot" : ""}>🔥 {streak}</span>
          <span>Best <b>{best || 0}</b></span>
        </div>
      </div>

      {phase === PLAY && (
        <>
          <div className={`math-timebar${time <= 10 ? " math-timebar-warn" : ""}`}>
            <div className="math-timebar-fill" style={{ width: `${(time/TIME_SEC)*100}%` }} />
            <span className="math-time-text">{time}s</span>
          </div>

          <div className="stroop-stage">
            <div className="stroop-prompt">Tap the <b>INK COLOR</b>:</div>
            <div className="stroop-word" style={{ color: trial.ink.hex }}>
              {trial.word.label.toUpperCase()}
            </div>
            <div className={`math-feedback ${feedback?.ok ? "math-feedback-ok" : feedback ? "math-feedback-bad" : ""}`}>
              {feedback?.text || " "}
            </div>
            <div className="stroop-choices">
              {COLORS.map((c, i) => (
                <button
                  key={c.id}
                  className="stroop-choice"
                  style={{ background: c.hex }}
                  onClick={() => answer(c.id)}
                  aria-label={c.label}
                >
                  <span className="stroop-key">{i + 1}</span>
                  <span className="stroop-label">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === READY && (
        <div className="math-ready">
          <div className="math-ready-emoji">🌈</div>
          <h3 className="math-ready-title">Stroop Test</h3>
          <p className="math-ready-text">Tap the <b>color of the ink</b> — not the word!</p>
          <p className="math-ready-sub">{TIME_SEC}s · trains focus & cognitive control</p>
          <button className="math-start-btn" onClick={start}>▶ Start</button>
        </div>
      )}

      {phase === OVER && (
        <div className="math-ready">
          <div className="math-ready-emoji">{score >= best ? "🏆" : "⏰"}</div>
          <h3 className="math-ready-title">Time! Score: {score}</h3>
          <p className="math-ready-sub">Best: {best || score}</p>
          <button className="math-start-btn" onClick={start}>↻ Play Again</button>
        </div>
      )}

      <p className="math-tip">Tip: ignore what the word says — react to the color you see.</p>
    </div>
  );
}
