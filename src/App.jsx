import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Engine from "../ai/engine.js"; // winner + findWinLine added below

const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);

function clampCol(c){ return Math.max(0, Math.min(COLS-1, c)); }

const COMMENTS = {
  player_win: [
    "Brilliant! You outplayed the AI.",
    "Nice fork! The AI didn’t see that coming.",
    "Chef’s kiss. Again? 😎",
  ],
  ai_win: [
    "The AI found a sneaky line. Try a different opening.",
    "Tough one—watch those diagonals!",
    "Good fight! Hints can help in tricky spots.",
  ],
  draw: [
    "Stalemate! Even match.",
    "Solid defense! Nobody broke through.",
  ]
};

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)] || ""; }

// basic confetti (canvas)
function fireConfetti(canvas){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = innerWidth;
  const H = canvas.height = innerHeight;
  const parts = Array.from({length: 140}, ()=>({
    x: Math.random()*W, y: -20 - Math.random()*H/3,
    s: 4+Math.random()*6, v: 2+Math.random()*4, a: Math.random()*Math.PI
  }));
  let t = 0, id;
  const tick = ()=>{
    ctx.clearRect(0,0,W,H);
    parts.forEach(p=>{
      p.y += p.v; p.x += Math.sin((t+p.a))*1.5;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate((t+p.a)*0.2);
      ctx.fillStyle = ["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][p.s|0 % 5];
      ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s);
      ctx.restore();
    });
    t+=0.03;
  };
  id = setInterval(tick, 16);
  setTimeout(()=>{ clearInterval(id); ctx.clearRect(0,0,W,H); }, 1800);
}

function useStats(){
  const [stats, setStats] = useState(()=> JSON.parse(localStorage.getItem("mm4_stats")||`{"games":0,"wins":0,"losses":0,"draws":0,"streak":0}`));
  function record(outcome){
    const s = {...stats};
    s.games++;
    if (outcome==="player_win"){ s.wins++; s.streak = Math.max(1, s.streak+1); }
    else if (outcome==="ai_win"){ s.losses++; s.streak = 0; }
    else { s.draws++; }
    localStorage.setItem("mm4_stats", JSON.stringify(s));
    setStats(s);
  }
  return [stats, record];
}

export default function App(){
  const [screen, setScreen] = useState("home"); // home | game | stats | instructions
  const [mode, setMode] = useState("ai");       // ai | 2p
  const [seedDaily, setSeedDaily] = useState(false);

  // simple navigation (also wired to top buttons in index.html)
  useEffect(()=>{
    const h = (e)=> setScreen(e.detail?.to || "home");
    addEventListener("mm4:navigate", h);
    return ()=> removeEventListener("mm4:navigate", h);
  },[]);

  return (
    <div className="app">
      {screen==="home" && <Home onPlayAI={()=>{setMode("ai"); setScreen("game");}} onPlay2P={()=>{setMode("2p"); setScreen("game");}} onDaily={()=>{setMode("ai"); setSeedDaily(true); setScreen("game");}} onStats={()=>setScreen("stats")} onHelp={()=>setScreen("instructions")} />}
      {screen==="instructions" && <Instructions onBack={()=>setScreen("home")} />}
      {screen==="stats" && <Stats onBack={()=>setScreen("home")} />}
      {screen==="game" && <Game mode={mode} seedDaily={seedDaily} onBack={()=>setScreen("home")} />}
    </div>
  );
}

function Home({onPlayAI,onPlay2P,onDaily,onStats,onHelp}){
  return (
    <div className="home">
      <div className="card">
        <h3>MindMatch 4</h3>
        <p className="sub">Adaptive Connect Four. The AI learns and levels with you.</p>
        <div className="actions">
          <button onClick={onPlayAI}>Play vs AI</button>
          <button onClick={onPlay2P}>Local Multiplayer</button>
          <button onClick={onDaily}>Daily Puzzle</button>
        </div>
      </div>
      <div className="card">
        <h3>How it works</h3>
        <ul>
          <li>Yellow = You, Red = AI</li>
          <li>Use <b>Hint</b> for suggested columns</li>
          <li>Daily puzzle = curated midgames</li>
        </ul>
        <div className="actions">
          <button onClick={onHelp}>Full Instructions</button>
          <button onClick={onStats}>View Stats</button>
        </div>
      </div>
    </div>
  );
}

function Instructions({onBack}){
  return (
    <div className="home">
      <div className="card">
        <h3>Instructions</h3>
        <ol>
          <li>Connect four of your discs in a row (horizontal, vertical, or diagonal).</li>
          <li>Tap a column to drop your disc; pieces stack from the bottom.</li>
          <li><b>Hints</b> highlight strong moves: immediate wins, blocks, best lines.</li>
          <li>AI adapts to your performance—win more to face deeper search.</li>
          <li>Use <b>Daily Puzzle</b> for a fresh challenge each day.</li>
        </ol>
        <div className="actions"><button onClick={onBack}>Back</button></div>
      </div>
    </div>
  );
}

function Stats({onBack}){
  const [stats] = useStats();
  return (
    <div className="home">
      <div className="card">
        <h3>Stats</h3>
        <p>Games: <b>{stats.games}</b></p>
        <p>Wins / Losses / Draws: <b>{stats.wins}</b> / <b>{stats.losses}</b> / <b>{stats.draws}</b></p>
        <p>Win Streak: <b>{stats.streak}</b></p>
        <div className="actions"><button onClick={onBack}>Back</button></div>
      </div>
    </div>
  );
}

