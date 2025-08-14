import React, { useEffect, useMemo, useState } from "react";

/**
 * MindMatch 4 — Addictive build
 * - Confetti on wins
 * - Global leaderboard via Firebase (optional) + local fallback
 * - Shareable challenge links (beat my streak)
 * - Streaks, achievements, rating, daily variety
 */

const ROWS = 6, COLS = 7, HUMAN = 1, AI = 2;
const LS_PROFILE_KEY = "mm4_profile_v2";
const LS_STATS_KEY   = "mm4_stats_v2";
const LS_NAME_KEY    = "mm4_player_name";
const LS_LB_KEY      = "mm4_leaderboard_local";

const clone = (b) => b.map(r => r.slice());
const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- Query helpers ---------- */
function parseQuery() {
  const p = new URLSearchParams(window.location.search);
  const q = Object.fromEntries(p.entries());
  ["target","depth","rand"].forEach(k => q[k] = q[k]!==undefined ? Number(q[k]) : undefined);
  return q;
}

/* ---------- Storage ---------- */
function defaultProfile() {
  return {
    humanColumnFreq: Array(COLS).fill(0),
    lastTen: [],
    aiConfig: { depth: 4, randomness: 0.2, style: "balanced" },
  };
}
function loadProfile() {
  try {
    const s = localStorage.getItem(LS_PROFILE_KEY);
    if (!s) return defaultProfile();
    const p = JSON.parse(s);
    return { ...defaultProfile(), ...p, aiConfig: { ...defaultProfile().aiConfig, ...(p.aiConfig || {}) } };
  } catch { return defaultProfile(); }
}
function saveProfile(p) { localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(p)); }

function defaultStats() { return { games:0, wins:0, losses:0, draws:0, bestStreak:0, curStreak:0, rating:1200 }; }
function loadStats()    { try { return JSON.parse(localStorage.getItem(LS_STATS_KEY)) || defaultStats(); } catch { return defaultStats(); } }
function saveStats(s)   { localStorage.setItem(LS_STATS_KEY, JSON.stringify(s)); }

/* ---------- Leaderboard (local + optional Firebase) ---------- */
const scoreSort = (a,b)=> (b.bestStreak-a.bestStreak) || (b.rating-a.rating);

function getLocalLB() { try { return JSON.parse(localStorage.getItem(LS_LB_KEY)) || []; } catch { return []; } }
function setLocalLB(arr) { localStorage.setItem(LS_LB_KEY, JSON.stringify(arr)); }
function bestOf(a,b) { // keep the better stats for same player
  return {
    name: a.name || b.name,
    bestStreak: Math.max(a.bestStreak||0, b.bestStreak||0),
    rating: Math.max(a.rating||0, b.rating||0)
  };
}

function hasFirebase() {
  return !!window.firebase && !!window.MM4_FIREBASE_CONFIG;
}
async function initFirebase() {
  if (!hasFirebase()) return null;
  if (!window._mm4db) {
    window.firebase.initializeApp(window.MM4_FIREBASE_CONFIG);
    window._mm4db = window.firebase.firestore();
  }
  return window._mm4db;
}
async function upsertLB(entry) {
  // If Firebase configured => write to Firestore; else store locally
  if (!hasFirebase()) {
    const arr = getLocalLB();
    const i = arr.findIndex(r => r.name === entry.name);
    if (i >= 0) arr[i] = bestOf(arr[i], entry); else arr.push(entry);
    arr.sort(scoreSort).splice(10);
    setLocalLB(arr);
    return arr;
  }
  const db = await initFirebase();
  const col = db.collection("mm4_leaderboard");
  const doc = col.doc(entry.name || "Anonymous");
  const snap = await doc.get();
  if (snap.exists) {
    const cur = snap.data();
    await doc.set(bestOf(cur, entry), { merge: true });
  } else {
    await doc.set(entry);
  }
  const top = await col.orderBy("bestStreak","desc").orderBy("rating","desc").limit(10).get();
  return top.docs.map(d => d.data());
}
async function fetchLB() {
  if (!hasFirebase()) { const arr = getLocalLB(); arr.sort(scoreSort).splice(10); return arr; }
  const db = await initFirebase();
  const col = db.collection("mm4_leaderboard");
  const top = await col.orderBy("bestStreak","desc").orderBy("rating","desc").limit(10).get();
  return top.docs.map(d => d.data());
}

