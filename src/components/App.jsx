import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import Game from "./Game.jsx";
import ReversiGame from "./ReversiGame.jsx";
import BattleshipGame from "./BattleshipGame.jsx";
import GomokuGame from "./GomokuGame.jsx";
import Twenty48Game from "./Twenty48Game.jsx";
import MemoryGame from "./MemoryGame.jsx";
import SimonGame from "./SimonGame.jsx";
import MathGame from "./MathGame.jsx";
import WordGame from "./WordGame.jsx";
import StroopGame from "./StroopGame.jsx";
import ToastHost from "./ToastHost.jsx";
import ParentDashboard from "./ParentDashboard.jsx";
import Mascot from "./Mascot.jsx";

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
  const [gomokuDifficulty, setGomokuDifficulty] = useState(
    () => localStorage.getItem("mm4_gomoku_level") || "Hard"
  );
  const [gomokuMode, setGomokuMode] = useState("ai");
  const [memoryDifficulty, setMemoryDifficulty] = useState(
    () => localStorage.getItem("mm4_mem_level") || "Medium"
  );
  const [memoryMode, setMemoryMode] = useState("solo");
  const [mathLevel, setMathLevel] = useState(
    () => localStorage.getItem("mm4_math_level") || "Medium"
  );
  const [kidsMode, setKidsMode] = useState(
    () => JSON.parse(localStorage.getItem("mm4_kids_mode") || "false")
  );
  const [wordLevel, setWordLevel] = useState(
    () => localStorage.getItem("mm4_word_level") || "Medium"
  );
  const [showDashboard, setShowDashboard] = useState(false);
  const [difficulty, setDifficulty] = useState(
    () => localStorage.getItem("mm4_level") || "Auto"
  );

  /* ── Player names for 2P modes ── */
  const [p1Name, setP1Name] = useState(
    () => localStorage.getItem("mm4_p1_name") || ""
  );
  const [p2Name, setP2Name] = useState(
    () => localStorage.getItem("mm4_p2_name") || ""
  );
  const effectiveP1 = p1Name.trim() || "Player 1";
  const effectiveP2 = p2Name.trim() || "Player 2";

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

  const startGomoku = (m = "ai") => {
    setGameId("gomoku");
    setGomokuMode(m);
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  const startTwenty48 = () => {
    setGameId("twenty48");
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  const startMemory = (m = "solo") => {
    setGameId("memory");
    setMemoryMode(m);
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  const startSimon = () => {
    setGameId("simon");
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  const startMath = () => {
    setGameId("math");
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  const startWord = () => {
    setGameId("word");
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  const startStroop = () => {
    setGameId("stroop");
    setSeedDaily(false);
    setReversiDemo(false);
    setScreen("game");
  };

  return (
    <div 
      className={`app ${gameId === "reversi" || gameId === "battleship" || gameId === "gomoku" || gameId === "twenty48" || gameId === "memory" || gameId === "simon" || gameId === "math" || gameId === "word" || gameId === "stroop" ? "app-wide" : ""}`}
      data-game={screen === "home" ? "home" : gameId}
    >
      <div className="crt-scanlines" />
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
          onPlayGomoku={(m) => startGomoku(m)}
          gomokuDifficulty={gomokuDifficulty}
          setGomokuDifficulty={(d) => {
            setGomokuDifficulty(d);
            localStorage.setItem("mm4_gomoku_level", d);
          }}
          onPlayTwenty48={() => startTwenty48()}
          onPlayMemory={(m) => startMemory(m)}
          memoryDifficulty={memoryDifficulty}
          setMemoryDifficulty={(d) => {
            setMemoryDifficulty(d);
            localStorage.setItem("mm4_mem_level", d);
          }}
          onPlaySimon={() => startSimon()}
          onPlayMath={() => startMath()}
          onPlayWord={() => startWord()}
          onPlayStroop={() => startStroop()}
          onOpenDashboard={() => setShowDashboard(true)}
          mathLevel={mathLevel}
          setMathLevel={(d) => {
            setMathLevel(d);
            localStorage.setItem("mm4_math_level", d);
          }}
          wordLevel={wordLevel}
          setWordLevel={(d) => {
            setWordLevel(d);
            localStorage.setItem("mm4_word_level", d);
          }}
          kidsMode={kidsMode}
          setKidsMode={(v) => {
            setKidsMode(v);
            localStorage.setItem("mm4_kids_mode", JSON.stringify(v));
          }}
          p1Name={p1Name}
          setP1Name={(n) => { setP1Name(n); localStorage.setItem("mm4_p1_name", n); }}
          p2Name={p2Name}
          setP2Name={(n) => { setP2Name(n); localStorage.setItem("mm4_p2_name", n); }}
        />
      )}
      {screen === "game" && gameId === "connect4" && (
        <Game
          mode={mode}
          seedDaily={seedDaily}
          difficulty={difficulty}
          onBack={() => setScreen("home")}
          p1Name={effectiveP1}
          p2Name={effectiveP2}
        />
      )}
      {screen === "game" && gameId === "reversi" && (
        <ReversiGame
          startInDemo={reversiDemo}
          mode={reversiMode}
          difficulty={reversiDifficulty}
          onBack={() => setScreen("home")}
          p1Name={effectiveP1}
          p2Name={effectiveP2}
        />
      )}
      {screen === "game" && gameId === "battleship" && (
        <BattleshipGame
          mode={battleshipMode}
          difficulty={battleshipDifficulty}
          onBack={() => setScreen("home")}
          p1Name={effectiveP1}
          p2Name={effectiveP2}
        />
      )}
      {screen === "game" && gameId === "gomoku" && (
        <GomokuGame
          mode={gomokuMode}
          difficulty={gomokuDifficulty}
          onBack={() => setScreen("home")}
          p1Name={effectiveP1}
          p2Name={effectiveP2}
        />
      )}
      {screen === "game" && gameId === "twenty48" && (
        <Twenty48Game onBack={() => setScreen("home")} />
      )}
      {screen === "game" && gameId === "memory" && (
        <MemoryGame
          mode={memoryMode}
          difficulty={memoryDifficulty}
          onBack={() => setScreen("home")}
          p1Name={effectiveP1}
          p2Name={effectiveP2}
        />
      )}
      {screen === "game" && gameId === "simon" && (
        <SimonGame onBack={() => setScreen("home")} kidsMode={kidsMode} />
      )}
      {screen === "game" && gameId === "math" && (
        <MathGame level={mathLevel} onBack={() => setScreen("home")} kidsMode={kidsMode} />
      )}
      {screen === "game" && gameId === "word" && (
        <WordGame level={wordLevel} onBack={() => setScreen("home")} kidsMode={kidsMode} />
      )}
      {screen === "game" && gameId === "stroop" && (
        <StroopGame onBack={() => setScreen("home")} kidsMode={kidsMode} />
      )}
      {showDashboard && <ParentDashboard onClose={() => setShowDashboard(false)} />}
      <ToastHost />
      <Mascot context={screen === "game" ? "game" : "home"} gameId={screen === "game" ? gameId : null} />
    </div>
  );
}