function Game({mode, seedDaily, onBack}){
  const [board, setBoard] = useState(()=> Array.from({length: COLS}, ()=>[]));
  const [turn, setTurn] = useState(1); // 1=You, -1=AI or P2
  const [msg, setMsg] = useState("Your move (Yellow)");
  const [end, setEnd] = useState(null); // null | "player_win" | "ai_win" | "draw"
  const [winLine, setWinLine] = useState(null); // [{r,c}...]
  const [stats, record] = useStats();
  const confettiRef = useRef(null);

  // expose for AI adapter & plugin
  useEffect(()=>{
    window.board = board;
    window.turn = turn;
    window.mm4Mode = mode; // consumed in plugin-wire
    window.getBoardState = () => board;
    window.loadBoardState = (b) => { setBoard(b); setTurn(1); setEnd(null); setWinLine(null); setMsg("Your move (Yellow)"); };
    window.renderBoard = (b) => setBoard(b);
    window.dropPiece = (col) => place(col, turn);
  }, [board, turn, mode]);

  // seed daily puzzle once
  useEffect(()=>{
    if (seedDaily && window.MindMatchAI?.todaySeed){
      setBoard(window.MindMatchAI.todaySeed());
    }
    // eslint-disable-next-line
  }, []);

  function place(col, who){
    col = clampCol(col);
    if ((board[col]?.length||0) >= ROWS || end) return false;

    const nb = board.map(c=>c.slice());
    nb[col] = (nb[col]||[]).concat(who);
    setBoard(nb);

    const w = Engine.winner(nb);
    if (w === 1){ finish("player_win", Engine.findWinLine(nb)); return true; }
    if (w === -1){ finish("ai_win", Engine.findWinLine(nb)); return true; }
    if (w === 2){ finish("draw", null); return true; }

    const nt = -who;
    setTurn(nt);
    // If playing AI and it's AI's turn, notify plugin
    if (mode==="ai" && nt === -1){
      window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}}));
    }
    return true;
  }

  function finish(outcome, line){
    setEnd(outcome);
    setWinLine(line);
    record(outcome);
    if (outcome==="player_win") fireConfetti(document.getElementById("mm4-confetti"));
    setMsg(outcome==="player_win" ? "You win!" : outcome==="ai_win" ? "AI wins!" : "Draw");
    window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome}}));
    if (window.MindMatchAI?.onGameEnd) window.MindMatchAI.onGameEnd(outcome);
  }

  function reset(){ setBoard(emptyBoard()); setTurn(1); setEnd(null); setWinLine(null); setMsg("Your move (Yellow)"); }

  // post-game dialog content
  const talk = end ? rand(COMMENTS[end]) : "";

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="brand">MindMatch 4</h1>
          <p className="sub">{mode==="ai" ? "vs AI" : "Local Multiplayer"}</p>
        </div>
        <div className="modebar">
          <button className={mode==="ai"?"active":""} onClick={()=>window.dispatchEvent(new CustomEvent('mm4:navigate',{detail:{to:'home'}}))}>Home</button>
          <button onClick={reset}>Reset</button>
          <button onClick={onBack}>Back</button>
        </div>
      </header>

      <p className="status" role="status" aria-live="polite">
        {msg} {end ? " " + talk : ""}
      </p>

      <div className="board-wrap">
        {/* Winning overlay */}
        {!!winLine && <WinOverlay line={winLine} />}
        <div className="board" role="grid" aria-label="Connect Four">
          {Array.from({length: COLS}).map((_, c) => (
            <div key={c} className="col" data-col={c} onClick={()=> turn===1 || mode==="2p" ? place(c, turn) : null}>
              {Array.from({length: ROWS}).map((_, rr) => {
                const r = ROWS-1-rr;
                const v = (board[c][r] ?? 0);
                const fill = v===1 ? "yellow" : v===-1 ? "red" : "empty";
                return (
                  <div key={r} className={`cell ${fill}`} data-col={c} data-row={rr} data-val={v}>
                    {v!==0 && <span className={`disc ${fill}`} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Post-game dialog */}
      {end && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="dialog">
            <h2>{end==="player_win"?"🎉 You win!":end==="ai_win"?"🤖 AI wins":"🤝 Draw"}</h2>
            <p>{talk}</p>
            <div className="actions">
              <button onClick={reset}>Rematch</button>
              {mode==="ai" && <button onClick={()=>{ setBoard(emptyBoard()); setTurn(-1); setEnd(null); setWinLine(null); setMsg("AI starts…"); window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}})); }}>Switch sides (AI first)</button>}
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Overlay to draw a line over the winning 4 cells */
function WinOverlay({line}){
  // line = [{r,c}, ...] with r=0..5 (top->bottom in DOM), c=0..6 (left->right)
  // Convert to SVG coords in [0..7]x[0..6] grid space, accounting for gaps and padding
  const gap = 10;
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell")) || 56;
  const pad = 8; // board padding
  const x = (c)=> pad + c*(cell+gap) + cell/2;
  const y = (r)=> pad + r*(cell+gap) + cell/2;

  const [a,b,c2,d] = line.map(p=>({X:x(p.c), Y:y(p.r)}));
  return (
    <div className="win-overlay" aria-hidden="true">
      <svg>
        <line x1={a.X} y1={a.Y} x2={d.X} y2={d.Y} stroke="gold" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
