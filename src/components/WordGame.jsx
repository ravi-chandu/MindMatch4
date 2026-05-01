import React, { useEffect, useRef, useState, useCallback } from "react";
import { SND } from "../utils/gameHelpers.js";
import { WORD_LEVELS, pickWord, scramble, loadBest, saveBest } from "../utils/wordHelpers.js";
import { recordGame } from "../utils/progress.js";

const READY = "ready", PLAY = "play", OVER = "over";

export default function WordGame({ level = "Medium", onBack, kidsMode = false }) {
  const cfg = WORD_LEVELS[level] || WORD_LEVELS.Medium;
  const [phase, setPhase] = useState(READY);
  const [word, setWord] = useState("");
  const [letters, setLetters] = useState([]); // [{ch, used}]
  const [picked, setPicked] = useState([]);   // indices into letters
  const [time, setTime] = useState(cfg.time);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => loadBest(level));
  const [feedback, setFeedback] = useState(null);
  const recentRef = useRef([]);

  const newRound = useCallback(() => {
    const w = pickWord(level, recentRef.current);
    recentRef.current.push(w);
    if (recentRef.current.length > 8) recentRef.current.shift();
    setWord(w);
    setLetters(scramble(w).map(ch => ({ ch, used: false })));
    setPicked([]);
  }, [level]);

  useEffect(() => {
    if (phase !== PLAY) return;
    if (time <= 0) { setPhase(OVER); SND.lose(); return; }
    const id = setTimeout(() => setTime(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, time]);

  useEffect(() => {
    if (phase !== OVER) return;
    if (!best || score > best) { saveBest(level, score); setBest(score); }
    recordGame("word", { score, won: score > 0, durationSec: cfg.time, difficulty: level });
  }, [phase]); // eslint-disable-line

  const start = () => {
    setScore(0); setStreak(0); setTime(cfg.time); setFeedback(null);
    recentRef.current = [];
    setPhase(PLAY);
    newRound();
    SND.click();
  };

  const pickLetter = (i) => {
    if (phase !== PLAY || letters[i].used) return;
    SND.click();
    setLetters(L => L.map((l, idx) => idx === i ? { ...l, used: true } : l));
    setPicked(p => [...p, i]);
  };

  const undo = () => {
    if (phase !== PLAY || picked.length === 0) return;
    SND.click();
    const last = picked[picked.length - 1];
    setLetters(L => L.map((l, idx) => idx === last ? { ...l, used: false } : l));
    setPicked(p => p.slice(0, -1));
  };

  const clear = () => {
    if (phase !== PLAY) return;
    SND.click();
    setLetters(L => L.map(l => ({ ...l, used: false })));
    setPicked([]);
  };

  // Auto-check when length matches
  useEffect(() => {
    if (phase !== PLAY || picked.length === 0 || picked.length !== word.length) return;
    const guess = picked.map(i => letters[i].ch).join("");
    if (guess === word) {
      const points = word.length + Math.floor(streak / 3);
      setScore(s => s + points);
      setStreak(s => s + 1);
      setFeedback({ ok: true, text: `+${points} 🎉` });
      SND.win();
      setTimeout(() => { setFeedback(null); newRound(); }, 600);
    } else {
      setStreak(0);
      setFeedback({ ok: false, text: "Try again" });
      SND.lose();
      setTimeout(() => {
        setFeedback(null);
        setLetters(L => L.map(l => ({ ...l, used: false })));
        setPicked([]);
      }, 700);
    }
  }, [picked, phase, word, letters, streak, newRound]);

  const skip = () => {
    if (phase !== PLAY) return;
    SND.click();
    setStreak(0);
    setTime(t => Math.max(0, t - 5));
    newRound();
  };

  return (
    <div className="math-page word-page">
      <div className="math-topbar">
        <button className="back-link" onClick={onBack}>← Back</button>
        <h2 className="math-title">📖 Word Scramble</h2>
        <div className="math-score-box">
          <span>Score <b>{score}</b></span>
          <span className={streak >= 3 ? "math-streak-hot" : ""}>🔥 {streak}</span>
          <span>Best <b>{best || 0}</b></span>
        </div>
      </div>

      {phase === PLAY && (
        <>
          <div className={`math-timebar${time <= 10 ? " math-timebar-warn" : ""}`}>
            <div className="math-timebar-fill" style={{ width: `${(time/cfg.time)*100}%` }} />
            <span className="math-time-text">{time}s</span>
          </div>

          <div className="word-stage">
            <div className="word-slots">
              {word.split("").map((_, i) => (
                <span key={i} className={`word-slot${picked[i] !== undefined ? " word-slot-filled" : ""}`}>
                  {picked[i] !== undefined ? letters[picked[i]].ch : ""}
                </span>
              ))}
            </div>
            <div className={`math-feedback ${feedback?.ok ? "math-feedback-ok" : feedback ? "math-feedback-bad" : ""}`}>
              {feedback?.text || " "}
            </div>
            <div className="word-tray">
              {letters.map((l, i) => (
                <button
                  key={i}
                  className={`word-tile${l.used ? " word-tile-used" : ""}`}
                  onClick={() => pickLetter(i)}
                  disabled={l.used}
                >
                  {l.ch}
                </button>
              ))}
            </div>
            <div className="word-actions">
              <button className="word-action-btn" onClick={undo}>↶ Undo</button>
              <button className="word-action-btn" onClick={clear}>✕ Clear</button>
              <button className="word-action-btn word-action-skip" onClick={skip}>Skip (-5s)</button>
            </div>
          </div>
        </>
      )}

      {phase === READY && (
        <div className="math-ready">
          <div className="math-ready-emoji">📖</div>
          <h3 className="math-ready-title">Word Scramble — {cfg.label}</h3>
          <p className="math-ready-text">Tap letters to spell the word.</p>
          <p className="math-ready-sub">{cfg.time}s · longer words = more points</p>
          <button className="math-start-btn" onClick={start}>▶ Start</button>
        </div>
      )}

      {phase === OVER && (
        <div className="math-ready">
          <div className="math-ready-emoji">{score > (best || 0) - 1 ? "🏆" : "⏰"}</div>
          <h3 className="math-ready-title">Time! Score: {score}</h3>
          <p className="math-ready-sub">Best: {best || score}</p>
          <button className="math-start-btn" onClick={start}>↻ Play Again</button>
        </div>
      )}

      <p className="math-tip">Tip: long words score bigger, and streaks add bonus points.</p>
    </div>
  );
}
