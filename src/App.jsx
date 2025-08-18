import React, { useEffect, useRef, useState } from "react";
import * as Engine from "../ai/engine.js";

const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);
const clampCol = (c)=> Math.max(0, Math.min(COLS-1, c));

const COMMENTS = {
  player_win: ["🎉 Brilliant! You outplayed the AI.", "😎 Nice fork! Try again?", "🔥 Clean finish!"],
  ai_win:     ["🤖 Gotcha 😏 — try again?", "🧩 Watch those diagonals. Hint helps.", "🧠 I squeezed a line there. Rematch?"],
  draw:       ["🤝 Stalemate… rematch?", "⚖️ Even match! One more?"]
};
const rand = (a)=> a[Math.floor(Math.random()*a.length)] || "";

/* Heuristic "near win" score for the human at game end (counts open 3-in-a-rows) */
function nearWinScore(board, player=1){
  const at = (r,c)=> (r<0||r>=ROWS||c<0||c>=COLS) ? -99 : ((board[c][ROWS-1-r] ?? 0));
  let score=0;
  const lines = [[1,0],[0,1],[1,1],[1,-1]];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    for(const [dc,dr] of lines){
      let me=0, opp=0, empty=0;
      for(let k=0;k<4;k++){
        const v = at(r+dr*k,c+dc*k);
        if (v===player) me++; else if (v===-player) opp++; else empty++;
      }
      if (opp===0 && me===3 && empty===1){ score++; }
    }
  }
  return score;
}

/* Dynamic engagement copy based on outcome + time + closeness */
function engageMessage(outcome, {ms=0, moves=0, near=0}={}){
  const quick = ms<45000, long = ms>180000;
  const close = near>=1, veryClose = near>=2;

  const AI = [
    close ? "So close! I squeezed a line. Rematch? 😉" : "Gotcha 😏 — try again?",
    veryClose ? "You nearly had me there. One different drop and it's yours." : "Watch the diagonals. Use Hint in tight spots.",
    long ? "Epic battle! I found the last thread. Up for another?" : "Bet you can't beat me twice in a row."
  ];
  const YOU = [
    veryClose ? "Brilliant clutch! 🎉" : "Nice finish! 🔥",
    quick ? "Speedrun vibes. Again?" : "That patience paid off. Another round?",
    "I'm dialing the difficulty up a notch…"
  ];
  const DRAW = [
    "Stalemate… rematch?",
    close ? "Both had threats brewing. Let's settle this." : "Even match! One more?"
  ];

  if (outcome==="ai_win")     return AI[Math.floor(Math.random()*AI.length)];
  if (outcome==="player_win") return YOU[Math.floor(Math.random()*YOU.length)];
  return DRAW[Math.floor(Math.random()*DRAW.length)];
}

export default function App(){
  const [screen, setScreen] = useState("home"); // home | game
  const [mode, setMode] = useState("ai");       // ai | 2p
  const [seedDaily, setSeedDaily] = useState(false);

  // simple navigation from header title
  useEffect(()=>{
    const h = (e)=> setScreen(e.detail?.to || "home");
    addEventListener("mm4:navigate", h);
    return ()=> removeEventListener("mm4:navigate", h);
  },[]);

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
      <h2 style={{margin:"0 0 10px", textAlign:"center"}}>Welcome</h2>
      <p className="tiny" style={{textAlign:"center", margin:"0 0 10px"}}>
        Connect <b>four</b> of your discs in a row — horizontally, vertically, or diagonally.
        Tap a column to drop your disc. Use <b>Hint</b> when stuck.
      </p>

      <div className="big-options">
        <button className="big-btn ai" onClick={onPlayAI}>Play vs AI</button>
        <button className="big-btn p2" onClick={onPlay2P}>Local Multiplayer</button>
        <button className="big-btn daily" onClick={onDaily}>Daily Puzzle</button>
      </div>

      <ul className="tiny" style={{margin:"8px 0 0", paddingLeft:"18px"}}>
        <li>Yellow = You, Red = AI</li>
        <li>AI adapts to your play. Winning increases its search depth.</li>
        <li>Daily gives a fresh curated mid-game each day.</li>
      </ul>
    </div>
  );
}

