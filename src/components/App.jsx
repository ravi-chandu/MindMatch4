import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import Game from "./Game.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("ai");
  const [seedDaily, setSeedDaily] = useState(false);
  const [difficulty, setDifficulty] = useState(
    () => localStorage.getItem("mm4_level") || "Auto"
  );

  useEffect(() => {
    const h = (e) => setScreen(e.detail?.to || "home");
    addEventListener("mm4:navigate", h);
    return () => removeEventListener("mm4:navigate", h);
  }, []);

  const startGame = (m, daily = false) => {
    setMode(m);
    setSeedDaily(daily);
    setScreen("game");
  };

  return (
    <div className="app">
      {screen === "home" && (
        <Home
          difficulty={difficulty}
          setDifficulty={(d) => { setDifficulty(d); localStorage.setItem("mm4_level", d); }}
          onPlayAI={() => startGame("ai")}
          onPlay2P={() => startGame("2p")}
          onDaily={() => startGame("ai", true)}
        />
      )}
      {screen === "game" && (
        <Game mode={mode} seedDaily={seedDaily} difficulty={difficulty} onBack={() => setScreen("home")} />
      )}
    </div>
  );
}