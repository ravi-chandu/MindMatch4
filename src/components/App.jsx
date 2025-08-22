import React, { useEffect, useRef, useState } from "react";
import * as Engine from "../ai/engine.js"; // adjust path if needed

/* ============ Board helpers ============ */
const ROWS = 6, COLS = 7;
const emptyBoard = () => Array.from({length: COLS}, () => []);
const clampCol = (c)=> Math.max(0, Math.min(COLS-1, c));
const canPlay = (b,c)=> (b[c]?.length||0) < ROWS;
const clone = (b)=> b.map(col=>col.slice());
const play = (b,c,p)=>{ const nb = clone(b); nb[c] = (nb[c]||[]).concat(p); return nb; };
const totalPieces = (b)=> b.reduce((s,col)=> s + (col?.length||0), 0);

/* ============ Sounds (no assets, WebAudio) ============ */
class Beep {
  constructor(){ this.ctx=null; this.enabled=true; }
  _ctx(){ return this.ctx ?? (this.ctx = new (window.AudioContext||window.webkitAudioContext)()); }
  toggle(on){ this.enabled = on; }
  play({freq=440, dur=0.08, type="sine", gain=0.06, attack=0.005, decay=0.03}){
    if (!this.enabled) return;
    const ctx=this._ctx(), o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=0; o.connect(g); g.connect(ctx.destination);
    const t=ctx.currentTime;
    g.gain.linearRampToValueAtTime(gain, t+attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t+attack+decay+dur);
    o.start(t); o.stop(t+attack+decay+dur+0.02);
  }
  click(){ this.play({freq:520, dur:.05, type:"square"}); }
  drop(){  this.play({freq:240, dur:.10, type:"sawtooth"}); }
  win(){   this.play({freq:880, dur:.12, type:"triangle", gain:.08}); setTimeout(()=>this.play({freq:1108.7,dur:.12,type:"triangle",gain:.08}),120); }
  lose(){  this.play({freq:220, dur:.12, type:"sine", gain:.08}); setTimeout(()=>this.play({freq:174.6,dur:.12,type:"sine",gain:.08}),120); }
  draw(){  this.play({freq:400, dur:.08, type:"sine"}); setTimeout(()=>this.play({freq:430,dur:.08}),80); }
  hint(){  this.play({freq:700, dur:.06, type:"square"}); }
}
const SND = new Beep();

