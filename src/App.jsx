import React, { useEffect, useRef, useState } from "react";
import * as Engine from "../ai/engine.js";

const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);
const clampCol = (c)=> Math.max(0, Math.min(COLS-1, c));

/* ---------- helpers: board sim ---------- */
function cloneBoard(b){ return b.map(col => col.slice()); }
function canPlay(b,c){ return (b[c]?.length||0) < ROWS; }
function play(b,c,p){ const nb = cloneBoard(b); nb[c] = (nb[c]||[]).concat(p); return nb; }

/* ---------- closeness + engagement copy ---------- */
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
function engageMessage(outcome, {ms=0, near=0}={}){
  const quick = ms<45000, long = ms>180000;
  const close = near>=1, veryClose = near>=2;
  const pick = (a)=> a[Math.floor(Math.random()*a.length)];
  const AI = [
    close ? "So close! I squeezed a line. Rematch? 😉" : "Gotcha 😏 — try again?",
    veryClose ? "You nearly had me. One different drop and it’s yours." : "Watch diagonals. Hint helps in tight spots.",
    long ? "Epic grind! I found the last thread. Another round?" : "Bet you can’t beat me twice."
  ];
  const YOU = [
    veryClose ? "Brilliant clutch! 🎉" : "Nice finish! 🔥",
    quick ? "Speedrun vibes. Again?" : "That patience paid off. One more?",
    "I’m dialing the difficulty up a notch…"
  ];
  const DRAW = [ "Stalemate… rematch?", close ? "Both had threats brewing. Let’s settle this." : "Even match! One more?" ];
  if (outcome==="ai_win")     return pick(AI);
  if (outcome==="player_win") return pick(YOU);
  return pick(DRAW);
}

