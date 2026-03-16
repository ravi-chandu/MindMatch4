import React, { useEffect, useState } from "react";
import { SND } from "../utils/gameHelpers.js";

const LEVELS = [
  { id: "Easy",   icon: "🟢", desc: "Relaxed play, great for beginners" },
  { id: "Medium", icon: "🟡", desc: "Balanced — thinks a few moves ahead" },
  { id: "Hard",   icon: "🟠", desc: "Aggressive tactics, watch your diagonals" },
  { id: "Expert", icon: "🔴", desc: "Tournament-level search, no mercy" },
  { id: "Auto",   icon: "🤖", desc: "Adapts to your skill over time" },
];

export default function Home({ difficulty, setDifficulty, onPlayAI, onPlay2P, onDaily }) {
  const [soundOn, setSoundOn] = useState(
    () => JSON.parse(localStorage.getItem("mm4_sound_on") || "true")
  );
  useEffect(() => {
    SND.toggle(soundOn);
    localStorage.setItem("mm4_sound_on", JSON.stringify(soundOn));
  }, [soundOn]);

  return (
    <div className="home">
      <div className="card home-card">
        <p className="home-tagline">
          Connect <b>four</b> in a row. Outsmart the AI. Prove you're the best.
        </p>

        <h3 className="section-label">Difficulty</h3>
        <div className="level-grid">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              className={`level-btn ${difficulty === l.id ? "active" : ""}`}
              onClick={() => setDifficulty(l.id)}
            >
              <span className="level-icon">{l.icon}</span>
              <span className="level-name">{l.id}</span>
              <span className="level-desc">{l.desc}</span>
            </button>
          ))}
        </div>

        <h3 className="section-label">Play</h3>
        <div className="play-grid">
          <button className="play-btn primary" onClick={onPlayAI}>
            <span className="play-emoji">🧠</span>Play vs AI
          </button>
          <button className="play-btn" onClick={onPlay2P}>
            <span className="play-emoji">👫</span>Local 2P
          </button>
          <button className="play-btn" onClick={onDaily}>
            <span className="play-emoji">📅</span>Daily Puzzle
          </button>
        </div>

        <div className="home-footer">
          <label className="sound-toggle">
            <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
            Sound {soundOn ? "On" : "Off"}
          </label>
          <span className="tiny">Keyboard: ←/→ + Enter</span>
        </div>
      </div>
    </div>
  );
}