/* ============ Heuristics / Hints ============ */
function nearWinScore(board, player=1){
  const at = (r,c)=> (r<0||r>=ROWS||c<0||c>=COLS) ? -99 : ((board[c][ROWS-1-r] ?? 0));
  let score=0; const dirs=[[1,0],[0,1],[1,1],[1,-1]];
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
const CENTER_PREF = [3,4,5,6,5,4,3];
function reasonFor(board, player, col){
  if (!canPlay(board,col)) return null;
  const opp = -player; const nb = play(board, col, player);
  if (Engine.winner(nb) === player) return {col, tag:"win", note:"Winning move"};
  if (Engine.winner(play(board, col, opp)) === opp) return {col, tag:"block", note:"Block opponent"};
  const our=nearWinScore(nb,player);
  if (our>=2) return {col, tag:"fork", note:"Creates multiple threats"};
  if (col===3) return {col, tag:"center", note:"Controls center"};
  return {col, tag:"heuristic", note:"Good shape"};
}
function computeLocalHints(board, player=1){
  const legal=[]; for (let c=0;c<COLS;c++) if (canPlay(board,c)) legal.push(c);
  if (!legal.length) return {best:[], note:"No moves"};
  for (const c of legal){ if (Engine.winner(play(board,c,player))===player) return {best:[c], note:"Winning move", reasons:[reasonFor(board,player,c)]}; }
  const opp=-player, blocks=[]; for (const c of legal){ if (Engine.winner(play(board,c,opp))===opp) blocks.push(c); }
  if (blocks.length) return {best:blocks, note:"Block opponent", reasons:blocks.map(c=>reasonFor(board,player,c))};
  const scored=[];
  for (const c of legal){
    const nb = play(board,c,player);
    let suicide=false;
    for (let oc=0; oc<COLS; oc++){
      if (!canPlay(nb, oc)) continue;
      if (Engine.winner(play(nb,oc,opp))===opp){ suicide=true; break; }
    }
    if (suicide){ scored.push({c,score:-1e9, reason:{col:c,tag:"danger",note:"Gives immediate reply"}}); continue; }
    const our=nearWinScore(nb,player), their=nearWinScore(nb,opp);
    scored.push({c,score: CENTER_PREF[c] + 3*our - 2*their, reason:reasonFor(board,player,c)});
  }
  scored.sort((a,b)=> b.score-a.score);
  const top=scored.filter(s=> s.score>-1e8).slice(0,3);
  return {best: top.map(s=>s.c), note:"Best by heuristic", reasons: top.map(s=>s.reason)};
}

/* ============ Simple MCTS for AI ============ */
function randomHeuristicMove(b){
  const cand=[]; for(let c=0;c<COLS;c++) if (canPlay(b,c)) cand.push(c);
  if (!cand.length) return -1;
  const weights=cand.map(c=>CENTER_PREF[c]); let sum=weights.reduce((a,b)=>a+b,0), r=Math.random()*sum;
  for (let i=0;i<cand.length;i++){ r -= weights[i]; if (r<=0) return cand[i]; }
  return cand[0];
}
function playoutWinner(board, startP){
  let b=clone(board), p=startP, w=Engine.winner(b), safety=72;
  while(w===0 && safety--){
    const c=randomHeuristicMove(b); if (c<0) break;
    b=play(b,c,p); w=Engine.winner(b); p=-p;
  }
  return w;
}
function mctsPick(board, player, iters=600){
  const moves=[]; for(let c=0;c<COLS;c++) if (canPlay(board,c)) moves.push(c);
  if (!moves.length) return {col:-1, note:"No moves"};
  for (const c of moves){ if (Engine.winner(play(board,c,player))===player) return {col:c, note:"Winning move"}; }
  const opp=-player;
  for (const c of moves){ if (Engine.winner(play(board,c,opp))===opp) return {col:c, note:"Block opponent"}; }
  const scores=new Map(moves.map(c=>[c, CENTER_PREF[c]*0.2]));
  for (let i=0;i<iters;i++){
    const c=moves[i % moves.length], w=playoutWinner(play(board,c,player), -player);
    if (w===player) scores.set(c, scores.get(c)+1);
    else if (w===2) scores.set(c, scores.get(c)+0.3);
    else if (w===-player) scores.set(c, scores.get(c)-0.7);
  }
  const best=[...scores.entries()].sort((a,b)=> b[1]-a[1])[0][0];
  return {col:best, note:`Monte‑Carlo rollout (${iters})`};
}

/* ============ Hazard badge (top‑center, above discs) ============ */
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

/* ============ App shell ============ */
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
          onPlayAI={()=>{ setMode("ai"); setSeedDaily(false); setScreen("game"); SND.click(); }}
          onPlay2P={()=>{ setMode("2p"); setSeedDaily(false); setScreen("game"); SND.click(); }}
          onDaily={()=>{ setMode("ai"); setSeedDaily(true); setScreen("game"); SND.click(); }}
        />
      )}
      {screen==="game" && <Game mode={mode} seedDaily={seedDaily} onBack={()=>{ setScreen("home"); SND.click(); }} />}
    </div>
  );
}

/* ============ Home ============ */
function Home({onPlayAI,onPlay2P,onDaily}){
  const [soundOn, setSoundOn] = useState(()=> JSON.parse(localStorage.getItem("mm4_sound_on")||"true"));
  useEffect(()=>{ SND.toggle(soundOn); localStorage.setItem("mm4_sound_on", JSON.stringify(soundOn)); }, [soundOn]);

  return (
    <div className="card" style={{margin:"0 auto", maxWidth:520}}>
      <h2 style={{margin:"0 0 10px", textAlign:"center"}}>Welcome</h2>
      <p className="tiny" style={{textAlign:"center", margin:"0 0 10px"}}>
        Connect <b>four</b> discs in a row. Tap a column to drop your disc. Use <b>Hint</b> when stuck.
      </p>
      <div style={{display:"flex", justifyContent:"center", gap:12, marginBottom:10}}>
        <label className="tiny" style={{display:"inline-flex", alignItems:"center", gap:6}}>
          <input type="checkbox" checked={soundOn} onChange={(e)=> setSoundOn(e.target.checked)} />
          Sounds
        </label>
      </div>
      <div className="big-options">
        <button className="big-btn ai" onClick={onPlayAI}>Play vs AI</button>
        <button className="big-btn p2" onClick={onPlay2P}>Local Multiplayer</button>
        <button className="big-btn daily" onClick={onDaily}>Daily Puzzle</button>
      </div>
      <ul className="tiny" style={{margin:"8px 0 0", paddingLeft:"18px"}}>
        <li>Yellow = You, Red = {`AI/Player 2`}</li>
        <li>PWA & keyboard friendly (←/→, Enter/Space).</li>
      </ul>
    </div>
  );
}