/* ---------- Board logic ---------- */
function dropPiece(board, col, player) {
  if (board[0][col] !== 0) return null;
  const nb = clone(board);
  for (let r = ROWS-1; r >= 0; r--) if (nb[r][col] === 0) { nb[r][col] = player; return nb; }
  return null;
}
function validMoves(board) {
  const m = []; for (let c=0;c<COLS;c++) if (board[0][c]===0) m.push(c); return m;
}
function checkWinner(board) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const inB = (r,c)=> r>=0 && r<ROWS && c>=0 && c<COLS;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    const p = board[r][c]; if (!p) continue;
    for (const [dr,dc] of dirs) {
      let k=1, nr=r+dr, nc=c+dc;
      while (inB(nr,nc) && board[nr][nc]===p) { if(++k>=4) return p; nr+=dr; nc+=dc; }
    }
  }
  if (validMoves(board).length === 0) return 3; // draw
  return 0;
}

/* ---------- Heuristic + minimax ---------- */
function evaluateWindow(w, player){
  const opp = player===AI?HUMAN:AI;
  const cp=w.filter(x=>x===player).length, co=w.filter(x=>x===opp).length, ce=w.filter(x=>x===0).length;
  if (cp===4) return 100000;
  if (cp===3 && ce===1) return 200;
  if (cp===2 && ce===2) return 40;
  if (co===3 && ce===1) return -180;
  if (co===2 && ce===2) return -30;
  return 0;
}
function scorePosition(b, player, style="balanced"){
  let s = 0, center = Math.floor(COLS/2);
  for (let r=0;r<ROWS;r++) if (b[r][center]===player) s+=8;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS-3;c++) s += evaluateWindow([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], player);
  for (let c=0;c<COLS;c++) for (let r=0;r<ROWS-3;r++) s += evaluateWindow([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], player);
  for (let r=0;r<ROWS-3;r++) for (let c=0;c<COLS-3;c++) s += evaluateWindow([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], player);
  for (let r=3;r<ROWS;r++) for (let c=0;c<COLS-3;c++) s += evaluateWindow([b[r][c],b[r-1][c+1],b[r-2][c+2],b[r-3][c+3]], player);
  if (style==="aggressive") s*=1.08; else if (style==="defensive") s*=0.98;
  return s;
}
function minimax(board, depth, maxing, aiStyle, bias, alpha=-Infinity, beta=Infinity){
  const w = checkWinner(board);
  if (depth===0 || w!==0){
    if (w===AI) return {score:1e9,col:null};
    if (w===HUMAN) return {score:-1e9,col:null};
    if (w===3) return {score:0,col:null};
    return {score:scorePosition(board, AI, aiStyle), col:null};
  }
  const moves = validMoves(board).sort((a,b)=>Math.abs(a-3)-Math.abs(b-3));
  const biasPenalty = (col)=>(bias[col]||0)*1.5;

  if (maxing){
    let best = {score:-Infinity, col:moves[0]};
    for (const col of moves) {
      const child = dropPiece(board, col, AI); if(!child) continue;
      let {score} = minimax(child, depth-1, false, aiStyle, bias, alpha, beta);
      score -= biasPenalty(col);
      if (score>best.score) best={score,col};
      alpha=Math.max(alpha,score); if (beta<=alpha) break;
    }
    return best;
  } else {
    let best = {score:Infinity, col:moves[0]};
    for (const col of moves) {
      const child = dropPiece(board, col, HUMAN); if(!child) continue;
      let {score} = minimax(child, depth-1, true, aiStyle, bias, alpha, beta);
      score += biasPenalty(col);
      if (score<best.score) best={score,col};
      beta=Math.min(beta,score); if (beta<=alpha) break;
    }
    return best;
  }
}

