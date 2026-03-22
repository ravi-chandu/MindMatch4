import React, { useEffect, useState } from "react";
import { SND } from "../utils/gameHelpers.js";

const LEVELS = [
  { id: "Easy", desc: "Relaxed play, great for beginners" },
  { id: "Medium", desc: "Balanced, thinks a few moves ahead" },
  { id: "Hard", desc: "Aggressive tactics, watch your diagonals" },
  { id: "Expert", desc: "Tournament-level search, no mercy" },
  { id: "Auto", desc: "Adapts to your skill over time" },
];

export default function Home({
  difficulty,
  setDifficulty,
  onPlayAI,
  onPlay2P,
  onDaily,
  onPlayReversi,
  onWatchReversiDemo,
  reversiDifficulty,
  setReversiDifficulty,
  onPlayBattleship,
  battleshipDifficulty,
  setBattleshipDifficulty,
  p1Name,
  setP1Name,
  p2Name,
  setP2Name,
}) {
  const [soundOn, setSoundOn] = useState(
    () => JSON.parse(localStorage.getItem("mm4_sound_on") || "true")
  );
  const [picked, setPicked] = useState(null); // null | "connect4" | "reversi" | "battleship"
  const [selectedMode, setSelectedMode] = useState("ai");
  const [reversiMode, setReversiMode] = useState("ai");
  const [battleshipMode, setBattleshipMode] = useState("ai");

  useEffect(() => {
    SND.toggle(soundOn);
    localStorage.setItem("mm4_sound_on", JSON.stringify(soundOn));
  }, [soundOn]);

  const selectedLevel = LEVELS.find((x) => x.id === difficulty) || LEVELS[4];
  const selectedReversiLevel = LEVELS.find((x) => x.id === reversiDifficulty) || LEVELS[4];
  const selectedBsLevel = LEVELS.find((x) => x.id === battleshipDifficulty) || LEVELS[4];

  const startConnect4 = () => {
    if (selectedMode === "ai") onPlayAI();
    else if (selectedMode === "2p") onPlay2P();
    else onDaily();
  };

  const selectedModeLabel =
    selectedMode === "ai"
      ? "Play vs AI"
      : selectedMode === "2p"
      ? "Local 2P"
      : "Daily Puzzle";

  return (
    <div className="home">
      <div className="card home-card">
        {/* ── Step 1: Pick a game ── */}
        {!picked && (
          <>
            <h2 className="home-pick-title">✦ Choose Your Arena ✦</h2>
            <div className="game-picker">
              <button 
                className="game-pick-card" 
                onMouseEnter={() => SND.hover()}
                onClick={() => { SND.select(); setPicked("connect4"); }}
              >
                <span className="game-pick-icon">⚡</span>
                <span className="game-pick-name">Connect Four</span>
                <span className="game-pick-desc">
                  Clash minds! Drop discs in an epic 4-in-a-row battle!
                </span>
              </button>
              <button 
                className="game-pick-card game-pick-card-reversi" 
                onMouseEnter={() => SND.hover()}
                onClick={() => { SND.select(); setPicked("reversi"); }}
              >
                <span className="game-pick-icon">🌀</span>
                <span className="game-pick-name">Reversi</span>
                <span className="game-pick-desc">
                  Flip the tide! Master the board in this strategic showdown!
                </span>
              </button>
              <button 
                className="game-pick-card game-pick-card-battleship" 
                onMouseEnter={() => SND.hover()}
                onClick={() => { SND.select(); setPicked("battleship"); }}
              >
                <span className="game-pick-icon">💥</span>
                <span className="game-pick-name">Battleship</span>
                <span className="game-pick-desc">
                  Command your fleet! Hunt and sink the enemy armada!
                </span>
              </button>
            </div>
          </>
        )}

        {/* ── Step 2a: Connect Four options ── */}
        {picked === "connect4" && (
          <>
            <button className="back-link" onClick={() => setPicked(null)}>
              ← Back to games
            </button>
            <h2 className="home-game-title">Connect Four</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>

            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button
                className={`mode-btn ${selectedMode === "ai" ? "active" : ""}`}
                onClick={() => setSelectedMode("ai")}
              >
                Play vs AI
              </button>
              <button
                className={`mode-btn ${selectedMode === "2p" ? "active" : ""}`}
                onClick={() => setSelectedMode("2p")}
              >
                Local 2P
              </button>
              <button
                className={`mode-btn ${selectedMode === "daily" ? "active" : ""}`}
                onClick={() => setSelectedMode("daily")}
              >
                Daily Puzzle
              </button>
            </div>

            {selectedMode === "2p" && (
              <div className="name-inputs">
                <h3 className="section-label">Player Names</h3>
                <div className="name-row">
                  <input className="name-input" type="text" placeholder="Player 1" maxLength={16} value={p1Name} onChange={e => setP1Name(e.target.value)} />
                  <span className="name-vs">vs</span>
                  <input className="name-input" type="text" placeholder="Player 2" maxLength={16} value={p2Name} onChange={e => setP2Name(e.target.value)} />
                </div>
              </div>
            )}

            <h3 className="section-label">Difficulty</h3>
            <div className="level-grid compact">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  className={`level-btn ${difficulty === l.id ? "active" : ""}`}
                  onClick={() => setDifficulty(l.id)}
                >
                  <span className="level-name">{l.id}</span>
                </button>
              ))}
            </div>
            <p className="level-desc selected">{selectedLevel.desc}</p>

            <button 
              className="start-btn" 
              onMouseEnter={() => SND.hover()}
              onClick={() => { SND.select(); startConnect4(); }}
            >
              Play: {selectedModeLabel}
            </button>
          </>
        )}

        {/* ── Step 2b: Reversi options ── */}
        {picked === "reversi" && (
          <>
            <button className="back-link" onClick={() => setPicked(null)}>
              ← Back to games
            </button>
            <h2 className="home-game-title">Reversi</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>

            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button
                className={`mode-btn ${reversiMode === "ai" ? "active" : ""}`}
                onClick={() => setReversiMode("ai")}
              >
                Play vs AI
              </button>
              <button
                className={`mode-btn ${reversiMode === "2p" ? "active" : ""}`}
                onClick={() => setReversiMode("2p")}
              >
                Local 2P
              </button>
              <button
                className={`mode-btn ${reversiMode === "demo" ? "active" : ""}`}
                onClick={() => setReversiMode("demo")}
              >
                Watch Demo
              </button>
            </div>

            {reversiMode === "2p" && (
              <div className="name-inputs">
                <h3 className="section-label">Player Names</h3>
                <div className="name-row">
                  <input className="name-input" type="text" placeholder="Player 1 (Black)" maxLength={16} value={p1Name} onChange={e => setP1Name(e.target.value)} />
                  <span className="name-vs">vs</span>
                  <input className="name-input" type="text" placeholder="Player 2 (White)" maxLength={16} value={p2Name} onChange={e => setP2Name(e.target.value)} />
                </div>
              </div>
            )}

            {reversiMode !== "2p" && (
              <>
                <h3 className="section-label">Difficulty</h3>
                <div className="level-grid compact">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      className={`level-btn ${reversiDifficulty === l.id ? "active" : ""}`}
                      onClick={() => setReversiDifficulty(l.id)}
                    >
                      <span className="level-name">{l.id}</span>
                    </button>
                  ))}
                </div>
                <p className="level-desc selected">{selectedReversiLevel.desc}</p>
              </>
            )}

            <button
              className="start-btn start-btn-reversi"
              onClick={() => {
                if (reversiMode === "demo") onWatchReversiDemo();
                else onPlayReversi(reversiMode);
              }}
            >
              {reversiMode === "demo" ? "Start Demo" : reversiMode === "2p" ? "Play: Local 2P" : "Play: vs AI"}
            </button>
          </>
        )}

        {/* ── Step 2c: Battleship options ── */}
        {picked === "battleship" && (
          <>
            <button className="back-link" onClick={() => setPicked(null)}>
              ← Back to games
            </button>
            <h2 className="home-game-title">Battleship</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>

            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button
                className={`mode-btn ${battleshipMode === "ai" ? "active" : ""}`}
                onClick={() => setBattleshipMode("ai")}
              >
                Play vs AI
              </button>
              <button
                className={`mode-btn ${battleshipMode === "2p" ? "active" : ""}`}
                onClick={() => setBattleshipMode("2p")}
              >
                Local 2P
              </button>
            </div>

            {battleshipMode === "2p" && (
              <div className="name-inputs">
                <h3 className="section-label">Player Names</h3>
                <div className="name-row">
                  <input className="name-input" type="text" placeholder="Player 1" maxLength={16} value={p1Name} onChange={e => setP1Name(e.target.value)} />
                  <span className="name-vs">vs</span>
                  <input className="name-input" type="text" placeholder="Player 2" maxLength={16} value={p2Name} onChange={e => setP2Name(e.target.value)} />
                </div>
              </div>
            )}

            {battleshipMode !== "2p" && (
              <>
                <h3 className="section-label">Difficulty</h3>
                <div className="level-grid compact">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      className={`level-btn ${battleshipDifficulty === l.id ? "active" : ""}`}
                      onClick={() => setBattleshipDifficulty(l.id)}
                    >
                      <span className="level-name">{l.id}</span>
                    </button>
                  ))}
                </div>
                <p className="level-desc selected">{selectedBsLevel.desc}</p>
              </>
            )}

            <button
              className="bs-start-btn"
              onMouseEnter={() => SND.hover()}
              onClick={() => { SND.select(); onPlayBattleship(battleshipMode); }}
            >
              {battleshipMode === "2p" ? "Play: Local 2P" : "Play: vs AI"}
            </button>
          </>
        )}

        <div className="home-footer">
          <label className="sound-toggle">
            <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
            Sound {soundOn ? "On" : "Off"}
          </label>
          <span className="tiny">Keyboard: Left/Right + Enter</span>
        </div>
      </div>
    </div>
  );
}
