import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import Game from "./Game.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("ai");
  const [seedDaily, setSeedDaily] = useState(false);

  useEffect(() => {
    const h = (e) => setScreen(e.detail?.to || "home");
    addEventListener("mm4:navigate", h);
    return () => removeEventListener("mm4:navigate", h);
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: "min(calc(7 * var(--cell) + 6 * var(--gap) + 32px), 100vw)" }}>
      {screen === "home" && (
        <Home
          onPlayAI={() => {
            setMode("ai");
            setSeedDaily(false);
            setScreen("game");
          }}
          onPlay2P={() => {
            setMode("2p");
            setSeedDaily(false);
            setScreen("game");
          }}
          onDaily={() => {
            setMode("ai");
            setSeedDaily(true);
            setScreen("game");
          }}
        />
      )}
      {screen === "game" && (
        <Game mode={mode} seedDaily={seedDaily} onBack={() => setScreen("home")} />
      )}
    </div>
  );
}