/* ---------- Adaptation ---------- */
function adaptProfile(p, s){
  const winRate = (s.wins || 0) / Math.max(1, s.games || 0);
  const streaky = (s.curStreak || 0) >= 3;
  const targetDepth = Math.round(3 + 4 * clamp(winRate*1.4,0,1));
  const targetRand  = Math.max(0.05, 0.35 - winRate*0.4 - (streaky?0.08:0));
  const centerBias = (p.humanColumnFreq[3]||0)+(p.humanColumnFreq[2]||0)+(p.humanColumnFreq[4]||0);
  const edgeBias   = (p.humanColumnFreq[0]||0)+(p.humanColumnFreq[1]||0)+(p.humanColumnFreq[5]||0)+(p.humanColumnFreq[6]||0);
  const style = centerBias >= edgeBias ? "defensive" : "aggressive";
  p.aiConfig.depth = targetDepth;
  p.aiConfig.randomness = Number(targetRand.toFixed(2));
  p.aiConfig.style = style;
  return p;
}
function updateStatsOnResult(stats, result){
  const s = {...stats};
  s.games += 1;
  if (result==='W'){ s.wins++; s.curStreak++; s.bestStreak = Math.max(s.bestStreak, s.curStreak); s.rating += 12 + Math.max(0, 6 - Math.floor(s.curStreak/2)); }
  else if (result==='L'){ s.losses++; s.curStreak=0; s.rating -= 10; }
  else { s.draws++; s.rating -= 2; }
  s.rating = clamp(Math.round(s.rating), 600, 3000);
  return s;
}

