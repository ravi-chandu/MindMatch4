import React, { useEffect, useMemo, useState } from "react";
import { SND } from "../utils/gameHelpers.js";
import {
  AGE_GROUPS, CATEGORIES, SKILL_ICONS,
  filterGames,
} from "../utils/gameCatalog.js";
import ProgressBadge from "./ProgressBadge.jsx";

const LEVELS = [
  { id: "Easy", desc: "Relaxed play, great for beginners" },
  { id: "Medium", desc: "Balanced, thinks a few moves ahead" },
  { id: "Hard", desc: "Aggressive tactics, watch your diagonals" },
  { id: "Expert", desc: "Tournament-level search, no mercy" },
  { id: "Auto", desc: "Adapts to your skill over time" },
];

const MATH_LEVELS = [
  { id: "Tiny",   label: "Tiny",   desc: "Ages 4–5 · counting (1+1)" },
  { id: "Easy",   label: "Easy",   desc: "Ages 6–7 · add/sub to 10" },
  { id: "Medium", label: "Medium", desc: "Ages 8–9 · add/sub to 20" },
  { id: "Hard",   label: "Hard",   desc: "Ages 10–12 · times tables" },
  { id: "Pro",    label: "Pro",    desc: "Ages 13+ · all operations" },
];

export default function Home({
  difficulty, setDifficulty,
  onPlayAI, onPlay2P, onDaily,
  onPlayReversi, onWatchReversiDemo,
  reversiDifficulty, setReversiDifficulty,
  onPlayBattleship,
  battleshipDifficulty, setBattleshipDifficulty,
  onPlayGomoku,
  gomokuDifficulty, setGomokuDifficulty,
  onPlayTwenty48,
  onPlayMemory,
  memoryDifficulty, setMemoryDifficulty,
  onPlaySimon,
  onPlayMath,
  onPlayWord,
  onPlayStroop,
  onOpenDashboard,
  mathLevel, setMathLevel,
  wordLevel, setWordLevel,
  kidsMode, setKidsMode,
  p1Name, setP1Name,
  p2Name, setP2Name,
}) {
  const [soundOn, setSoundOn] = useState(
    () => JSON.parse(localStorage.getItem("mm4_sound_on") || "true")
  );
  const [picked, setPicked] = useState(null);
  const [selectedMode, setSelectedMode] = useState("ai");
  const [reversiMode, setReversiMode] = useState("ai");
  const [battleshipMode, setBattleshipMode] = useState("ai");
  const [gomokuMode, setGomokuMode] = useState("ai");
  const [memoryMode, setMemoryMode] = useState("solo");

  // Navigation state — persisted
  const [ageGroup, setAgeGroup] = useState(
    () => localStorage.getItem("mm4_age_group") || "all"
  );
  const [category, setCategory] = useState(
    () => localStorage.getItem("mm4_category") || "all"
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    SND.toggle(soundOn);
    localStorage.setItem("mm4_sound_on", JSON.stringify(soundOn));
  }, [soundOn]);
  useEffect(() => { localStorage.setItem("mm4_age_group", ageGroup); }, [ageGroup]);
  useEffect(() => { localStorage.setItem("mm4_category", category); }, [category]);

  const selectedLevel = LEVELS.find((x) => x.id === difficulty) || LEVELS[4];
  const selectedReversiLevel = LEVELS.find((x) => x.id === reversiDifficulty) || LEVELS[4];
  const selectedBsLevel = LEVELS.find((x) => x.id === battleshipDifficulty) || LEVELS[4];
  const selectedGomokuLevel = LEVELS.find((x) => x.id === gomokuDifficulty) || LEVELS[4];

  const filtered = useMemo(
    () => filterGames({ ageGroup, category, query }),
    [ageGroup, category, query]
  );

  const startConnect4 = () => {
    if (selectedMode === "ai") onPlayAI();
    else if (selectedMode === "2p") onPlay2P();
    else onDaily();
  };

  const selectedModeLabel =
    selectedMode === "ai" ? "Play vs AI" :
    selectedMode === "2p" ? "Local 2P" : "Daily Puzzle";

  return (
    <div className={`home${kidsMode ? " home-kids" : ""}`}>
      <div className="card home-card">
        {!picked && (
          <>
            <div className="home-hero">
              <h2 className="home-hero-title">
                {kidsMode ? "🌟 Brain Games for Kids 🌟" : "✦ MindMatch Hub ✦"}
              </h2>
              <p className="home-hero-sub">
                {kidsMode
                  ? "Pick a game and start playing!"
                  : "Train your brain · For ages 1 to 99"}
              </p>
            </div>

            <div className="home-toggles">
              <label className="home-toggle-pill">
                <input type="checkbox" checked={kidsMode} onChange={(e) => setKidsMode(e.target.checked)} />
                <span>🧒 Kids Mode</span>
              </label>
              <label className="home-toggle-pill">
                <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
                <span>🔊 Sound</span>
              </label>
              <ProgressBadge onOpen={onOpenDashboard} />
              <button className="home-toggle-pill home-dash-btn" onClick={onOpenDashboard}>
                <span>📊 Progress</span>
              </button>
            </div>

            <div className="home-search">
              <input
                type="text"
                className="home-search-input"
                placeholder="🔍 Search games (memory, math, strategy…)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="home-search-clear" onClick={() => setQuery("")} aria-label="Clear">×</button>
              )}
            </div>

            <div className="home-section-label">Pick your age</div>
            <div className="home-chips home-chips-age">
              {AGE_GROUPS.map(g => (
                <button
                  key={g.id}
                  className={`home-chip${ageGroup === g.id ? " home-chip-active" : ""}`}
                  onClick={() => { SND.hover(); setAgeGroup(g.id); }}
                >
                  <span className="home-chip-emoji">{g.emoji}</span>
                  <span className="home-chip-label">{g.label}</span>
                </button>
              ))}
            </div>

            <div className="home-section-label">Brain skill</div>
            <div className="home-chips home-chips-cat">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`home-chip home-chip-sm${category === c.id ? " home-chip-active" : ""}`}
                  onClick={() => { SND.hover(); setCategory(c.id); }}
                >
                  <span className="home-chip-emoji">{c.emoji}</span>
                  <span className="home-chip-label">{c.label}</span>
                </button>
              ))}
            </div>

            <div className="home-section-label home-section-result">
              {filtered.length} game{filtered.length === 1 ? "" : "s"} found
            </div>

            {filtered.length === 0 && (
              <div className="home-empty">
                <div className="home-empty-emoji">🤔</div>
                <p>No games match those filters yet.</p>
                <button
                  className="btn-primary"
                  onClick={() => { setAgeGroup("all"); setCategory("all"); setQuery(""); }}
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="game-picker">
              {filtered.map(g => (
                <button
                  key={g.id}
                  className={`game-pick-card game-pick-card-${g.id}${g.kidFriendly ? " game-pick-kid" : ""}`}
                  onMouseEnter={() => SND.hover()}
                  onClick={() => { SND.select(); setPicked(g.id); }}
                >
                  <span className="game-pick-icon">{g.icon}</span>
                  <span className="game-pick-name">{g.name}</span>
                  <span className="game-pick-desc">{g.tagline}</span>
                  <span className="game-pick-tags">
                    <span className="game-pick-age">
                      Ages {g.ages[0]}–{g.ages[1] === 99 ? "99+" : g.ages[1]}
                    </span>
                    {g.skills.map(s => {
                      const sk = SKILL_ICONS[s];
                      if (!sk) return null;
                      return (
                        <span key={s} className="game-pick-skill" style={{ "--skill-color": sk.color }}>
                          {sk.emoji} {sk.label}
                        </span>
                      );
                    })}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {picked === "connect4" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Connect Four</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>
            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button className={`mode-btn ${selectedMode === "ai" ? "active" : ""}`} onClick={() => setSelectedMode("ai")}>Play vs AI</button>
              <button className={`mode-btn ${selectedMode === "2p" ? "active" : ""}`} onClick={() => setSelectedMode("2p")}>Local 2P</button>
              <button className={`mode-btn ${selectedMode === "daily" ? "active" : ""}`} onClick={() => setSelectedMode("daily")}>Daily Puzzle</button>
            </div>
            {selectedMode === "2p" && <PlayerNameInputs p1Name={p1Name} setP1Name={setP1Name} p2Name={p2Name} setP2Name={setP2Name} />}
            <h3 className="section-label">Difficulty</h3>
            <LevelGrid value={difficulty} onChange={setDifficulty} levels={LEVELS} />
            <p className="level-desc selected">{selectedLevel.desc}</p>
            <button className="start-btn" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); startConnect4(); }}>
              Play: {selectedModeLabel}
            </button>
          </>
        )}

        {picked === "reversi" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Reversi</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>
            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button className={`mode-btn ${reversiMode === "ai" ? "active" : ""}`} onClick={() => setReversiMode("ai")}>Play vs AI</button>
              <button className={`mode-btn ${reversiMode === "2p" ? "active" : ""}`} onClick={() => setReversiMode("2p")}>Local 2P</button>
              <button className={`mode-btn ${reversiMode === "demo" ? "active" : ""}`} onClick={() => setReversiMode("demo")}>Watch Demo</button>
            </div>
            {reversiMode === "2p" && <PlayerNameInputs p1Name={p1Name} setP1Name={setP1Name} p2Name={p2Name} setP2Name={setP2Name} blackWhite />}
            {reversiMode !== "2p" && (
              <>
                <h3 className="section-label">Difficulty</h3>
                <LevelGrid value={reversiDifficulty} onChange={setReversiDifficulty} levels={LEVELS} />
                <p className="level-desc selected">{selectedReversiLevel.desc}</p>
              </>
            )}
            <button
              className="start-btn start-btn-reversi"
              onClick={() => { reversiMode === "demo" ? onWatchReversiDemo() : onPlayReversi(reversiMode); }}
            >
              {reversiMode === "demo" ? "Start Demo" : reversiMode === "2p" ? "Play: Local 2P" : "Play: vs AI"}
            </button>
          </>
        )}

        {picked === "battleship" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Battleship</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>
            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button className={`mode-btn ${battleshipMode === "ai" ? "active" : ""}`} onClick={() => setBattleshipMode("ai")}>Play vs AI</button>
              <button className={`mode-btn ${battleshipMode === "2p" ? "active" : ""}`} onClick={() => setBattleshipMode("2p")}>Local 2P</button>
            </div>
            {battleshipMode === "2p" && <PlayerNameInputs p1Name={p1Name} setP1Name={setP1Name} p2Name={p2Name} setP2Name={setP2Name} />}
            {battleshipMode !== "2p" && (
              <>
                <h3 className="section-label">Difficulty</h3>
                <LevelGrid value={battleshipDifficulty} onChange={setBattleshipDifficulty} levels={LEVELS} />
                <p className="level-desc selected">{selectedBsLevel.desc}</p>
              </>
            )}
            <button
              className="start-btn start-btn-battleship"
              onMouseEnter={() => SND.hover()}
              onClick={() => { SND.select(); onPlayBattleship(battleshipMode); }}
            >
              {battleshipMode === "2p" ? "Play: Local 2P" : "Play: vs AI"}
            </button>
          </>
        )}

        {picked === "gomoku" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Gomoku</h2>
            <p className="home-steps">Five in a row wins!</p>
            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button className={`mode-btn ${gomokuMode === "ai" ? "active" : ""}`} onClick={() => setGomokuMode("ai")}>Play vs AI</button>
              <button className={`mode-btn ${gomokuMode === "2p" ? "active" : ""}`} onClick={() => setGomokuMode("2p")}>Local 2P</button>
            </div>
            {gomokuMode === "2p" && <PlayerNameInputs p1Name={p1Name} setP1Name={setP1Name} p2Name={p2Name} setP2Name={setP2Name} blackWhite />}
            {gomokuMode !== "2p" && (
              <>
                <h3 className="section-label">Difficulty</h3>
                <LevelGrid value={gomokuDifficulty} onChange={setGomokuDifficulty} levels={LEVELS} />
                <p className="level-desc selected">{selectedGomokuLevel.desc}</p>
              </>
            )}
            <button
              className="start-btn start-btn-gomoku"
              onMouseEnter={() => SND.hover()}
              onClick={() => { SND.select(); onPlayGomoku(gomokuMode); }}
            >
              {gomokuMode === "2p" ? "Play: Local 2P" : "Play: vs AI"}
            </button>
          </>
        )}

        {picked === "twenty48" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">2048</h2>
            <p className="home-steps">Swipe (mobile) or arrow keys (desktop) to merge equal tiles.</p>
            <div className="home-howto">
              <h3 className="section-label">How to Play</h3>
              <ul className="home-howto-list">
                <li>Slide all tiles in one direction.</li>
                <li>Two tiles with the same number merge into one with double the value.</li>
                <li>A new tile spawns after every move. Plan ahead — corners are gold!</li>
              </ul>
            </div>
            <button className="start-btn start-btn-twenty48" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); onPlayTwenty48(); }}>
              Play: 2048
            </button>
          </>
        )}

        {picked === "memory" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Memory Match</h2>
            <p className="home-steps">Choose mode and difficulty, then press Play.</p>
            <h3 className="section-label">Mode</h3>
            <div className="mode-grid">
              <button className={`mode-btn ${memoryMode === "solo" ? "active" : ""}`} onClick={() => setMemoryMode("solo")}>Solo (Best Time)</button>
              <button className={`mode-btn ${memoryMode === "2p" ? "active" : ""}`} onClick={() => setMemoryMode("2p")}>Local 2P</button>
            </div>
            {memoryMode === "2p" && <PlayerNameInputs p1Name={p1Name} setP1Name={setP1Name} p2Name={p2Name} setP2Name={setP2Name} />}
            <h3 className="section-label">Deck Size</h3>
            <div className="level-grid compact">
              {["Easy","Medium","Hard","Expert"].map((l) => (
                <button key={l} className={`level-btn ${memoryDifficulty === l ? "active" : ""}`} onClick={() => setMemoryDifficulty(l)}>
                  <span className="level-name">{l}</span>
                </button>
              ))}
            </div>
            <p className="level-desc selected">
              {memoryDifficulty === "Easy" && "12 cards · 6 pairs · quick warm-up"}
              {memoryDifficulty === "Medium" && "16 cards · 8 pairs · balanced"}
              {memoryDifficulty === "Hard" && "20 cards · 10 pairs · sharper focus"}
              {memoryDifficulty === "Expert" && "24 cards · 12 pairs · brain-burner"}
            </p>
            <button className="start-btn start-btn-memory" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); onPlayMemory(memoryMode); }}>
              {memoryMode === "2p" ? "Play: Local 2P" : "Play: Solo"}
            </button>
          </>
        )}

        {picked === "simon" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Simon Says</h2>
            <p className="home-steps">Watch the colors light up — then tap them in the same order!</p>
            <div className="home-howto">
              <h3 className="section-label">Great for</h3>
              <ul className="home-howto-list">
                <li>💭 Working memory</li>
                <li>🎯 Focus & attention</li>
                <li>🧒 Ages 3+ — no reading needed!</li>
              </ul>
            </div>
            <button className="start-btn start-btn-simon" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); onPlaySimon(); }}>
              Play: Simon Says
            </button>
          </>
        )}

        {picked === "math" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Math Sprint</h2>
            <p className="home-steps">Solve as many problems as you can in 60 seconds. Streaks earn bonus points!</p>
            <h3 className="section-label">Difficulty</h3>
            <div className="level-grid compact">
              {MATH_LEVELS.map((l) => (
                <button key={l.id} className={`level-btn ${mathLevel === l.id ? "active" : ""}`} onClick={() => setMathLevel(l.id)}>
                  <span className="level-name">{l.label}</span>
                </button>
              ))}
            </div>
            <p className="level-desc selected">
              {(MATH_LEVELS.find(l => l.id === mathLevel) || MATH_LEVELS[2]).desc}
            </p>
            <button className="start-btn start-btn-math" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); onPlayMath(); }}>
              ▶ Start Sprint
            </button>
          </>
        )}

        {picked === "word" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Word Scramble</h2>
            <p className="home-steps">Unscramble letters before time runs out. Builds vocabulary!</p>
            <h3 className="section-label">Difficulty</h3>
            <div className="level-grid compact">
              {["Easy","Medium","Hard"].map((l) => (
                <button key={l} className={`level-btn ${wordLevel === l ? "active" : ""}`} onClick={() => setWordLevel(l)}>
                  <span className="level-name">{l}</span>
                </button>
              ))}
            </div>
            <p className="level-desc selected">
              {wordLevel === "Easy" && "3–4 letters · perfect for early readers"}
              {wordLevel === "Medium" && "6–7 letters · for confident spellers"}
              {wordLevel === "Hard" && "8+ letters · vocabulary boost"}
            </p>
            <button className="start-btn start-btn-word" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); onPlayWord(); }}>
              ▶ Start Scramble
            </button>
          </>
        )}

        {picked === "stroop" && (
          <>
            <BackBtn onClick={() => setPicked(null)} />
            <h2 className="home-game-title">Stroop Test</h2>
            <p className="home-steps">Tap the <b>color of the ink</b> — not the word! Trains focus.</p>
            <div className="home-howto">
              <h3 className="section-label">Great for</h3>
              <ul className="home-howto-list">
                <li>🎯 Cognitive control</li>
                <li>⚡ Reaction speed</li>
                <li>🧠 Used in clinical psychology research</li>
              </ul>
            </div>
            <button className="start-btn start-btn-stroop" onMouseEnter={() => SND.hover()} onClick={() => { SND.select(); onPlayStroop(); }}>
              ▶ Start Stroop
            </button>
          </>
        )}

        <div className="home-footer">
          <span className="tiny">Free · No ads · Works offline · v2.0</span>
        </div>
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button className="back-link" onClick={onClick}>
      ← Back to games
    </button>
  );
}

function LevelGrid({ value, onChange, levels }) {
  return (
    <div className="level-grid compact">
      {levels.map((l) => (
        <button key={l.id} className={`level-btn ${value === l.id ? "active" : ""}`} onClick={() => onChange(l.id)}>
          <span className="level-name">{l.id}</span>
        </button>
      ))}
    </div>
  );
}

function PlayerNameInputs({ p1Name, setP1Name, p2Name, setP2Name, blackWhite }) {
  return (
    <div className="name-inputs">
      <h3 className="section-label">Player Names</h3>
      <div className="name-row">
        <input
          className="name-input"
          type="text"
          placeholder={blackWhite ? "Player 1 (Black)" : "Player 1"}
          maxLength={16}
          value={p1Name}
          onChange={e => setP1Name(e.target.value)}
        />
        <span className="name-vs">vs</span>
        <input
          className="name-input"
          type="text"
          placeholder={blackWhite ? "Player 2 (White)" : "Player 2"}
          maxLength={16}
          value={p2Name}
          onChange={e => setP2Name(e.target.value)}
        />
      </div>
    </div>
  );
}
