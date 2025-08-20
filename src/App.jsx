import React, { useEffect, useRef, useState } from "react";
import * as Engine from "../ai/engine.js";

const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);
const clampCol = (c)=> Math.max(0, Math.min(COLS-1, c));
const canPlay = (b,c)=> (b[c]?.length||0) < ROWS;
const clone = (b)=> b.map(col=>col.slice());
const play = (b,c,p)=>{ const nb = clone(b); nb[c] = (nb[c]||[]).concat(p); return nb; };
const totalPieces = (b)=> b.reduce((s,col)=> s + (col?.length||0), 0);

/* ---------- Threat count (for hints) ---------- */
function nearWinScore(board, player=1){
  const at = (r,c)=> (r<0||r>=ROWS||c<0||c>=COLS) ? -99 : ((board[c][ROWS-1-r] ?? 0));
  let score=0;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    for(const [dc,dr] of dirs){
      let me=0, opp=0, empty=0;
      for(let k=0;k<4;k++){
        const v = at(r+dr*k,c+dc*k);
        if (v===player) me++; else if (v===-player) opp++; else empty++;
      }
      if (opp===0 && me===3 && empty===1) score++;
    }
  }
  return score;
}

/* ---------- Endgame chatter ---------- */
function engageMessage(outcome, {ms=0, near=0}={}){
  const quick = ms<45000, long = ms>180000;
  const close = near>=1, veryClose = near>=2;
  const pick = (a)=> a[Math.floor(Math.random()*a.length)];
  const AI = [
    close ? "So close! I squeezed a line. Rematch? 😉" : "Gotcha 😏 — try again?",
    veryClose ? "You nearly had me there. One different drop and it's yours." : "Watch diagonals. Hint helps in tight spots.",
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

/* ---------- Confetti ---------- */
function fireConfetti(canvas){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = innerWidth, H = canvas.height = innerHeight;
  const parts = Array.from({length: 140}, ()=>({ x: Math.random()*W, y: -20 - Math.random()*H/3, s: 4+Math.random()*6, v: 2+Math.random()*4, a: Math.random()*Math.PI }));
  let t = 0;
  const id = setInterval(()=>{
    ctx.clearRect(0,0,W,H);
    parts.forEach(p=>{
      p.y += p.v; p.x += Math.sin((t+p.a))*1.5;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate((t+p.a)*0.2);
      ctx.fillStyle = ["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][p.s|0 % 5];
      ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore();
    });
    t+=0.03;
  },16);
  setTimeout(()=>{ clearInterval(id); ctx.clearRect(0,0,W,H); },1800);
}

/* ---------- Share ---------- */
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
  return `${head}${rows.join("\n")}\nhttps://ravi-chandu.github.io/MindMatch4/`;
}

/* ---------- Hints with reasons ---------- */
const CENTER_PREF = [3,4,5,6,5,4,3];
function reasonFor(board, player, col){
  if (!canPlay(board,col)) return null;
  const opp = -player;
  const nb = play(board, col, player);
  if (Engine.winner(nb) === player) return {col, tag:"win", note:"Winning move"};
  if (Engine.winner(play(board, col, opp)) === opp) return {col, tag:"block", note:"Block opponent"};
  const ourThreats = nearWinScore(nb, player);
  if (ourThreats >= 2) return {col, tag:"fork", note:"Creates multiple threats"};
  if (col===3) return {col, tag:"center", note:"Controls center"};
  return {col, tag:"heuristic", note:"Good shape"};
}
function computeLocalHints(board, player=1){
  const legal = []; for (let c=0;c<COLS;c++) if (canPlay(board,c)) legal.push(c);
  if (!legal.length) return { best:[], note:"No moves" };
  for (const c of legal){ if (Engine.winner(play(board,c,player))===player) return {best:[c], note:"Winning move", reasons:[reasonFor(board,player,c)]}; }
  const opp = -player, blocks=[];
  for (const c of legal){ if (Engine.winner(play(board,c,opp))===opp) blocks.push(c); }
  if (blocks.length) return { best:blocks, note:"Block opponent", reasons:blocks.map(c=>reasonFor(board,player,c)) };
  const scored=[];
  for (const c of legal){
    const nb = play(board,c,player);
    let suicide = false;
    for (let oc=0; oc<COLS; oc++){
      if (!canPlay(nb, oc)) continue;
      if (Engine.winner(play(nb,oc,opp))===opp){ suicide = true; break; }
    }
    if (suicide){ scored.push({c,score:-1e9, reason:{col:c,tag:"danger",note:"Gives immediate reply"} }); continue; }
    const our = nearWinScore(nb, player);
    const their = nearWinScore(nb, opp);
    const score = CENTER_PREF[c] + 3*our - 2*their;
    scored.push({c,score, reason:reasonFor(board,player,c)});
  }
  scored.sort((a,b)=> b.score - a.score);
  const top = scored.filter(s=> s.score>-1e8).slice(0,3);
  return { best: top.map(s=>s.c), note:"Best by heuristic", reasons: top.map(s=>s.reason) };
}

/* ---------- Lightweight MCTS ---------- */
function randomHeuristicMove(b, p){
  const cand=[]; for(let c=0;c<COLS;c++) if (canPlay(b,c)) cand.push(c);
  if (!cand.length) return -1;
  const weights = cand.map(c=> CENTER_PREF[c]);
  const sum = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*sum;
  for (let i=0;i<cand.length;i++){ r -= weights[i]; if (r<=0) return cand[i]; }
  return cand[0];
}
function playoutWinner(board, startP){
  let b = clone(board), p = startP, w=Engine.winner(b);
  let safety=72;
  while(w===0 && safety--){
    const c = randomHeuristicMove(b, p);
    if (c<0) break;
    b = play(b,c,p);
    w = Engine.winner(b);
    p = -p;
  }
  return w;
}
function mctsPick(board, player, iters=200){
  const moves=[]; for(let c=0;c<COLS;c++) if (canPlay(board,c)) moves.push(c);
  if (!moves.length) return {col:-1, note:"No moves"};
  for (const c of moves){ if (Engine.winner(play(board,c,player))===player) return {col:c, note:"Winning move"}; }
  const opp=-player;
  for (const c of moves){ if (Engine.winner(play(board,c,opp))===opp) return {col:c, note:"Block opponent"}; }
  const scores = new Map(moves.map(c=>[c, CENTER_PREF[c]*0.2]));
  for (let i=0;i<iters;i++){
    const c = moves[i % moves.length];
    const w = playoutWinner(play(board,c,player), -player);
    if (w===player) scores.set(c, scores.get(c)+1);
    else if (w===2) scores.set(c, scores.get(c)+0.3);
    else if (w===-player) scores.set(c, scores.get(c)-0.7);
  }
  const best = [...scores.entries()].sort((a,b)=> b[1]-a[1])[0][0];
  return { col: best, note: "Monte‑Carlo rollout" };
}

/* ---------- SVG hazard badge (always visible) ---------- */
function HazardBadge(){
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"
      style={{position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", zIndex:3, pointerEvents:"none"}}>
      <path d="M12 2 1 21h22L12 2z" fill="#F59E0B" stroke="#B45309" strokeWidth="1"/>
      <rect x="11" y="8" width="2" height="7" rx="1" fill="#111827"/>
      <rect x="11" y="17" width="2" height="2" rx="1" fill="#111827"/>
    </svg>
  );
}

/* ---------- App ---------- */
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
  const [turn, setTurn] = useState(1);
  const [end, setEnd] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [talk, setTalk] = useState("");
  const [aiExplain, setAiExplain] = useState("");
  const [focusCol, setFocusCol] = useState(3);
  const [cautionCols, setCautionCols] = useState([]);

  // Difficulty UI + lock after first move
  const [level, setLevel] = useState(()=> localStorage.getItem("mm4_level") || "Auto"); // UI choice
  const lockedLevelRef = useRef(level); // snapshot used by AI
  const moves = totalPieces(board);
  useEffect(()=>{
    if (moves===0) lockedLevelRef.current = level; // update snapshot until first move
  }, [level, moves]);

  const setLevelPersist = (v)=>{ setLevel(v); localStorage.setItem("mm4_level", v); };

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
  const lastSaved = useRef("");

  // Auto-resume
  useEffect(()=>{
    const raw = localStorage.getItem("mm4_autosave");
    if (!raw) return;
    try{
      const {b,t} = JSON.parse(raw);
      if (b && Array.isArray(b) && b.length===COLS){
        setBoard(b); setTurn(t??1); setWinLine(null); setTalk(""); setAiExplain("");
      }
    }catch{}
  }, []);
  useEffect(()=>{
    const snap = JSON.stringify({b:board,t:turn,m:mode,e:end});
    if (snap!==lastSaved.current){
      localStorage.setItem("mm4_autosave", snap);
      lastSaved.current = snap;
    }
  }, [board, turn, mode, end]);

  // Daily seed
  useEffect(()=>{
    if (seedDaily && window.MindMatchAI?.todaySeed){
      setBoard(window.MindMatchAI.todaySeed());
    }
    // eslint-disable-next-line
  }, []);

  // expose to plugin + hints + app bridge
  useEffect(()=>{
    window.board = board;
    window.turn = turn;
    window.mm4Mode = mode;
    window.getBoardState = () => board;
    window.loadBoardState = (b) => { setBoard(b); setTurn(1); setEnd(null); setWinLine(null); setTalk(""); setAiExplain(""); startRef.current = Date.now(); };
    window.renderBoard = (b) => setBoard(b);
    window.dropPiece = (col) => place(col, turn);
    window.applyMove = (col) => { setAiExplain(explainForMove(board, -1, col)); place(col, -1); };
    window.highlightCols = (cols=[])=>{
      document.querySelectorAll('.hint-col').forEach(el=>el.classList.remove('hint-col'));
      cols.forEach(c=>{
        const el = document.querySelector(`.col[data-col="${c}"]`);
        if (el){ el.classList.add('hint-col'); setTimeout(()=> el.classList.remove('hint-col'), 1500); }
      });
    };
    window.computeHints = window.computeHints || ((b,p)=>computeLocalHints(b,p));
  }, [board, turn, mode]);

  // Hint button
  useEffect(()=>{
    const btn = document.getElementById("btnHint");
    if (!btn || mode!=="ai") return;
    const handler = () => {
      const h = (window.computeHints ? window.computeHints(board, 1) : computeLocalHints(board, 1));
      window.highlightCols?.(h?.best || []);
      const a = document.getElementById("announce");
      if (a) a.textContent = `${h?.note || "Hint"}: ${(h?.best||[]).join(", ")}`;
      window.dispatchEvent(new CustomEvent("mm4:hint",{detail:h}));
    };
    btn.addEventListener("click", handler);
    return ()=> btn.removeEventListener("click", handler);
  }, [board, mode]);

  // Keyboard
  const boardRef = useRef(null);
  useEffect(()=>{
    const el = boardRef.current;
    if (!el) return;
    const onKey = (e)=>{
      if (end) return;
      if (e.key==="ArrowLeft"){ setFocusCol(c=> clampCol(c-1)); e.preventDefault(); }
      else if (e.key==="ArrowRight"){ setFocusCol(c=> clampCol(c+1)); e.preventDefault(); }
      else if (e.key==="Enter" || e.key===" "){
        if (mode==="ai"){ if (turn===1) window.dropPiece(focusCol); }
        else { window.dropPiece(focusCol); }
        e.preventDefault();
      }
    };
    el.addEventListener("keydown", onKey);
    return ()=> el.removeEventListener("keydown", onKey);
  }, [end, mode, turn, focusCol]);

  // Edge danger computation
  useEffect(()=>{
    const opp = -turn;
    const danger = [];
    [0,6].forEach(c=>{
      if (!canPlay(board,c)) return;
      const nb = play(board,c, turn);
      for (let oc=0; oc<COLS; oc++){
        if (!canPlay(nb,oc)) continue;
        if (Engine.winner(play(nb,oc,opp))===opp){ danger.push(c); break; }
      }
    });
    setCautionCols(danger);
  }, [board, turn]);

  /* ---------- AI Move (respects locked difficulty) ---------- */
  useEffect(()=>{
    if (mode!=="ai" || end || turn!==-1) return;

    const timer = setTimeout(()=>{
      if (end || turn!==-1) return;

      // decide difficulty ONCE per game (locked after first move)
      const uiLevel = lockedLevelRef.current; // "Auto" | Easy | Medium | Hard | Expert

      // convert to internal diff 1..5
      let diff;
      if (uiLevel !== "Auto"){
        diff = {Easy:1, Medium:3, Hard:4, Expert:5}[uiLevel] || 3;
      } else {
        diff = Math.min(5, Math.max(1, Math.floor((stats.wins - stats.losses)/3) + 2));
      }

      // choose move using diff
      let chosen, note;

      if (diff<=2){
        // Heuristic mode; Easy adds randomness and weaker safety
        const h = computeLocalHints(board, -1);
        const candidates = h.best?.length ? h.best.slice() : [3,2,4,1,5,0,6].filter(c=>canPlay(board,c));
        if (uiLevel==="Easy"){
          // random among top or center-ish, do NOT check suicide strictly
          chosen = candidates[Math.floor(Math.random()*Math.max(1,candidates.length))] ?? 3;
          note = "Simple heuristic (Easy)";
        } else {
          // Medium: pick best[0], still heuristic (with suicide check baked in)
          chosen = (candidates && candidates[0] != null) ? candidates[0] : [3,2,4,1,5,0,6].find(c=>canPlay(board,c));
          note = "Heuristic (Medium)";
        }
      } else {
        // Hard/Expert: MCTS with higher iters
        const iters = (uiLevel==="Expert") ? 1000 : 600;
        const m = mctsPick(board, -1, iters);
        chosen = m.col; note = `Monte‑Carlo rollout (${iters})`;
      }

      setAiExplain(note || "");
      if (typeof chosen === "number") place(chosen, -1);
    }, 650); // plugin gets a short window; our AI then acts
    return ()=> clearTimeout(timer);
  }, [mode, turn, end, board, stats]);

  // Onboarding pulse once
  useEffect(()=>{
    const key = "mm4_seen_onboarding";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const center = document.querySelector('[data-col="3"]');
    if (center){ center.classList.add("onboard-pulse"); setTimeout(()=> center.classList.remove("onboard-pulse"), 2200); }
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
    setBoard(emptyBoard()); setTurn(1); setEnd(null); setWinLine(null); setTalk(""); setAiExplain("");
    startRef.current = Date.now();
  }

  async function share(){
    const text = shareText(board, end);
    try{
      if (navigator.share) { await navigator.share({ text }); }
      else { await navigator.clipboard.writeText(text); alert("Result copied!"); }
    }catch{}
  }

  function explainForMove(b, p, c){
    const r = reasonFor(b, p, c);
    return r ? r.note : "";
  }

  return (
    <>
      {/* Controls */}
      <div className="modebar">
        <button onClick={onBack}>Home</button>
        <button onClick={reset}>Reset</button>
        {mode==="ai" && <button id="btnHint">Hint</button>}

        {/* Difficulty picker (AI only). Disabled after first move. */}
        {mode==="ai" && (
          <label className="tiny" style={{display:"inline-flex", alignItems:"center", gap:6}}>
            Level
            <select
              value={level}
              onChange={(e)=> setLevelPersist(e.target.value)}
              aria-label="AI difficulty"
              disabled={totalPieces(board) > 0}
              style={{padding:"6px 8px", borderRadius:8}}
            >
              <option>Auto</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
              <option>Expert</option>
            </select>
          </label>
        )}
      </div>

      {/* Show chosen difficulty ONLY before first move */}
      {mode==="ai" && totalPieces(board)===0 && (
        <p className="tiny" style={{textAlign:"center", margin:"0 0 6px", opacity:.9}}>
          AI Level: <b>{lockedLevelRef.current}</b>
        </p>
      )}

      <p className="tiny" role="status" aria-live="polite" style={{textAlign:"center", margin:"4px 0 2px"}}>
        {statusText}
      </p>
      {aiExplain && turn===1 && !end && totalPieces(board)>0 && (
        <p className="tiny" style={{textAlign:"center", margin:"0 0 6px", opacity:.9}}>
          AI played that because: <em>{aiExplain}</em>
        </p>
      )}

      <div className="board-wrap">
        <div
          className="board"
          role="grid"
          aria-label="Connect Four"
          aria-rowcount={ROWS}
          aria-colcount={COLS}
          tabIndex={0}
          ref={boardRef}
        >
          {Array.from({length: COLS}).map((_, c) => {
            const isFocused = focusCol===c;
            const caution = cautionCols.includes(c);
            return (
              <div
                key={c}
                className={`col ${isFocused ? "kbd-focus":""} ${caution ? "edge-caution":""}`}
                data-col={c}
                role="columnheader"
                aria-colindex={c+1}
                onMouseEnter={()=> setFocusCol(c)}
                onClick={()=> (mode==="ai" ? (turn===1 && window.dropPiece(c)) : window.dropPiece(c))}
                title={caution ? "Careful: edge here can enable opponent reply" : ""}
                style={{
                  position:"relative",
                  ...(isFocused ? {outline:"2px solid var(--blue)", outlineOffset:"2px", borderRadius:12} : null)
                }}
              >
                {/* Top‑center hazard badge (above discs) */}
                {caution && <HazardBadge />}

                {Array.from({length: ROWS}).map((_, rr) => {
                  const r = ROWS-1-rr;
                  const v = (board[c][r] ?? 0);
                  const fill = v===1 ? "yellow" : v===-1 ? "red" : "empty";
                  return (
                    <div
                      key={r}
                      className={`cell ${fill}`}
                      data-col={c} data-row={rr} data-val={v}
                      role="gridcell"
                      aria-colindex={c+1}
                      aria-rowindex={rr+1}
                      aria-label={v===1 ? "Yellow" : v===-1 ? "Red" : "Empty"}
                      style={{position:"relative", zIndex:1}}
                    >
                      {v!==0 && <span className={`disc ${fill}`} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {!!winLine && <WinOverlay line={winLine} />}
      </div>

      {/* AI-only stats */}
      <div className="stats">
        <div>📊 Games: <b>{stats.games}</b> · ✅ Wins: <b>{stats.wins}</b> · ❌ Losses: <b>{stats.losses}</b> · 🤝 Draws: <b>{stats.draws}</b> · 🔥 Streak: <b>{stats.streak}</b></div>
        <div style={{marginTop:"6px"}}>
          <button onClick={reset} style={{marginRight:8}}>Rematch</button>
          {mode==="ai" && <button onClick={()=>{ reset(); setTurn(-1); window.dispatchEvent(new CustomEvent("mm4:turn",{detail:{turn:-1}})); }}>AI first move</button>}
          <button onClick={resetStats} style={{marginLeft:8}}>Reset stats</button>
          <button onClick={share} style={{marginLeft:8}}>Share</button>
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