/* ---------- lightweight confetti ---------- */
function fireConfetti(canvas){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = innerWidth, H = canvas.height = innerHeight;
  const parts = Array.from({length: 140}, ()=>({ x: Math.random()*W, y: -20 - Math.random()*H/3, s: 4+Math.random()*6, v: 2+Math.random()*4, a: Math.random()*Math.PI }));
  let t = 0; const id = setInterval(()=>{ ctx.clearRect(0,0,W,H); parts.forEach(p=>{ p.y += p.v; p.x += Math.sin((t+p.a))*1.5; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate((t+p.a)*0.2); ctx.fillStyle = ["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][p.s|0 % 5]; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore(); }); t+=0.03; },16);
  setTimeout(()=>{ clearInterval(id); ctx.clearRect(0,0,W,H); },1800);
}

/* ---------- share ---------- */
function shareText(board, outcome){
  const map = { "-1":"🔴", "1":"🟡", "0":"⚫" };
  let rows = [];
  for (let r=0;r<ROWS;r++){
    let line = "";
    for (let c=0;c<COLS;c++){
      const v = (board[c][ROWS-1-r] ?? 0);
      line += map[String(v)];
    }
    rows.push(line);
  }
  const head = `MindMatch 4 — ${outcome==="player_win"?"I won":"They won"}\n`;
  const body = rows.join("\n");
  return `${head}${body}\nhttps://ravi-chandu.github.io/MindMatch4/`;
}

/* ---------- SMART LOCAL HINTS (no plugin needed) ---------- */
/* Strategy:
   1) If we can win now, return that column.
   2) If opponent can win next, block those.
   3) Avoid moves that let opponent win immediately after (suicides).
   4) Score remaining by: center preference + our threats - opp threats. */
const CENTER_PREF = [3,4,6,7,6,4,3]; // favor center columns (index 3 highest)
function computeLocalHints(board, player=1){
  const legal = [];
  for (let c=0;c<COLS;c++) if (canPlay(board,c)) legal.push(c);
  if (!legal.length) return { best:[], note:"No moves" };

  // 1) Immediate win for us?
  for (const c of legal){
    const nb = play(board, c, player);
    if (Engine.winner(nb) === player) return { best:[c], note:"Winning move" };
  }

  // 2) Blocks: if opponent wins next, block those columns
  const opp = -player;
  const mustBlock = [];
  for (const c of legal){
    const nb = play(board, c, opp);
    if (Engine.winner(nb) === opp) mustBlock.push(c);
  }
  if (mustBlock.length) return { best: mustBlock, note:"Block opponent" };

  // 3) Score remaining, avoiding suicides
  const scored = [];
  for (const c of legal){
    const nb = play(board, c, player);

    // suicide check: does opponent have immediate win after we play here?
    let oppWinsNext = false;
    for (let oc=0; oc<COLS; oc++){
      if (!canPlay(nb, oc)) continue;
      const ob = play(nb, oc, opp);
      if (Engine.winner(ob) === opp){ oppWinsNext = true; break; }
    }
    if (oppWinsNext){ scored.push({c, score: -1e6}); continue; }

    // heuristic: center bias + our threats - opp threats
    const ourThreats = nearWinScore(nb, player);
    const oppThreats = nearWinScore(nb, opp);
    const score = CENTER_PREF[c] + 3*ourThreats - 2*oppThreats;
    scored.push({c, score});
  }

  scored.sort((a,b)=> b.score - a.score);
  const top = scored.filter(s=> s.score>-1e6).slice(0,3).map(s=> s.c);
  return { best: top, note:"Best by heuristic", all: scored };
}

export default function App(){
  const [screen, setScreen] = useState("home"); // home | game
  const [mode, setMode] = useState("ai");       // ai | 2p
  const [seedDaily, setSeedDaily] = useState(false);

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
        Connect <b>four</b> discs in a row. Tap a column to drop your disc. Use <b>Hint</b> when stuck.
      </p>
      <div className="big-options">
        <button className="big-btn ai" onClick={onPlayAI}>Play vs AI</button>
        <button className="big-btn p2" onClick={onPlay2P}>Local Multiplayer</button>
        <button className="big-btn daily" onClick={onDaily}>Daily Puzzle</button>
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
  const [turn, setTurn] = useState(1);                // 1=You/P1, -1=AI/P2
  const [end, setEnd] = useState(null);               // "player_win" | "ai_win" | "draw"
  const [winLine, setWinLine] = useState(null);
  const [talk, setTalk] = useState("");

  // AI-only stats
  const [stats, setStats] = useState(()=> JSON.parse(localStorage.getItem("mm4_stats")||`{"games":0,"wins":0,"losses":0,"draws":0,"streak":0}`));
  const record = (outcomeKey)=>{
    if (mode!=="ai") return;
    const s = {...stats};
    s.games++;
    if (outcomeKey==="player_win"){ s.wins++; s.streak = Math.max(1, s.streak+1); }
    else if (outcomeKey==="ai_win"){ s.losses++; s.streak = 0; }
    else { s.draws++; }
    localStorage.setItem("mm4_stats", JSON.stringify(s));
    setStats(s);
  };
  const resetStats = ()=>{ const s={games:0,wins:0,losses:0,draws:0,streak:0}; localStorage.setItem("mm4_stats", JSON.stringify(s)); setStats(s); };

  const startRef = useRef(Date.now());

  // seed daily
  useEffect(()=>{
    if (seedDaily && window.MindMatchAI?.todaySeed){
      setBoard(window.MindMatchAI.todaySeed());
    }
    // eslint-disable-next-line
  }, []);

  // expose to AI adapter + hint highlighting
  useEffect(()=>{
    window.board = board;
    window.turn = turn;
    window.mm4Mode = mode;
    window.getBoardState = () => board;
    window.loadBoardState = (b) => { setBoard(b); setTurn(1); setEnd(null); setWinLine(null); setTalk(""); startRef.current = Date.now(); };
    window.renderBoard = (b) => setBoard(b);
    window.dropPiece = (col) => place(col, turn);
    window.applyMove = (col) => place(col, -1);
    window.highlightCols = (cols=[])=>{
      document.querySelectorAll('.hint-col').forEach(el=>el.classList.remove('hint-col'));
      cols.forEach(c=>{
        const el = document.querySelector(`.col[data-col="${c}"]`);
        if (el){ el.classList.add('hint-col'); setTimeout(()=> el.classList.remove('hint-col'), 1600); }
      });
    };

    // also expose our local compute for the plugin to use if it wants
    window.computeHints = window.computeHints || ((b,p)=>computeLocalHints(b,p));
  }, [board, turn, mode]);

  // robust Hint (plugin preferred; else smart local)
  useEffect(()=>{
    const btn = document.getElementById("btnHint");
    if (!btn || mode!=="ai") return;
    const handler = () => {
      const h = (window.computeHints ? window.computeHints(board, 1) : computeLocalHints(board, 1));
      window.highlightCols?.(h?.best || []);
      const a = document.getElementById("announce");
      if (a && h?.note) a.textContent = `${h.note}: ${(h.best||[]).join(",")}`;
      window.dispatchEvent(new CustomEvent("mm4:hint",{detail:h}));
    };
    btn.addEventListener("click", handler);
    return ()=> btn.removeEventListener("click", handler);
  }, [board, mode]);

  // first-time “drop here” pulse (optional)
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

  const statusText = end
    ? (mode==="ai"
        ? (end==="player_win" ? "You win!" : end==="ai_win" ? "AI wins!" : "Draw")
        : (end==="player_win" ? "P1 wins!" : end==="ai_win" ? "P2 wins!" : "Draw"))
    : (turn===1 ? (mode==="ai"?"Your move (Yellow)":"P1 move (Yellow)") : (mode==="ai"?"AI is thinking…":"P2 move (Red)"));

  function place(col, who){
    if (end) return false;
    const c = clampCol(col);
    if (!canPlay(board,c)) return false;

    const nb = play(board, c, who);
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

  function finish(outcomeKey, line){
    setEnd(outcomeKey);
    setWinLine(line);

    const ms = Date.now() - startRef.current;
    const near = nearWinScore(board, 1);
    setTalk(engageMessage(outcomeKey, {ms, near}));

    const canvas = document.getElementById("mm4-confetti");
    if (canvas && (outcomeKey==="player_win" || outcomeKey==="ai_win")) fireConfetti(canvas);

    const announce = document.getElementById("announce");
    if (announce) announce.textContent = `${statusText} — ${talk}`;

    record(outcomeKey);
    window.dispatchEvent(new CustomEvent("mm4:gameend",{detail:{outcome:outcomeKey}}));
    if (window.MindMatchAI?.onGameEnd) window.MindMatchAI.onGameEnd(outcomeKey);
    return true;
  }

  function reset(){
    setBoard(emptyBoard()); setTurn(1); setEnd(null); setWinLine(null); setTalk("");
    startRef.current = Date.now();
  }

  async function share(){
    const text = shareText(board, end);
    try{
      if (navigator.share) { await navigator.share({ text }); }
      else { await navigator.clipboard.writeText(text); alert("Result copied!"); }
    }catch{}
  }

  return (
    <>
      {/* Controls */}
      <div className="modebar">
        <button onClick={onBack}>Home</button>
        <button onClick={reset}>Reset</button>
        {mode==="ai" && <button id="btnHint">Hint</button>}
      </div>

      <p className="tiny" role="status" aria-live="polite" style={{textAlign:"center", margin:"4px 0 6px"}}>
        {statusText}
      </p>

      <div className="board-wrap">
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
        {!!winLine && <WinOverlay line={winLine} />}
      </div>

      {/* AI-only stats (updated only in AI games) */}
      <div className="stats">
        <div>📊 Games: <b>{stats.games}</b> · ✅ Wins: <b>{stats.wins}</b> · ❌ Losses: <b>{stats.losses}</b> · 🤝 Draws: <b>{stats.draws}</b> · 🔥 Streak: <b>{stats.streak}</b></div>
        <div style={{marginTop:"6px"}}>
          <button onClick={reset} style={{marginRight:8}}>Rematch</button>
          {mode==="ai" && <button onClick={()=>{ reset(); setTurn(-1); window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}})); }}>AI first move</button>}
          <button onClick={resetStats} style={{marginLeft:8}}>Reset stats</button>
        </div>
      </div>

      {/* Result modal */}
      {end && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="dialog">
            <h2>
              {mode==="ai"
                ? (end==="player_win"?"🎉 You win!":end==="ai_win"?"🤖 AI wins":"🤝 Draw")
                : (end==="player_win"?"🟡 P1 wins!":end==="ai_win"?"🔴 P2 wins!":"🤝 Draw")}
            </h2>
            <p style={{opacity:.9}}>{talk}</p>
            <div className="actions">
              <button onClick={reset}>Play again</button>
              <button onClick={share}>Share</button>
              {mode==="ai" && <button onClick={()=>{ reset(); setTurn(-1); window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}})); }}>AI first move</button>}
              <button onClick={onBack}>Home</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WinOverlay({line}){
  // line = [{r,c}...], r=0..5 top->bottom, c=0..6 left->right
  const gap = 10;
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell")) || 56;
  const pad=8;
  const x = (c)=> pad + c*(cell+gap) + cell/2;
  const y = (r)=> pad + r*(cell+gap) + cell/2;
  const first = {X:x(line[0].c), Y:y(line[0].r)};
  const last  = {X:x(line[3].c), Y:y(line[3].r)};
  return (
    <div className="win-overlay" aria-hidden="true">
      <svg>
        <line x1={first.X} y1={first.Y} x2={last.X} y2={last.Y} stroke="gold" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
