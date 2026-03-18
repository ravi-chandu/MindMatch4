import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SND } from "../utils/gameHelpers.js";
import BattleshipBoard from "./BattleshipBoard.jsx";
import GameTimer from "./GameTimer.jsx";
import {
  BS_SIZE,
  SHIPS,
  WATER,
  createEmptyGrid,
  createShipRegistry,
  getGhostCells,
  placeShip,
  randomPlacement,
  shoot,
  shipsRemaining,
  pickAIShot,
  cellLabel,
} from "../utils/battleshipHelpers.js";

const TIMER_SECONDS = 900; // 15 min total (AI mode)
const TIMER_PER_PLAYER = 450; // 7.5 min each (2P mode)

export default function BattleshipGame({
  mode = "ai",
  difficulty = "Hard",
  onBack,
}) {
  const is2P = mode === "2p";

  /* ── Phase: setup → setup_p2 → battle → end ── */
  const [phase, setPhase] = useState("setup");

  /* ── Player 1 state ── */
  const [p1Grid, setP1Grid] = useState(createEmptyGrid);
  const [p1Registry, setP1Registry] = useState(createShipRegistry);
  const [p1Attack, setP1Attack] = useState(createEmptyGrid);

  /* ── Player 2 / AI state ── */
  const [p2Grid, setP2Grid] = useState(createEmptyGrid);
  const [p2Registry, setP2Registry] = useState(createShipRegistry);
  const [p2Attack, setP2Attack] = useState(createEmptyGrid);

  /* ── Setup state ── */
  const [currentShip, setCurrentShip] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverCell, setHoverCell] = useState(null);

  /* ── Battle state ── */
  const [turn, setTurn] = useState(1); // 1 = P1/human, 2 = P2/AI
  const [lastShot, setLastShot] = useState(null);
  const [lastShotBy, setLastShotBy] = useState(null);
  const [coachNote, setCoachNote] = useState(
    "Place your Carrier (5 cells). Click a cell to position it."
  );
  const [end, setEnd] = useState(null);

  /* ── Timer ── */
  const [timerKey, setTimerKey] = useState(0);
  const timerPaused = phase !== "battle" || !!end;

  /* ── Per-player timers (2P) ── */
  const [p1Time, setP1Time] = useState(TIMER_PER_PLAYER);
  const [p2Time, setP2Time] = useState(TIMER_PER_PLAYER);

  useEffect(() => {
    if (!is2P || phase !== "battle" || end) return;
    const id = setInterval(() => {
      if (turn === 1) {
        setP1Time((t) => {
          if (t <= 1) { finishGame("p2"); return 0; }
          return t - 1;
        });
      } else {
        setP2Time((t) => {
          if (t <= 1) { finishGame("p1"); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [is2P, phase, end, turn]);

  /* ── Ghost preview during setup ── */
  const ghost = useMemo(() => {
    if ((phase !== "setup" && phase !== "setup_p2") || !hoverCell || currentShip >= SHIPS.length)
      return { cells: [], valid: false };
    const activeGrid = phase === "setup_p2" ? p2Grid : p1Grid;
    return getGhostCells(
      activeGrid,
      SHIPS[currentShip].size,
      hoverCell.row,
      hoverCell.col,
      horizontal
    );
  }, [phase, hoverCell, currentShip, horizontal, p1Grid, p2Grid]);

  /* ── Setup: place a ship ── */
  function handlePlaceShip(cell) {
    if (currentShip >= SHIPS.length) return;

    const isP2Setup = phase === "setup_p2";
    const grid = isP2Setup ? p2Grid : p1Grid;
    const reg = isP2Setup ? p2Registry : p1Registry;

    const result = placeShip(grid, reg, currentShip, cell.row, cell.col, horizontal);
    if (!result) {
      SND.click();
      return;
    }

    SND.drop();
    if (isP2Setup) {
      setP2Grid(result.grid);
      setP2Registry(result.registry);
    } else {
      setP1Grid(result.grid);
      setP1Registry(result.registry);
    }

    const nextShip = currentShip + 1;
    setCurrentShip(nextShip);

    if (nextShip < SHIPS.length) {
      setCoachNote(
        `${SHIPS[nextShip].emoji} Place your ${SHIPS[nextShip].name} (${SHIPS[nextShip].size} cells).`
      );
    } else {
      setCoachNote("All ships placed! Press Start Battle when ready.");
    }
  }

  /* ── Setup: random placement ── */
  function handleRandomPlace() {
    const { grid, registry } = randomPlacement();
    if (phase === "setup_p2") {
      setP2Grid(grid);
      setP2Registry(registry);
    } else {
      setP1Grid(grid);
      setP1Registry(registry);
    }
    setCurrentShip(SHIPS.length);
    setCoachNote("Fleet auto‑deployed! Press Start Battle when ready.");
    SND.drop();
  }

  /* ── Transition from setup to battle ── */
  function startBattle() {
    if (currentShip < SHIPS.length) return;

    if (phase === "setup" && is2P) {
      setPhase("setup_p2");
      setCurrentShip(0);
      setHorizontal(true);
      setCoachNote(
        "Player 2: Place your Carrier (5 cells). Click a cell to position it."
      );
      return;
    }

    // AI: generate AI fleet
    if (!is2P) {
      const ai = randomPlacement();
      setP2Grid(ai.grid);
      setP2Registry(ai.registry);
    }

    setPhase("battle");
    setTurn(1);
    setTimerKey((k) => k + 1);
    setCoachNote("Battle started! Click enemy waters to fire. 🎯");
    SND.win();
  }

  /* ── Battle: human fires ── */
  const handlePlayerShot = useCallback(
    (cell) => {
      if (phase !== "battle" || end) return;

      const isP1Turn = turn === 1;
      const attackGrid = isP1Turn ? p1Attack : p2Attack;
      const defGrid = isP1Turn ? p2Grid : p1Grid;
      const defReg = isP1Turn ? p2Registry : p1Registry;

      const result = shoot(attackGrid, defGrid, defReg, cell.row, cell.col);
      if (!result) return;

      const label = cellLabel(cell.row, cell.col);
      setLastShot({ row: cell.row, col: cell.col });
      setLastShotBy(isP1Turn ? 1 : 2);

      if (isP1Turn) {
        setP1Attack(result.attackGrid);
        setP2Grid(result.defenderGrid);
        setP2Registry(result.defenderRegistry);
      } else {
        setP2Attack(result.attackGrid);
        setP1Grid(result.defenderGrid);
        setP1Registry(result.defenderRegistry);
      }

      if (result.gameOver) {
        const winner = isP1Turn ? "p1" : "p2";
        finishGame(winner);
        return;
      }

      if (result.sunk) {
        SND.sinkShip();
        setCoachNote(
          `💥 ${label} — ${result.sunkShipName} sunk! ${shipsRemaining(result.defenderRegistry)} ships left.`
        );
      } else if (result.hit) {
        SND.explode();
        setCoachNote(`🔥 ${label} — Hit! Keep firing nearby.`);
      } else {
        SND.splash();
        setCoachNote(`🌊 ${label} — Miss. Water splashes harmlessly.`);
      }

      // Switch turn
      if (is2P) {
        setTurn(isP1Turn ? 2 : 1);
      } else {
        setTurn(2);
      }
    },
    [phase, end, turn, p1Attack, p2Attack, p1Grid, p2Grid, p1Registry, p2Registry, is2P]
  );

  /* ── AI turn ── */
  useEffect(() => {
    if (phase !== "battle" || end || is2P || turn !== 2) return;

    const timer = setTimeout(() => {
      const shot = pickAIShot(p2Attack, p1Registry, difficulty);
      if (!shot) return;

      const result = shoot(p2Attack, p1Grid, p1Registry, shot.row, shot.col);
      if (!result) {
        setTurn(1);
        return;
      }

      const label = cellLabel(shot.row, shot.col);
      setLastShot({ row: shot.row, col: shot.col });
      setLastShotBy(2);
      setP2Attack(result.attackGrid);
      setP1Grid(result.defenderGrid);
      setP1Registry(result.defenderRegistry);

      if (result.gameOver) {
        finishGame("p2");
        return;
      }

      if (result.sunk) {
        SND.sinkShip();
        setCoachNote(
          `⚠️ Enemy fires ${label} — your ${result.sunkShipName} is sunk!`
        );
      } else if (result.hit) {
        SND.explode();
        setCoachNote(`⚠️ Enemy fires ${label} — Hit on your fleet!`);
      } else {
        SND.splash();
        setCoachNote(`Enemy fires ${label} — miss! Your fleet is safe.`);
      }

      setTurn(1);
    }, 700);

    return () => clearTimeout(timer);
  }, [phase, end, turn, is2P, p2Attack, p1Grid, p1Registry, difficulty]);

  /* ── Game end ── */
  function finishGame(winner) {
    if (winner === "p1") {
      SND.win();
      setEnd(is2P ? "p1_win" : "player_win");
      setCoachNote("All enemy ships destroyed! Victory is yours! 🎉");
    } else {
      SND.lose();
      setEnd(is2P ? "p2_win" : "ai_win");
      setCoachNote(
        is2P
          ? "Player 2 destroyed all ships! Well played."
          : "The enemy sank your entire fleet. Better luck next time!"
      );
    }
  }

  function handleTimeUp() {
    if (end) return;
    const p1Sunk = SHIPS.length - shipsRemaining(p2Registry);
    const p2Sunk = SHIPS.length - shipsRemaining(p1Registry);
    if (p1Sunk > p2Sunk) finishGame("p1");
    else if (p2Sunk > p1Sunk) finishGame("p2");
    else finishGame(turn === 1 ? "p2" : "p1");
  }

  /* ── Reset ── */
  function resetGame() {
    setPhase("setup");
    setP1Grid(createEmptyGrid());
    setP1Registry(createShipRegistry());
    setP1Attack(createEmptyGrid());
    setP2Grid(createEmptyGrid());
    setP2Registry(createShipRegistry());
    setP2Attack(createEmptyGrid());
    setCurrentShip(0);
    setHorizontal(true);
    setHoverCell(null);
    setTurn(1);
    setLastShot(null);
    setLastShotBy(null);
    setEnd(null);
    setTimerKey((k) => k + 1);
    setP1Time(TIMER_PER_PLAYER);
    setP2Time(TIMER_PER_PLAYER);
    setCoachNote(
      "Place your Carrier (5 cells). Click a cell to position it."
    );
  }

  /* ── Derived ── */
  const setupComplete = currentShip >= SHIPS.length;
  const p1Remaining = shipsRemaining(p1Registry);
  const p2Remaining = shipsRemaining(p2Registry);

  const statusText = end
    ? end === "player_win" || end === "p1_win"
      ? is2P ? "Player 1 wins!" : "You win!"
      : is2P ? "Player 2 wins!" : "Enemy wins"
    : phase === "setup"
    ? is2P ? "Player 1: Deploy your fleet" : "Deploy your fleet"
    : phase === "setup_p2"
    ? "Player 2: Deploy your fleet"

    : is2P
    ? `Player ${turn}'s turn to fire`
    : turn === 1
    ? "Your turn — fire!"
    : "Enemy is targeting…";

  const endTitle = end === "player_win" || end === "p1_win"
    ? is2P ? "Player 1 Wins!" : "Victory!"
    : is2P ? "Player 2 Wins!" : "Defeat";
  const endEmoji = end === "player_win" || end === "p1_win" ? "🎉" : "💀";

  /* ── Keyboard: R to rotate during setup ── */
  useEffect(() => {
    const handler = (e) => {
      if ((phase === "setup" || phase === "setup_p2") && (e.key === "r" || e.key === "R")) {
        setHorizontal((h) => !h);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  /* ── Render ── */
  return (
    <div className="bs-page">
      {/* ── Top bar ── */}
      <header className="bs-topbar">
        <div className="bs-topbar-left">
          <button className="rv-icon-btn" onClick={onBack} title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="bs-title">Battleship</h1>
          <span className="bs-badge">{is2P ? "2P" : difficulty}</span>
        </div>

        <div className="bs-topbar-center">
          {phase === "battle" && (
            <div className="bs-fleet-status">
              <span className="bs-fleet-count bs-fleet-you" title="Your ships remaining">
                🚢 {is2P ? `P1: ${p1Remaining}` : `You: ${p1Remaining}`}
              </span>
              <span className="bs-fleet-sep">|</span>
              <span className="bs-fleet-count bs-fleet-enemy" title="Enemy ships remaining">
                💀 {is2P ? `P2: ${p2Remaining}` : `AI: ${p2Remaining}`}
              </span>
            </div>
          )}
        </div>

        <div className="bs-topbar-right">
          {phase === "battle" && !is2P && (
            <GameTimer
              key={timerKey}
              seconds={TIMER_SECONDS}
              paused={timerPaused}
              onTimeUp={handleTimeUp}
            />
          )}
          <button className="rv-icon-btn" onClick={resetGame} title="New game">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      {/* ── Status ── */}
      <p className="bs-status" role="status" aria-live="polite">{statusText}</p>

      {/* ── Setup phase ── */}
      {(phase === "setup" || phase === "setup_p2") && (
        <div className="bs-setup">
          <div className="bs-setup-board">
            <BattleshipBoard
              grid={phase === "setup_p2" ? p2Grid : p1Grid}
              registry={phase === "setup_p2" ? p2Registry : p1Registry}
              mode="setup"
              onCellClick={handlePlaceShip}
              onCellHover={setHoverCell}
              ghostCells={ghost.cells}
              ghostValid={ghost.valid}
              locked={setupComplete}
              label="Your Fleet"
            />
          </div>

          <div className="bs-setup-panel">
            <h3 className="bs-panel-title">Ships</h3>
            <ul className="bs-ship-list">
              {SHIPS.map((s, i) => {
                const reg = phase === "setup_p2" ? p2Registry : p1Registry;
                const placed = reg[i].cells.length > 0;
                const active = i === currentShip;
                return (
                  <li
                    key={s.id}
                    className={`bs-ship-item ${placed ? "placed" : ""} ${active ? "active" : ""}`}
                  >
                    <span className="bs-ship-emoji">{s.emoji}</span>
                    <span className="bs-ship-name">{s.name}</span>
                    <span className="bs-ship-dots">
                      {Array.from({ length: s.size }, (_, j) => (
                        <span key={j} className="bs-ship-dot" />
                      ))}
                    </span>
                    {placed && <span className="bs-ship-check">✓</span>}
                  </li>
                );
              })}
            </ul>

            <div className="bs-setup-controls">
              <button
                className="bs-ctrl-btn"
                onClick={() => setHorizontal((h) => !h)}
                title="Rotate ship (R)"
              >
                🔄 {horizontal ? "Horizontal" : "Vertical"}
              </button>
              <button className="bs-ctrl-btn" onClick={handleRandomPlace}>
                🎲 Auto‑place
              </button>
            </div>

            <button
              className={`bs-start-btn ${setupComplete ? "" : "disabled"}`}
              onClick={startBattle}
              disabled={!setupComplete}
            >
              {phase === "setup" && is2P ? "Next: Player 2" : "⚔️ Start Battle"}
            </button>
          </div>
        </div>
      )}

      {/* ── Battle phase ── */}
      {phase === "battle" && !end && (
        <div className="bs-battle">
          <div className="bs-battle-grids">
            {is2P ? (
              <>
                {/* P1 waters — P2 fires here */}
                <div className="bs-board-col">
                  <div className={`bs-col-tag${turn === 2 ? " bs-col-tag-active" : ""}`}>
                    <span>Player 1{turn === 2 && " — 🎯 P2 firing"}</span>
                    <span className={`bs-player-timer${turn === 1 ? " bs-timer-active" : ""}${p1Time <= 60 ? " bs-timer-warn" : ""}`}>
                      ⏱ {String(Math.floor(p1Time / 60)).padStart(2, "0")}:{String(p1Time % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <BattleshipBoard
                    grid={p2Attack}
                    mode="attack"
                    onCellClick={turn === 2 ? handlePlayerShot : undefined}
                    lastShot={lastShotBy === 2 ? lastShot : null}
                    locked={end || turn !== 2}
                    label=""
                  />
                </div>
                {/* P2 waters — P1 fires here */}
                <div className="bs-board-col">
                  <div className={`bs-col-tag${turn === 1 ? " bs-col-tag-active" : ""}`}>
                    <span>Player 2{turn === 1 && " — 🎯 P1 firing"}</span>
                    <span className={`bs-player-timer${turn === 2 ? " bs-timer-active" : ""}${p2Time <= 60 ? " bs-timer-warn" : ""}`}>
                      ⏱ {String(Math.floor(p2Time / 60)).padStart(2, "0")}:{String(p2Time % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <BattleshipBoard
                    grid={p1Attack}
                    mode="attack"
                    onCellClick={turn === 1 ? handlePlayerShot : undefined}
                    lastShot={lastShotBy === 1 ? lastShot : null}
                    locked={end || turn !== 1}
                    label=""
                  />
                </div>
              </>
            ) : (
              <>
                <BattleshipBoard
                  grid={p1Grid}
                  registry={p1Registry}
                  mode="fleet"
                  locked
                  lastShot={lastShotBy === 2 ? lastShot : null}
                  label="Your Fleet"
                />
                <BattleshipBoard
                  grid={p1Attack}
                  mode="attack"
                  onCellClick={handlePlayerShot}
                  lastShot={lastShotBy === 1 ? lastShot : null}
                  locked={end || turn === 2}
                  label="Enemy Waters"
                />
              </>
            )}
          </div>

          <div className="bs-coach">
            <span className="bs-coach-label">Intel</span>
            <span className="bs-coach-text">{coachNote}</span>
          </div>
        </div>
      )}

      {/* ── End: reveal ships ── */}
      {end && (
        <div className="bs-end-reveal">
          <div className="bs-end-header">
            <span className="bs-end-emoji">{endEmoji}</span>
            <h2 className="bs-end-title">{endTitle}</h2>
            <p className="bs-end-sub">
              Ships sunk — {is2P ? "P1" : "You"}: {SHIPS.length - p2Remaining}, {is2P ? "P2" : "Enemy"}: {SHIPS.length - p1Remaining}
            </p>
          </div>

          <div className="bs-reveal-grids">
            <div className="bs-reveal-col">
              <div className="bs-reveal-tag">{is2P ? "Player 1's Fleet" : "Your Fleet"}</div>
              <BattleshipBoard grid={p1Grid} registry={p1Registry} mode="fleet" locked label="" />
            </div>
            <div className="bs-reveal-col">
              <div className="bs-reveal-tag">{is2P ? "Player 2's Fleet" : "Enemy Fleet"}</div>
              <BattleshipBoard grid={p2Grid} registry={p2Registry} mode="fleet" locked label="" />
            </div>
          </div>

          <div className="bs-end-actions">
            <button className="btn-primary" onClick={resetGame}>Play Again</button>
            <button onClick={onBack}>Home</button>
          </div>
        </div>
      )}
    </div>
  );
}
