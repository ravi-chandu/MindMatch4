import React, { useEffect, useRef, useState, useCallback } from "react";
import { SND } from "../utils/gameHelpers.js";
import {
  PADS, makeSequence, nextStep, stepDuration,
  loadBest, saveBest,
} from "../utils/simonHelpers.js";
import { recordGame } from "../utils/progress.js";

const PHASE_IDLE   = "idle";
const PHASE_SHOW   = "show";   // pads playing back
const PHASE_INPUT  = "input";  // waiting for player taps
const PHASE_OVER   = "over";

function playPadTone(freq) {
  try {
    SND.play({ freq, dur: 0.18, type: "sine", gain: 0.07, attack: 0.01, decay: 0.08 });
  } catch {}
}

export default function SimonGame({ onBack, kidsMode = false }) {
  const [seq, setSeq] = useState([]);
  const [step, setStep] = useState(0);          // index into seq during input
  const [phase, setPhase] = useState(PHASE_IDLE);
  const [highlight, setHighlight] = useState(-1);
  const [best, setBest] = useState(loadBest);
  const [streakBurst, setStreakBurst] = useState(false);

  const timeoutsRef = useRef([]);
  const clearTimers = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  // Persist best
  useEffect(() => {
    const score = seq.length - 1;
    if (phase === PHASE_OVER && score > best) {
      setBest(score);
      saveBest(score);
    }
    if (phase === PHASE_OVER) {
      recordGame("simon", { score, won: score >= 3, durationSec: score * 2 });
    }
  }, [phase, seq.length, best]);

  /** Show the sequence to the player. */
  const playSequence = useCallback((toShow) => {
    clearTimers();
    setPhase(PHASE_SHOW);
    setStep(0);
    setHighlight(-1);
    const dur = stepDuration(toShow.length);

    toShow.forEach((padId, i) => {
      const tOn = setTimeout(() => {
        setHighlight(padId);
        playPadTone(PADS[padId].freq);
      }, i * (dur + 120));
      const tOff = setTimeout(() => {
        setHighlight(-1);
      }, i * (dur + 120) + dur);
      timeoutsRef.current.push(tOn, tOff);
    });

    const tEnd = setTimeout(() => {
      setHighlight(-1);
      setPhase(PHASE_INPUT);
      setStep(0);
    }, toShow.length * (stepDuration(toShow.length) + 120) + 100);
    timeoutsRef.current.push(tEnd);
  }, []);

  function startGame() {
    SND.select();
    const fresh = makeSequence(1);
    setSeq(fresh);
    setStep(0);
    setTimeout(() => playSequence(fresh), 400);
  }

  function handlePadTap(padId) {
    if (phase !== PHASE_INPUT) return;

    // Brief flash + tone
    setHighlight(padId);
    playPadTone(PADS[padId].freq);
    const t = setTimeout(() => setHighlight(-1), 180);
    timeoutsRef.current.push(t);

    const expected = seq[step];
    if (padId !== expected) {
      // Wrong!
      SND.lose();
      setPhase(PHASE_OVER);
      return;
    }

    const nextStepIdx = step + 1;
    if (nextStepIdx >= seq.length) {
      // Round complete — extend sequence
      setStreakBurst(true);
      setTimeout(() => setStreakBurst(false), 600);
      SND.click();
      setStep(0);
      const grown = nextStep(seq);
      setTimeout(() => {
        setSeq(grown);
        playSequence(grown);
      }, 700);
    } else {
      setStep(nextStepIdx);
    }
  }

  function reset() {
    clearTimers();
    setSeq([]);
    setStep(0);
    setHighlight(-1);
    setPhase(PHASE_IDLE);
  }

  const score = Math.max(0, seq.length - 1);
  const showProgress = phase === PHASE_SHOW || phase === PHASE_INPUT;

  const status = (() => {
    if (phase === PHASE_IDLE) return kidsMode ? "Tap Start to play!" : "Press Start to begin a new round.";
    if (phase === PHASE_SHOW) return "Watch closely…";
    if (phase === PHASE_INPUT) return kidsMode ? "Your turn — copy the colors!" : `Your turn (${step}/${seq.length})`;
    if (phase === PHASE_OVER) return kidsMode ? "Oops! Try again 💪" : "Wrong pad — game over!";
    return "";
  })();

  return (
    <div className={`simon-page${kidsMode ? " kids-mode" : ""}`}>
      {/* ── Top bar ── */}
      <header className="simon-topbar">
        <div className="simon-topbar-left">
          <button className="gk-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="simon-title">Simon Says</h1>
        </div>
        <div className="simon-stats">
          <div className="simon-score-box">
            <div className="simon-score-label">SCORE</div>
            <div className={`simon-score-val${streakBurst ? " simon-score-pop" : ""}`}>{score}</div>
          </div>
          <div className="simon-score-box">
            <div className="simon-score-label">BEST</div>
            <div className="simon-score-val">{best}</div>
          </div>
        </div>
        <div className="simon-topbar-right">
          <button className="gk-icon-btn" onClick={reset} title="Restart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      <p className="simon-status" role="status" aria-live="polite">{status}</p>

      {/* ── Pad ── */}
      <div className="simon-stage">
        <div className={`simon-pad${phase === PHASE_SHOW ? " simon-pad-locked" : ""}`}>
          {PADS.map(p => (
            <button
              key={p.id}
              className={`simon-quad simon-quad-${p.label}${highlight === p.id ? " simon-quad-active" : ""}`}
              onClick={() => handlePadTap(p.id)}
              disabled={phase !== PHASE_INPUT}
              aria-label={p.label}
              style={{ "--pad-color": p.color }}
            />
          ))}
          <div className="simon-center">
            {phase === PHASE_IDLE && (
              <button className="simon-start" onClick={startGame}>▶ Start</button>
            )}
            {phase === PHASE_SHOW && (
              <div className="simon-center-text">👀</div>
            )}
            {phase === PHASE_INPUT && (
              <div className="simon-center-text simon-center-progress">
                <div className="simon-progress-track">
                  <div
                    className="simon-progress-fill"
                    style={{ width: `${(step / Math.max(1, seq.length)) * 100}%` }}
                  />
                </div>
                <div className="simon-step-counter">{step}/{seq.length}</div>
              </div>
            )}
            {phase === PHASE_OVER && (
              <button className="simon-start" onClick={startGame}>↻ Again</button>
            )}
          </div>
        </div>
      </div>

      <div className="simon-tip">
        {kidsMode
          ? "Watch the lights, then tap them in the same order!"
          : "Watch the sequence, then repeat it. Each round adds one more step."}
      </div>

      {/* ── End modal ── */}
      {phase === PHASE_OVER && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`dialog ${score >= best && score > 0 ? "dialog-win" : ""}`}>
            <div className="dialog-emoji">{score >= best && score > 0 ? "🏆" : "🧠"}</div>
            <h2 className="dialog-title">
              {score === 0 ? "Try again!" : `${score} step${score === 1 ? "" : "s"}!`}
            </h2>
            <p className="dialog-talk">
              {score >= best && score > 0
                ? "New personal best! 🎉"
                : `Best so far: ${best} step${best === 1 ? "" : "s"}.`}
            </p>
            <div className="actions">
              <button className="btn-primary" onClick={startGame}>Play Again</button>
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