/* ---------- Confetti ---------- */
function fireConfetti(durationMs=1800) {
  const old = document.getElementById("mm4-confetti");
  if (old) old.remove();
  const c = document.createElement("canvas");
  c.id = "mm4-confetti"; document.body.appendChild(c);
  const ctx = c.getContext("2d");
  const resize = ()=>{ c.width = window.innerWidth; c.height = window.innerHeight; };
  resize(); window.addEventListener("resize", resize, { once:true });

  const colors = ["#ef4444","#f59e0b","#10b981","#38bdf8","#a78bfa"];
  const parts = Array.from({length: 180}, () => ({
    x: Math.random()*c.width,
    y: -20 - Math.random()*c.height*0.6,
    vx: (Math.random()-0.5)*6,
    vy: 4+Math.random()*4,
    g: 0.15+Math.random()*0.2,
    w: 8+Math.random()*6,
    h: 12+Math.random()*8,
    a: Math.random()*Math.PI,
    s: (Math.random()<0.5?-1:1)*(0.1+Math.random()*0.2),
    color: colors[Math.floor(Math.random()*colors.length)]
  }));

  let stopAt = performance.now() + durationMs;
  function tick(t) {
    ctx.clearRect(0,0,c.width,c.height);
    parts.forEach(p=>{
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.a += p.s;
      ctx.save();
      ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (t < stopAt) requestAnimationFrame(tick);
    else c.remove();
  }
  requestAnimationFrame(tick);
}

/* ---------- React App ---------- */
export default function App() {
  const query = useMemo(()=>parseQuery(), []);
  const [board, setBoard] = useState(()=>emptyBoard());
  const [turn, setTurn] = useState(HUMAN);
  const [status, setStatus] = useState("Your turn");
  const [profile, setProfile] = useState(()=>loadProfile());
  const [stats, setStats] = useState(()=>loadStats());
  const [overlay, setOverlay] = useState(null);  // 'win'|'lose'|'draw'|null
  const [toast, setToast] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [playerName, setPlayerName] = useState(()=>localStorage.getItem(LS_NAME_KEY) || "Player");
  const [leaderboard, setLeaderboard] = useState([]);

  const winner = useMemo(()=>checkWinner(board), [board]);
  const gameOver = winner !== 0;
  const challengeBanner = (query.mode === "streak" && query.target);

  // Daily seed influences early random pick to keep it fresh
  const dailySeed = useMemo(()=>{
    const d = new Date();
    return Number(`${d.getFullYear()}${(d.getMonth()+1+"").padStart(2,"0")}${(d.getDate()+"").padStart(2,"0")}`);
  }, []);

  useEffect(()=>{ // adapt and initial LB
    const p = adaptProfile({...profile}, {...stats}); saveProfile(p); setProfile(p);
    fetchLB().then(setLeaderboard).catch(()=>{});
    // eslint-disable-next-line
  }, []);

  useEffect(()=>{ // AI turn
    if (turn!==AI || gameOver) return;
    const timer = setTimeout(()=>{
      const mv = computeAiMove(board, profile, query, dailySeed);
      if (mv==null) return;
      const nb = dropPiece(board, mv, AI); if (!nb) return;
      setBoard(nb); setTurn(HUMAN);
    }, 220);
    return ()=>clearTimeout(timer);
  }, [turn, gameOver, board, profile, query, dailySeed]);

  useEffect(()=>{ // status
    if (winner===HUMAN) setStatus("You win! 🎉");
    else if (winner===AI) setStatus("AI wins 🤖");
    else if (winner===3) setStatus("Draw");
    else setStatus(turn===HUMAN? "Your turn" : "AI thinking…");
  }, [turn, winner]);

  useEffect(()=>{ // end-of-game bookkeeping
    if (!gameOver) return;
    const result = winner===HUMAN? 'W' : winner===AI? 'L' : 'D';

    const p = {...profile};
    p.lastTen = [...p.lastTen, result].slice(-10);

    const ns = updateStatsOnResult(stats, result);
    adaptProfile(p, ns);

    saveProfile(p); setProfile(p);
    saveStats(ns); setStats(ns);

    if (result==='W') {
      if (ns.curStreak===1) toastIt("First win — nice!");
      if (ns.curStreak===3) toastIt("🔥 3‑win streak!");
      if (ns.curStreak===5) toastIt("🚀 5 in a row!");
      if (ns.bestStreak===10) toastIt("🏆 10‑win legend!");
      fireConfetti(2000);
    }

    setOverlay(winner===HUMAN? 'win' : winner===AI? 'lose' : 'draw');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function toastIt(msg){ setToast(msg); setTimeout(()=>setToast(null), 2000); }

  function computeAiMove(b, p, q, seed) {
    const moves = validMoves(b); if (!moves.length) return null;

    // opening variety while board is nearly empty
    const tokens = b.flat().filter(x=>x!==0).length;
    if (tokens <= 1 && Math.random() < 0.25) {
      // deterministic-ish using seed
      const idx = Math.abs((seed * 9301 + 49297) % 233280) / 233280;
      return moves[Math.floor(idx * moves.length)];
    }

    // quick tactics
    for (const c of moves) { if (checkWinner(dropPiece(b,c,AI))===AI) return c; }
    for (const c of moves) { if (checkWinner(dropPiece(b,c,HUMAN))===HUMAN) return c; }

    // difficulty (allow challenge overrides)
    const depth = clamp(q.depth ?? p.aiConfig.depth, 3, 8);
    const randomness = clamp(q.rand  ?? p.aiConfig.randomness, 0, 0.6);
    const style = q.style ?? p.aiConfig.style;

    const scored = moves.map(col=>{
      const child = dropPiece(b,col,AI);
      const {score} = minimax(child, Math.max(0, depth-1), false, style, p.humanColumnFreq);
      return { col, score: score - (p.humanColumnFreq[col]||0)*2 };
    }).sort((a,b)=>b.score-a.score);

    if (Math.random()<randomness && scored.length>1) {
      const i = Math.min(2, Math.floor(Math.random()*Math.min(3, scored.length)));
      return scored[i].col;
    }
    return scored[0].col;
  }

  function handleHumanMove(col){
    if (turn!==HUMAN || gameOver) return;
    const nb = dropPiece(board, col, HUMAN); if (!nb) return;
    setBoard(nb); setTurn(AI);
    const p = {...profile}; p.humanColumnFreq[col]=(p.humanColumnFreq[col]||0)+1; saveProfile(p); setProfile(p);
  }

  function hardReset(){ setBoard(emptyBoard()); setTurn(HUMAN); setOverlay(null); }
  function resetAll(){
    saveProfile(defaultProfile()); setProfile(defaultProfile());
    saveStats(defaultStats()); setStats(defaultStats());
    hardReset();
  }

  function buildChallengeUrl(){
    const url = new URL(window.location.href);
    url.searchParams.set("mm4","1");
    url.searchParams.set("mode","streak");
    url.searchParams.set("target", String(stats.bestStreak || 1));
    url.searchParams.set("depth", String(profile.aiConfig.depth));
    url.searchParams.set("rand",  String(profile.aiConfig.randomness));
    url.searchParams.set("style", String(profile.aiConfig.style));
    return url.toString();
  }
  async function shareChallenge(){
    const link = buildChallengeUrl();
    const text = `MindMatch 4 — beat my ${stats.bestStreak}-win streak!`;
    if (navigator.share) {
      try { await navigator.share({ title:"MindMatch 4 — Challenge", text, url: link }); return; } catch {}
    }
    await navigator.clipboard?.writeText(link);
    toastIt("Challenge link copied!");
  }

  async function submitScore(){
    const entry = { name: playerName || "Player", bestStreak: stats.bestStreak, rating: stats.rating };
    localStorage.setItem(LS_NAME_KEY, entry.name);
    const top = await upsertLB(entry);
    setLeaderboard(top);
    toastIt("Submitted to leaderboard!");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={{margin:0}}>MindMatch 4</h1>
            <div style={styles.muted}>
              {challengeBanner ? `Challenge: Beat a ${query.target}-win streak` : "Every win makes me stronger."}
            </div>
          </div>
          <div style={styles.row}>
            <button style={{...styles.btn, background:"#64748b"}} onClick={()=>setShowHelp(true)}>Instructions</button>
            <button style={{...styles.btn, background:"#38bdf8"}} onClick={hardReset}>New Game</button>
            <button style={{...styles.btn, background:"#ef4444"}} onClick={resetAll}>Reset Profile</button>
            <button style={{...styles.btn, background:"#22c55e"}} onClick={shareChallenge}>Share Challenge</button>
          </div>
        </header>

        <div style={styles.statusbar}>
          <div style={{fontWeight:700}}>{status}</div>
          <div style={{...styles.muted, fontSize:14}}>
            Depth <b>{profile.aiConfig.depth}</b> · RNG <b>{Math.round(profile.aiConfig.randomness*100)}%</b> ·
            Style <b>{profile.aiConfig.style}</b> · Rating <b>{stats.rating}</b> · Best Streak <b>{stats.bestStreak}</b>
          </div>
        </div>

        <div style={styles.layout}>
          {/* Board */}
          <div style={styles.panel}>
            <div style={styles.boardWrap}>
              {Array.from({length:COLS}).map((_, c) => {
                const column = board.map(r => r[c]);
                return (
                  <button key={c} style={styles.colBtn} title={`Drop in column ${c+1}`} onClick={()=>handleHumanMove(c)} disabled={!!checkWinner(board)}>
                    {column.map((cell,i)=>(
                      <div key={i} style={styles.cell}>
                        <div style={{...styles.disc, background: cell===HUMAN? "#ef4444" : cell===AI? "#fbbf24" : "#334155"}}/>
                      </div>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside style={styles.panel}>
            <h3 style={{marginTop:0}}>AI Difficulty</h3>
            <div style={styles.meter}><div style={{...styles.meterFill, width: `${Math.round(((profile.aiConfig.depth-3)/4)*100)}%`}}/></div>

            <div style={{marginTop:12, fontSize:14, lineHeight:1.6}}>
              <div><span style={styles.muted}>Games:</span> {stats.games}</div>
              <div><span style={styles.muted}>Wins:</span> {stats.wins} · <span style={styles.muted}>Losses:</span> {stats.losses} · <span style={styles.muted}>Draws:</span> {stats.draws}</div>
              <div><span style={styles.muted}>Recent:</span> {profile.lastTen.join(" ") || "—"}</div>
            </div>

            <h4 style={{margin:"16px 0 8px"}}>Your Column Preferences</h4>
            <div style={styles.bars}>
              {profile.humanColumnFreq.map((f,i,arr)=>{
                const total = Math.max(1, arr.reduce((a,b)=>a+b,0));
                const h = (f/total)*100;
                return (
                  <div key={i} style={styles.bar}>
                    <div style={styles.barOuter}><div style={{...styles.barInner, height:`${h}%`}}/></div>
                    <div style={{textAlign:"center", fontSize:12, marginTop:4}}>{i+1}</div>
                  </div>
                );
              })}
            </div>

            <h3 style={{margin:"18px 0 8px"}}>Leaderboard (Top 10)</h3>
            <div style={{fontSize:14}}>
              {leaderboard.length===0 && <div style={styles.muted}>No scores yet.</div>}
              {leaderboard.map((r,idx)=>(
                <div key={idx} style={{display:"grid", gridTemplateColumns:"28px 1fr auto", gap:8, padding:"6px 0",
                  borderBottom: "1px solid rgba(255,255,255,.06)"}}>
                  <div>#{idx+1}</div>
                  <div>{r.name}</div>
                  <div>Streak <b>{r.bestStreak}</b> · <span style={styles.muted}>Rating {r.rating}</span></div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Result overlay */}
        {overlay && (
          <div style={styles.overlay}>
            <div style={styles.card}>
              <div style={{fontSize:28, fontWeight:800, marginBottom:8}}>
                {overlay==='win'? "You win! 🎉" : overlay==='lose'? "AI wins 🤖" : "Draw"}
              </div>
              <div style={{...styles.muted, marginBottom:14}}>Play again or share a challenge with a friend.</div>

              <div style={{display:"grid", gap:8, marginBottom:10}}>
                <label style={{fontSize:14}}>
                  Name for leaderboard:
                  <input
                    value={playerName}
                    onChange={e=>setPlayerName(e.target.value)}
                    style={{marginLeft:8, padding:"6px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,.15)", background:"#0f172a", color:"#e2e8f0"}}
                    placeholder="Your name"
                  />
                </label>
                <div style={{fontSize:13, ...styles.muted}}>
                  Best streak <b>{stats.bestStreak}</b> · Rating <b>{stats.rating}</b>
                </div>
              </div>

              <div style={{display:"flex", gap:8, justifyContent:"center"}}>
                <button style={{...styles.btn, background:"#38bdf8"}} onClick={()=>{hardReset(); setOverlay(null);}}>Play Again</button>
                <button style={{...styles.btn, background:"#22c55e"}} onClick={submitScore}>Submit Score</button>
                <button style={{...styles.btn, background:"#64748b"}} onClick={shareChallenge}>Share Challenge</button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions modal */}
        {showHelp && (
          <div style={styles.overlay} onClick={()=>setShowHelp(false)}>
            <div style={styles.card} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                <h3 style={{margin:0}}>How to Play — MindMatch 4</h3>
                <button style={{...styles.btn, background:"#64748b"}} onClick={()=>setShowHelp(false)}>Close</button>
              </div>
              <div style={{textAlign:"left", lineHeight:1.6, fontSize:14}}>
                <p><b>Goal:</b> Connect <b>4 discs</b> before the AI does.</p>
                <p><b>Controls:</b> Tap/click a <b>column</b> to drop your disc. You’re <b>Red</b>; AI is <b>Yellow</b>.</p>
                <ul style={{marginLeft:18}}>
                  <li><b>New Game</b>: restart the board.</li>
                  <li><b>Reset Profile</b>: wipe AI learning.</li>
                  <li><b>Share Challenge</b>: generate a link so friends try to beat your best streak & AI level.</li>
                </ul>
                <p><b>Adaptive AI:</b> Every win increases depth, lowers randomness, and shifts style to counter you.</p>
                <p><b>Tips:</b> Control the center, spot instant wins/blocks, build two threats at once.</p>
                <p style={styles.muted}>Tagline: “Every win makes me stronger.”</p>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const styles = {
  page:{ minHeight:"100vh", background:"linear-gradient(#0f172a,#0b1222)", color:"#e2e8f0" },
  container:{ maxWidth:1100, margin:"0 auto", padding:24 },
  header:{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  row:{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" },
  statusbar:{ maxWidth:720, margin:"0 auto 12px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  muted:{ color:"#94a3b8" },
  btn:{ border:0, padding:"10px 14px", borderRadius:12, color:"#fff", fontWeight:700, cursor:"pointer" },
  layout:{ display:"grid", gridTemplateColumns:"1fr 320px", gap:18 },
  panel:{ background:"rgba(30,41,59,.75)", border:"1px solid rgba(255,255,255,.06)", borderRadius:16, padding:16, boxShadow:"0 10px 30px rgba(0,0,0,.35)" },
  boardWrap:{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:10 },
  colBtn:{ display:"flex", flexDirection:"column-reverse", gap:10, padding:8, borderRadius:12, background:"rgba(15,23,42,.8)", border:"1px solid rgba(255,255,255,.06)", cursor:"pointer" },
  cell:{ width:56, height:56, borderRadius:999, display:"grid", placeItems:"center" },
  disc:{ width:48, height:48, borderRadius:999, boxShadow:"inset 0 6px 12px rgba(0,0,0,.3)" },
  bars:{ display:"flex", gap:6 }, bar:{ flex:1 },
  barOuter:{ height:64, background:"rgba(100,116,139,.4)", borderRadius:"6px 6px 0 0", overflow:"hidden", display:"flex", alignItems:"end" },
  barInner:{ width:"100%", background:"#22c55e" },
  meter:{ width:"100%", height:10, background:"rgba(100,116,139,.4)", borderRadius:12, overflow:"hidden" },
  meterFill:{ height:"100%", background:"#38bdf8" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"grid", placeItems:"center", padding:16 },
  card:{ background:"#0b1324", padding:24, borderRadius:16, border:"1px solid rgba(255,255,255,.08)", textAlign:"center", width:"92%", maxWidth:480 },
  toast:{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", background:"rgba(15,23,42,.95)", padding:"10px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,.08)" }
};
