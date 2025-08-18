import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Engine from "../ai/engine.js";

const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);
const clampCol = (c)=> Math.max(0, Math.min(COLS-1, c));

const COMMENTS = {
  player_win: ["🎉 Brilliant! You outplayed the AI.", "😎 Nice fork! Try again?", "🔥 Clean finish!"],
  ai_win:     ["🤖 The AI found a line. Watch diagonals!", "🧩 Try blocking earlier.", "💡 Use Hint for tight spots."],
  draw:       ["🤝 Even match!", "🛡️ Solid defense from both sides."]
};
const rand = (a)=> a[Math.floor(Math.random()*a.length)] || "";

// Confetti
function fireConfetti(canvas){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = innerWidth, H = canvas.height = innerHeight;
  const parts = Array.from({length: 140}, ()=>({ x: Math.random()*W, y: -20 - Math.random()*H/3, s: 4+Math.random()*6, v: 2+Math.random()*4, a: Math.random()*Math.PI }));
  let t = 0; const id = setInterval(()=>{ ctx.clearRect(0,0,W,H); parts.forEach(p=>{ p.y += p.v; p.x += Math.sin((t+p.a))*1.5; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate((t+p.a)*0.2); ctx.fillStyle = ["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][p.s|0 % 5]; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore(); }); t+=0.03; },16);
  setTimeout(()=>{ clearInterval(id); ctx.clearRect(0,0,W,H); },1800);
}

// Stats (localStorage)
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
  function reset(){ const s={games:0,wins:0,losses:0,draws:0,streak:0}; localStorage.setItem("mm4_stats", JSON.stringify(s)); setStats(s); }
  return [stats, record, reset];
}

export default function App(){
  const [screen, setScreen] = useState("home"); // home | game
  const [mode, setMode] = useState("ai");       // ai | 2p
  const [seedDaily, setSeedDaily] = useState(false);

  return (
    <div style={{width:"100%", maxWidth:"min(calc(7 * var(--cell) + 6 * var(--gap) + 32px), 100vw)"}}>
      {screen==="home" && (
        <Home
          onPlayAI={()=>{setMode("ai"); setSeedDaily(false); setScreen("game");}}
          onPlay2P={()=>{setMode("2p"); setSeedDaily(false); setScreen("game");}}
          onDaily={()=>{setMode("ai"); setSeedDaily(true); setScreen("game");}}
        />
      )}
      {screen==="game" && <Game mode={mode} seedDaily={seedDaily} onBack={()=>setScreen("home")} />}
    </div>
  );
}

function Home({onPlayAI,onPlay2P,onDaily}){
  return (
    <div className="card" style={{margin:"0 auto", maxWidth:520}}>
      <h2 style={{margin:"0 0 10px", textAlign:"center"}}>Welcome 👋</h2>
      <p className="tiny" style={{textAlign:"center", margin:"0 0 10px"}}>
        Connect <b>four</b> of your discs in a row — horizontally, vertically, or diagonally.
        Tap a column to drop your disc. Use <b>Hint</b> when stuck.
      </p>

      <div className="big-options">
        <button className="big-btn ai" onClick={onPlayAI}>🤖 Play vs AI</button>
        <button className="big-btn p2" onClick={onPlay2P}>👥 Local Multiplayer</button>
        <button className="big-btn daily" onClick={onDaily}>📅 Daily Puzzle</button>
      </div>

      <ul className="tiny" style={{margin:"8px 0 0", paddingLeft:"18px"}}>
        <li>Yellow = You, Red = AI</li>
        <li>AI adapts to your play. Winning increases its search depth.</li>
        <li>Daily gives a fresh curated mid‑game each day.</li>
      </ul>
    </div>
  );
}

function Game({mode, seedDaily, onBack}){
  const [board, setBoard] = useState(()=> emptyBoard());
  const [turn, setTurn] = useState(1); // 1=You/P1, -1=AI/P2
  const [end, setEnd] = useState(null); // "player_win" | "ai_win" | "draw" | null
  const [winLine, setWinLine] = useState(null);
  const [stats, record, resetStats] = useStats();

  // UX text
  const msg = end
    ? (end==="player_win"?"You win!":end==="ai_win"?"AI wins!":"Draw")
    : (turn===1 ? (mode==="ai"?"Your move (Yellow)":"P1 move (Yellow)") : (mode==="ai"?"AI is thinking…":"P2 move (Red)"));

  // seed daily board once
  useEffect(()=>{
    if (seedDaily && window.MindMatchAI?.todaySeed){
      setBoard(window.MindMatchAI.todaySeed());
    }
    // eslint-disable-next-line
  }, []);

  // expose to window for adapter/AI
  useEffect(()=>{
    window.board = board;
    window.turn = turn;
    window.mm4Mode = mode;
    window.getBoardState = () => board;
    window.loadBoardState = (b) => { setBoard(b); setTurn(1); setEnd(null); setWinLine(null); };
    window.renderBoard = (b) => setBoard(b);
    window.dropPiece = (col) => place(col, turn);
  }, [board, turn, mode]);

  function place(col, who){
    if (end) return false;
    const c = clampCol(col);
    if ((board[c]?.length||0) >= ROWS) return false;

    const nb = board.map(x=>x.slice());
    nb[c] = (nb[c]||[]).concat(who);
    setBoard(nb);

    const w = Engine.winner(nb);
    if (w === 1)  return finish("player_win", Engine.findWinLine(nb));
    if (w === -1) return finish("ai_win",     Engine.findWinLine(nb));
    if (w === 2)  return finish("draw",       null);

    const nt = -who;
    setTurn(nt);
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
    window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome}}));
    if (window.MindMatchAI?.onGameEnd) window.MindMatchAI.onGameEnd(outcome);
    return true;
  }

  function reset(){
    setBoard(emptyBoard()); setTurn(1); setEnd(null); setWinLine(null);
  }

  const talk = end ? rand(COMMENTS[end]) : "";

  return (
    <>
      {/* Action bar above the board (Home / Reset / Back / Hint) */}
      <div className="modebar">
        <button onClick={onBack}>🏠 Home</button>
        <button onClick={reset}>🔄 Reset</button>
        {mode==="ai" && <button id="btnHint">💡 Hint</button>}
        {mode==="ai" && <button id="btnDaily">📅 Daily Puzzle</button>}
      </div>

      <p className="tiny" style={{textAlign:"center", margin:"4px 0 6px"}}>
        {msg} {end ? " — " + talk : ""}
      </p>

      <div className="board-wrap">
        {!!winLine && <WinOverlay line={winLine} />}
        <div className="board" role="grid" aria-label="Connect Four">
          {Array.from({length: COLS}).map((_, c) => (
            <div key={c} className="col" data-col={c} onClick={()=> (mode==="ai" ? (turn===1 && window.dropPiece(c)) : window.dropPiece(c))}>
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

      {/* Stats under the board */}
      <div className="stats">
        <div>📊 Games: <b>{stats.games}</b> · ✅ Wins: <b>{stats.wins}</b> · ❌ Losses: <b>{stats.losses}</b> · 🤝 Draws: <b>{stats.draws}</b> · 🔥 Streak: <b>{stats.streak}</b></div>
        <div style={{marginTop:"6px"}}>
          <button onClick={reset} style={{marginRight:8}}>Rematch</button>
          <button onClick={()=>{ reset(); setTurn(-1); window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}})); }}>AI starts</button>
          <button onClick={resetStats} style={{marginLeft:8}}>Reset stats</button>
        </div>
      </div>
    </>
  );
}

function WinOverlay({line}){
  const gap = 10, cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell")) || 56, pad=8;
  const x = (c)=> pad + c*(cell+gap) + cell/2;
  const y = (r)=> pad + r*(cell+gap) + cell/2;
  const [a,, ,d] = line.map(p=>({X:x(p.c), Y:y(p.r)}));
  return (
    <div className="win-overlay" aria-hidden="true">
      <svg>
        <line x1={a.X} y1={a.Y} x2={d.X} y2={d.Y} stroke="gold" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