/* ============ Game (Best‑of‑4 series) ============ */
function Game({mode, seedDaily, onBack}){
  const [board, setBoard] = useState(()=> emptyBoard());
  const [turn, setTurn] = useState(1);
  const [end, setEnd] = useState(null);     // "player_win" | "ai_win" | "draw"
  const [winLine, setWinLine] = useState(null);
  const [aiExplain, setAiExplain] = useState("");
  const [focusCol, setFocusCol] = useState(3);
  const [cautionCols, setCautionCols] = useState([]);

  // --- Series: Best of 4 (first to 3; 2‑2 => tiebreaker one more game) ---
  const [seriesOn] = useState(true);
  const [seriesGame, setSeriesGame] = useState(1);     // 1..4 (+ tie breaker)
  const [seriesScore, setSeriesScore] = useState({ p1:0, p2:0 });
  const [seriesDone, setSeriesDone] = useState(false);
  const targetWins = 3, maxGames = 4;

  // Daily seed mid‑position
  useEffect(()=>{
    if (seedDaily && window.MindMatchAI?.todaySeed) setBoard(window.MindMatchAI.todaySeed());
  }, [seedDaily]);

  // Wire hint button + expose minimal bridge (if you use plugin)
  useEffect(()=>{
    window.board = board; window.turn = turn; window.mm4Mode = mode;
    window.dropPiece = (col) => place(col, turn);
    window.applyMove = (col) => { setAiExplain(explainForMove(board, -1, col)); place(col, -1); };

    const btn = document.getElementById("btnHint");
    if (!btn || mode!=="ai") return;
    const handler = () => {
      const h = (window.computeHints ? window.computeHints(board, 1) : computeLocalHints(board, 1));
      SND.hint(); highlightCols(h?.best || []);
      const a = document.getElementById("announce");
      if (a) a.textContent = `${h?.note || "Hint"}: ${(h?.best||[]).join(", ")}`;
    };
    btn.addEventListener("click", handler);
    return ()=> btn.removeEventListener("click", handler);
  }, [board, turn, mode]);

  const highlightCols = (cols=[])=>{
    document.querySelectorAll('.hint-col').forEach(el=>el.classList.remove('hint-col'));
    cols.forEach(c=>{
      const el = document.querySelector(`.col[data-col="${c}"]`);
      if (el){ el.classList.add('hint-col'); setTimeout(()=> el.classList.remove('hint-col'), 1200); }
    });
  };

  // Keyboard
  const boardRef = useRef(null);
  useEffect(()=>{
    const el = boardRef.current; if (!el) return;
    const onKey = (e)=>{
      if (end) return;
      if (e.key==="ArrowLeft"){ setFocusCol(c=> clampCol(c-1)); e.preventDefault(); }
      else if (e.key==="ArrowRight"){ setFocusCol(c=> clampCol(c+1)); e.preventDefault(); }
      else if (e.key==="Enter" || e.key===" "){
        (mode==="ai" ? (turn===1 && window.dropPiece(focusCol)) : window.dropPiece(focusCol));
        e.preventDefault();
      }
    };
    el.addEventListener("keydown", onKey);
    return ()=> el.removeEventListener("keydown", onKey);
  }, [end, mode, turn, focusCol]);

  // Edge hazard (caution at columns 0 & 6)
  useEffect(()=>{
    const opp = -turn, danger=[];
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

  // AI move
  useEffect(()=>{
    if (mode!=="ai" || end || turn!==-1) return;
    const timer = setTimeout(()=>{
      if (end || turn!==-1) return;
      const m = mctsPick(board, -1, 700);
      setAiExplain(m.note);
      place(m.col, -1);
    }, 600);
    return ()=> clearTimeout(timer);
  }, [mode, turn, end, board]);

  const statusText = end
    ? (mode==="ai"
        ? (end==="player_win" ? "You win!" : end==="ai_win" ? "AI wins!" : "Draw")
        : (end==="player_win" ? "P1 wins!" : end==="ai_win" ? "P2 wins!" : "Draw"))
    : (turn===1 ? (mode==="ai"?"Your move (Yellow)":"P1 move (Yellow)") : (mode==="ai"?"AI is thinking…":"P2 move (Red)"));

  function explainForMove(b, p, c){ const r=reasonFor(b,p,c); return r ? r.note : ""; }

  function place(col, who){
    if (end) return false;
    const c = clampCol(col); if (!canPlay(board,c)) return false;
    SND.drop();
    const nb = play(board, c, who); setBoard(nb);
    const w = Engine.winner(nb);
    if (w === 1)  return finish("player_win", Engine.findWinLine(nb));
    if (w === -1) return finish("ai_win",     Engine.findWinLine(nb));
    if (w === 2)  return finish("draw",       null);
    setTurn(-who); return true;
  }

  function finish(outcomeKey, line){
    setEnd(outcomeKey); setWinLine(line);
    if (outcomeKey==="player_win") SND.win();
    else if (outcomeKey==="ai_win") SND.lose();
    else SND.draw();

    // Series scoring
    if (!seriesDone){
      setSeriesScore(s=>{
        const ns={...s};
        if (outcomeKey==="player_win") ns.p1++; else if (outcomeKey==="ai_win") ns.p2++;
        return ns;
      });
    }
    // Confetti (in index.html canvas)
    const canvas = document.getElementById("mm4-confetti");
    if (canvas && (outcomeKey==="player_win" || outcomeKey==="ai_win")) fireConfetti(canvas);
    return true;
  }

  function nextGame(){
    const done = seriesScore.p1>=3 || seriesScore.p2>=3 || seriesGame>=4;
    const tie  = seriesGame>=4 && seriesScore.p1===seriesScore.p2;
    if (done && !tie){ setSeriesDone(true); }
    else { setSeriesGame(g=>g+1); softReset(); }
  }
  function softReset(){ setBoard(emptyBoard()); setTurn(1); setEnd(null); setWinLine(null); setAiExplain(""); }
  function resetSeries(){ setSeriesScore({p1:0,p2:0}); setSeriesGame(1); setSeriesDone(false); softReset(); }

  return (
    <>
      {/* Controls */}
      <div className="modebar">
        <button onClick={onBack}>Home</button>
        <button onClick={()=>{ softReset(); SND.click(); }}>Reset</button>
        {mode==="ai" && <button id="btnHint" onClick={()=>SND.hint()}>Hint</button>}
      </div>

      {/* Series banner */}
      <div className="tiny" style={{textAlign:"center", margin:"2px 0 8px"}}>
        <b>Series:</b> Best of 4 · Game <b>{seriesGame}</b>{seriesGame>4 && ' (Tiebreaker)'} ·
        &nbsp;🟡 <b>{seriesScore.p1}</b> – <b>{seriesScore.p2}</b> 🔴
        {seriesDone && <><br/><button onClick={resetSeries} style={{marginTop:6}}>Start new series</button></>}
      </div>

      <p className="tiny" role="status" aria-live="polite" style={{textAlign:"center", margin:"4px 0 2px"}}>
        {statusText}
      </p>
      {aiExplain && turn===1 && !end && totalPieces(board)>0 && (
        <p className="tiny" style={{textAlign:"center", margin:"0 0 6px", opacity:.9}}>
          AI played that because: <em>{aiExplain}</em>
        </p>
      )}

      {/* Board */}
      <div className="board-wrap">
        <div className="board" role="grid" aria-label="Connect Four" aria-rowcount={ROWS} aria-colcount={COLS} tabIndex={0} ref={boardRef}>
          {Array.from({length: COLS}).map((_, c) => {
            const isFocused = (c===Number.isFinite ? false : null) || false; // harmless; outline handled inline
            const caution = cautionCols.includes(c);
            return (
              <div
                key={c}
                className={`col ${caution ? "edge-caution":""}`}
                data-col={c}
                role="columnheader"
                aria-colindex={c+1}
                onMouseEnter={()=> {}}
                onClick={()=> (mode==="ai" ? (turn===1 && window.dropPiece(c)) : window.dropPiece(c))}
                title={caution ? "Careful: edge here can enable opponent reply" : ""}
                style={{position:"relative"}}
              >
                {caution && <HazardBadge />}
                {Array.from({length: ROWS}).map((_, rr) => {
                  const r = ROWS-1-rr, v = (board[c][r] ?? 0);
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

      {/* After a game ends: next / tiebreak */}
      <div style={{textAlign:"center", marginTop:8}}>
        {end && !seriesDone && (
          <button onClick={()=>{ nextGame(); SND.click(); }}>
            {seriesGame>=4 && seriesScore.p1===seriesScore.p2 ? "Play Tiebreaker" : "Next game"}
          </button>
        )}
      </div>
    </>
  );
}

/* ============ Win line overlay ============ */
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

/* ============ Confetti (canvas in index.html) ============ */
function fireConfetti(canvas){
  if (!canvas) return;
  const ctx=canvas.getContext("2d");
  const W=canvas.width=innerWidth, H=canvas.height=innerHeight;
  const parts=Array.from({length:140},()=>({x:Math.random()*W,y:-20-Math.random()*H/3,s:4+Math.random()*6,v:2+Math.random()*4,a:Math.random()*Math.PI}));
  let t=0;
  const id=setInterval(()=>{
    ctx.clearRect(0,0,W,H);
    parts.forEach(p=>{
      p.y+=p.v; p.x+=Math.sin((t+p.a))*1.5;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate((t+p.a)*0.2);
      ctx.fillStyle=["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][p.s|0 % 5];
      ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore();
    });
    t+=0.03;
  },16);
  setTimeout(()=>{ clearInterval(id); ctx.clearRect(0,0,W,H); },1800);
}