function Game({mode, seedDaily, onBack}){
  const [board, setBoard] = useState(()=> emptyBoard());
  const [turn, setTurn] = useState(1); // 1=You/P1, -1=AI/P2
  const [end, setEnd] = useState(null); // "player_win" | "ai_win" | "draw" | null
  const [winLine, setWinLine] = useState(null);

  // timers + counters for engagement copy
  const startRef = useRef(Date.now());
  const movesRef = useRef(0);

  // Stats (localStorage) inline under board
  const [stats, setStats] = useState(()=> JSON.parse(localStorage.getItem("mm4_stats")||`{"games":0,"wins":0,"losses":0,"draws":0,"streak":0}`));
  const record = (outcome)=>{
    const s = {...stats};
    s.games++;
    if (outcome==="player_win"){ s.wins++; s.streak = Math.max(1, s.streak+1); }
    else if (outcome==="ai_win"){ s.losses++; s.streak = 0; }
    else { s.draws++; }
    localStorage.setItem("mm4_stats", JSON.stringify(s));
    setStats(s);
  };
  const resetStats = ()=>{ const s={games:0,wins:0,losses:0,draws:0,streak:0}; localStorage.setItem("mm4_stats", JSON.stringify(s)); setStats(s); };

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
    window.loadBoardState = (b) => { setBoard(b); setTurn(1); setEnd(null); setWinLine(null); startRef.current = Date.now(); movesRef.current = 0; };
    window.renderBoard = (b) => setBoard(b);
    window.dropPiece = (col) => place(col, turn);
  }, [board, turn, mode]);

  // first-time guided “drop here” pulse on center column
  useEffect(()=>{
    const key = "mm4_seen_onboarding";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const center = document.querySelector('[data-col="3"]');
    if (center){
      center.classList.add("onboard-pulse");
      setTimeout(()=> center.classList.remove("onboard-pulse"), 2200);
    }
  }, []);

  const msg = end
    ? (end==="player_win"?"You win!":end==="ai_win"?"AI wins!":"Draw")
    : (turn===1 ? (mode==="ai"?"Your move (Yellow)":"P1 move (Yellow)") : (mode==="ai"?"AI is thinking…":"P2 move (Red)"));

  function place(col, who){
    if (end) return false;
    const c = clampCol(col);
    if ((board[c]?.length||0) >= ROWS) return false;

    movesRef.current += 1;

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

    const ms = Date.now() - startRef.current;
    const near = nearWinScore(board, 1);
    const talk = engageMessage(outcome, {ms, moves: movesRef.current, near});

    // Confetti for both wins (lighter but celebratory)
    const canvas = document.getElementById("mm4-confetti");
    if (canvas && (outcome==="player_win" || outcome==="ai_win")) fireConfetti(canvas);

    // Update the live region with richer copy
    const announce = document.getElementById("announce");
    if (announce) announce.textContent = `${msg} — ${talk}`;

    record(outcome);
    window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome}}));
    if (window.MindMatchAI?.onGameEnd) window.MindMatchAI.onGameEnd(outcome);
    return true;
  }

  function reset(){
    setBoard(emptyBoard()); setTurn(1); setEnd(null); setWinLine(null);
    startRef.current = Date.now(); movesRef.current = 0;
  }

  return (
    <>
      {/* Action bar above the board (Home / Reset / Hint / Daily) */}
      <div className="modebar">
        <button onClick={onBack}>Home</button>
        <button onClick={reset}>Reset</button>
        {mode==="ai" && <button id="btnHint">Hint</button>}
        {mode==="ai" && <button id="btnDaily">Daily Puzzle</button>}
      </div>

      <p className="tiny" role="status" aria-live="polite" style={{textAlign:"center", margin:"4px 0 6px"}}>
        {msg}
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
  // line = [{r,c}...], r=0..5 (top->bottom DOM), c=0..6 (left->right)
  const gap = 10;
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell")) || 56;
  const pad=8;
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

/* Lightweight confetti */
function fireConfetti(canvas){
  const ctx = canvas.getContext("2d");
  const W = canvas.width = innerWidth, H = canvas.height = innerHeight;
  const parts = Array.from({length: 140}, ()=>({ x: Math.random()*W, y: -20 - Math.random()*H/3, s: 4+Math.random()*6, v: 2+Math.random()*4, a: Math.random()*Math.PI }));
  let t = 0; const id = setInterval(()=>{ ctx.clearRect(0,0,W,H); parts.forEach(p=>{ p.y += p.v; p.x += Math.sin((t+p.a))*1.5; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate((t+p.a)*0.2); ctx.fillStyle = ["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][p.s|0 % 5]; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore(); }); t+=0.03; },16);
  setTimeout(()=>{ clearInterval(id); ctx.clearRect(0,0,W,H); },1800);
}
