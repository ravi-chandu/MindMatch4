import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import Game from "./Game.jsx";
import ReversiGame from "./ReversiGame.jsx";
import BattleshipGame from "./BattleshipGame.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [gameId, setGameId] = useState("connect4");
  const [mode, setMode] = useState("ai");
  const [seedDaily, setSeedDaily] = useState(false);
  const [reversiDemo, setReversiDemo] = useState(false);
  const [reversiMode, setReversiMode] = useState("ai");
  const [reversiDifficulty, setReversiDifficulty] = useState(
    () => localStorage.getItem("mm4_reversi_level") || "Hard"
  );
  const [battleshipDifficulty, setBattleshipDifficulty] = useState(
    () => localStorage.getItem("mm4_bs_level") || "Hard"
  );
  const [battleshipMode, setBattleshipMode] = useState("ai");
  const [difficulty, setDifficulty] = useState(
    () => localStorage.getItem("mm4_level") || "Auto"
  );

  useEffect(() => {
    const h = (e) => setScreen(e.detail?.to || "home");
    addEventListener("mm4:navigate", h);
    return () => removeEventListener("mm4:navigate", h);
  }, []);

  const startGame = (m, daily = false) => {
    setGameId("connect4");
    setMode(m);
    setSeedDaily(daily);
    setReversiDemo(false);
    setScreen("game");
  };

  const startReversi = (m = "ai", demo = false) => {
    setGameId("reversi");
    setReversiMode(m);
    setSeedDaily(false);
    setReversiDemo(demo);
    setScreen("game");
  };

  const startBattleship = (m = "ai") => {
    setGameId("battleship");
    setBattleshipMode(m);
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  return (
    <div className={`app ${gameId === "reversi" || gameId === "battleship" ? "app-wide" : ""}`}>
      {screen === "home" && (
        <Home
          difficulty={difficulty}
          setDifficulty={(d) => {
            setDifficulty(d);
            localStorage.setItem("mm4_level", d);
          }}
          onPlayAI={() => startGame("ai")}
          onPlay2P={() => startGame("2p")}
          onDaily={() => startGame("ai", true)}
          onPlayReversi={(m) => startReversi(m)}
          onWatchReversiDemo={() => startReversi("ai", true)}
          reversiDifficulty={reversiDifficulty}
          setReversiDifficulty={(d) => {
            setReversiDifficulty(d);
            localStorage.setItem("mm4_reversi_level", d);
          }}
          onPlayBattleship={(m) => startBattleship(m)}
          battleshipDifficulty={battleshipDifficulty}
          setBattleshipDifficulty={(d) => {
            setBattleshipDifficulty(d);
            localStorage.setItem("mm4_bs_level", d);
          }}
        />
      )}
      {screen === "game" && gameId === "connect4" && (
        <Game
          mode={mode}
          seedDaily={seedDaily}
          difficulty={difficulty}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "game" && gameId === "reversi" && (
        <ReversiGame
          startInDemo={reversiDemo}
          mode={reversiMode}
          difficulty={reversiDifficulty}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "game" && gameId === "battleship" && (
        <BattleshipGame
          mode={battleshipMode}
          difficulty={battleshipDifficulty}
          onBack={() => setScreen("home")}
        />
      )}
    </div>
  );
}
