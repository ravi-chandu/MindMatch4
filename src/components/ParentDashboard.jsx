import React from "react";
import { ACHIEVEMENTS, getProgress, levelFromXp, resetProgress } from "../utils/progress.js";

const SKILL_LABEL = {
  connect4: "Connect Four", reversi: "Reversi", battleship: "Battleship",
  gomoku: "Gomoku", twenty48: "2048", memory: "Memory Match",
  simon: "Simon Says", math: "Math Sprint", word: "Word Scramble", stroop: "Stroop Test",
};

export default function ParentDashboard({ onClose }) {
  const p = getProgress();
  const lvl = levelFromXp(p.xp);
  const totalSec = Object.values(p.perGame).reduce((s, g) => s + (g.totalSec || 0), 0);
  const minutes = Math.round(totalSec / 60);

  const games = Object.entries(p.perGame).sort((a,b) => b[1].plays - a[1].plays);
  const unlocked = new Set(p.unlocked);

  const reset = () => {
    if (confirm("Reset ALL progress, XP, streak and achievements? This cannot be undone.")) {
      resetProgress();
      dispatchEvent(new Event("mm4:progress"));
      onClose();
    }
  };

  return (
    <div className="dash-overlay" role="dialog" aria-modal="true">
      <div className="dash-card">
        <div className="dash-head">
          <h2>📊 Progress Dashboard</h2>
          <button className="dash-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="dash-stats">
          <div className="dash-stat"><span className="dash-stat-num">Lv {lvl.level}</span><span className="dash-stat-lbl">Brain Level</span></div>
          <div className="dash-stat"><span className="dash-stat-num">🔥 {p.streak}</span><span className="dash-stat-lbl">Day Streak</span></div>
          <div className="dash-stat"><span className="dash-stat-num">{p.totalGames}</span><span className="dash-stat-lbl">Games Played</span></div>
          <div className="dash-stat"><span className="dash-stat-num">{minutes}m</span><span className="dash-stat-lbl">Time Trained</span></div>
          <div className="dash-stat"><span className="dash-stat-num">{p.xp}</span><span className="dash-stat-lbl">Total XP</span></div>
          <div className="dash-stat"><span className="dash-stat-num">{p.longestStreak}</span><span className="dash-stat-lbl">Longest Streak</span></div>
        </div>

        <h3 className="dash-h3">Per-Game Progress</h3>
        {games.length === 0 && <p className="dash-empty">No games played yet — go try one!</p>}
        <div className="dash-games">
          {games.map(([id, g]) => (
            <div key={id} className="dash-game-row">
              <div className="dash-game-name">{SKILL_LABEL[id] || id}</div>
              <div className="dash-game-bars">
                <span>Plays: <b>{g.plays}</b></span>
                <span>Wins: <b>{g.wins || 0}</b></span>
                <span>Best: <b>{g.bestScore || 0}</b></span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="dash-h3">Achievements ({p.unlocked.length}/{ACHIEVEMENTS.length})</h3>
        <div className="dash-achievements">
          {ACHIEVEMENTS.map(a => {
            const got = unlocked.has(a.id);
            return (
              <div key={a.id} className={`dash-ach${got ? " dash-ach-on" : ""}`} title={a.desc}>
                <span className="dash-ach-emoji">{got ? a.emoji : "🔒"}</span>
                <span className="dash-ach-name">{a.name}</span>
                <span className="dash-ach-desc">{a.desc}</span>
              </div>
            );
          })}
        </div>

        <div className="dash-foot">
          <button className="dash-reset" onClick={reset}>Reset progress</button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
