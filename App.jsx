import React, { useEffect, useMemo, useRef, useState } from "react";

/** MindMatch 4 (mobile-first, single-screen)
 *  - Home screen: Play vs AI, Multiplayer (Local Hot‑Seat)
 *  - Auto-fit board (no scroll): computes --cell from viewport + panel sizes
 *  - Stats on right (desktop), below board (mobile)
 *  - System theme by default + manual switch
 *  - Uses your logo files (logo-128.png, etc.)
 */

const ROWS=6, COLS=7, HUMAN=1, AI=2;
const LS_PROFILE="mm4_profile_v5";
const LS_STATS="mm4_stats_v5";
const LS_NAME="mm4_name";
const LS_THEME="mm4_theme";  // "system" | "light" | "dark"

const clone=b=>b.map(r=>r.slice());
const empty=()=>Array.from({length:ROWS},()=>Array(COLS).fill(0));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- theme ---------- */
function applyTheme(mode){ if(mode==="system"){ document.documentElement.removeAttribute("data-theme"); return; } document.documentElement.setAttribute("data-theme", mode); }
function useTheme(){
  const [mode,setMode]=useState(()=>localStorage.getItem(LS_THEME)||"system");
  useEffect(()=>{applyTheme(mode); localStorage.setItem(LS_THEME,mode);},[mode]);
  return [mode,setMode];
}

/* ---------- storage ---------- */
function defProfile(){return{humanColumnFreq:Array(COLS).fill(0),lastTen:[],aiConfig:{depth:4,randomness:0.2,style:"balanced"}}}
function loadProfile(){try{const s=localStorage.getItem(LS_PROFILE); if(!s) return defProfile(); const p=JSON.parse(s); return {...defProfile(),...p, aiConfig:{...defProfile().aiConfig, ...(p.aiConfig||{})}}}catch{return defProfile()}}
function saveProfile(p){localStorage.setItem(LS_PROFILE, JSON.stringify(p))}
function defStats(){return{games:0,wins:0,losses:0,draws:0,bestStreak:0,curStreak:0,rating:1200}}
function loadStats(){try{return JSON.parse(localStorage.getItem(LS_STATS))||defStats()}catch{return defStats()}}
function saveStats(s){localStorage.setItem(LS_STATS, JSON.stringify(s))}

/* ---------- helpers ---------- */
const parseQuery=()=>{const sp=new URLSearchParams(location.search); const q=Object.fromEntries(sp.entries()); ["target","depth","rand"].forEach(k=>q[k]=q[k]!==undefined?Number(q[k]):undefined); return q}

/* ---------- board logic ---------- */
function drop(b,col,pl){ if(b[0][col]!==0) return null; const nb=clone(b); for(let r=ROWS-1;r>=0;r--) if(nb[r][col]===0){nb[r][col]=pl; return nb} return null }
function moves(b){const m=[]; for(let c=0;c<COLS;c++) if(b[0][c]===0) m.push(c); return m}
function winner(b){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]], inB=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ const p=b[r][c]; if(!p) continue;
    for(const[dr,dc] of dirs){ let k=1, nr=r+dr, nc=c+dc; while(inB(nr,nc)&&b[nr][nc]===p){ if(++k>=4) return p; nr+=dr; nc+=dc; } }
  }
  return moves(b).length?0:3;
}

/* ---------- AI ---------- */
function evalWin(w, player){
  const opp = player===AI?HUMAN:AI;
  const cp=w.filter(x=>x===player).length, co=w.filter(x=>x===opp).length, ce=w.filter(x=>x===0).length;
  if(cp===4) return 100000;
  if(cp===3 && ce===1) return 200;
  if(cp===2 && ce===2) return 40;
  if(co===3 && ce===1) return -180;
  if(co===2 && ce===2) return -30;
  return 0;
}
function scorePos(b, player, style="balanced"){
  let s=0, center=Math.floor(COLS/2);
  for(let r=0;r<ROWS;r++) if(b[r][center]===player) s+=8;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS-3;c++) s+=evalWin([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], player);
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS-3;r++) s+=evalWin([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], player);
  for(let r=0;r<ROWS-3;r++) for(let c=0;c<COLS-3;c++) s+=evalWin([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], player);
  for(let r=3;r<ROWS;r++) for(let c=0;c<COLS-3;c++) s+=evalWin([b[r][c],b[r-1][c+1],b[r-2][c+2],b[r-3][c+3]], player);
  if(style==="aggressive") s*=1.08; else if(style==="defensive") s*=0.98;
  return s;
}
function minimax(b,d,maxing,style,bias,alpha=-Infinity,beta=Infinity){
  const w=winner(b);
  if(d===0 || w){ if(w===AI) return{score:1e9}; if(w===HUMAN) return{score:-1e9}; if(w===3) return{score:0}; return{score:scorePos(b,AI,style)}; }
  const ms=moves(b).sort((a,c)=>Math.abs(a-3)-Math.abs(c-3)), pen=c=>(bias[c]||0)*1.5;
  if(maxing){ let best={score:-Infinity,col:ms[0]}; for(const c of ms){const child=drop(b,c,AI); if(!child) continue; let{score}=minimax(child,d-1,false,style,bias,alpha,beta); score-=pen(c); if(score>best.score) best={score,col:c}; alpha=Math.max(alpha,score); if(beta<=alpha) break;} return best; }
  let best={score:Infinity,col:ms[0]}; for(const c of ms){const child=drop(b,c,HUMAN); if(!child) continue; let{score}=minimax(child,d-1,true,style,bias,alpha,beta); score+=pen(c); if(score<best.score) best={score,col:c}; beta=Math.min(beta,score); if(beta<=alpha) break;} return best;
}

/* ---------- adapt & stats ---------- */
function adapt(p,s){ const wr=(s.wins||0)/Math.max(1,s.games||0); const streaky=(s.curStreak||0)>=3;
  const depth=Math.round(3+4*clamp(wr*1.4,0,1)); const randomness=Math.max(0.05,0.35-wr*0.4-(streaky?0.08:0));
  const center=(p.humanColumnFreq[3]||0)+(p.humanColumnFreq[2]||0)+(p.humanColumnFreq[4]||0);
  const edge=(p.humanColumnFreq[0]||0)+(p.humanColumnFreq[1]||0)+(p.humanColumnFreq[5]||0)+(p.humanColumnFreq[6]||0);
  p.aiConfig={depth, randomness:Number(randomness.toFixed(2)), style: center>=edge? "defensive":"aggressive"}; return p;
}
function updStats(s,res){ const n={...s}; n.games++; if(res==='W'){n.wins++; n.curStreak++; n.bestStreak=Math.max(n.bestStreak,n.curStreak); n.rating+=12+Math.max(0,6-Math.floor(n.curStreak/2));}
  else if(res==='L'){n.losses++; n.curStreak=0; n.rating-=10;} else {n.draws++; n.rating-=2;} n.rating=clamp(Math.round(n.rating),600,3000); return n; }

/* ---------- confetti ---------- */
function confetti(ms=1000){
  const old=document.getElementById("mm4-confetti"); if(old) old.remove();
  const c=document.createElement("canvas"); c.id="mm4-confetti"; document.body.appendChild(c);
  const ctx=c.getContext("2d"); const resize=()=>{c.width=innerWidth; c.height=innerHeight}; resize(); addEventListener("resize",resize,{once:true});
  const cols=["#ef4444","#f59e0b","#10b981","#38bdf8","#a78bfa"];
  const ps=Array.from({length:100},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.4,vx:(Math.random()-.5)*5,vy:3+Math.random()*4,g:.18+Math.random()*.18,w:8+Math.random()*6,h:12+Math.random()*8,a:Math.random()*Math.PI,s:(Math.random()<.5?-1:1)*(.1+Math.random()*.2),color:cols[Math.floor(Math.random()*cols.length)]}));
  const stop=performance.now()+ms; const tick=t=>{ctx.clearRect(0,0,c.width,c.height); ps.forEach(p=>{p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.a+=p.s; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();}); if(t<stop) requestAnimationFrame(tick); else c.remove();}; requestAnimationFrame(tick);
}

/* ---------- App ---------- */
export default function App(){
  const query=useMemo(()=>parseQuery(),[]);
  const [theme,setTheme]=useTheme();

  // home: "menu" | "vsai" | "local"
  const [screen,setScreen]=useState("menu");

  // game state
  const [board,setBoard]=useState(()=>empty());
  const [turn,setTurn]=useState(HUMAN);
  const [status,setStatus]=useState("Your turn");
  const [profile,setProfile]=useState(()=>loadProfile());
  const [stats,setStats]=useState(()=>loadStats());
  const [overlay,setOverlay]=useState(null);
  const [name,setName]=useState(()=>localStorage.getItem(LS_NAME)||"Player");
  const [toast,setToast]=useState(null);

  const w = useMemo(()=>winner(board),[board]);
  const over = w!==0;

  // auto-fit sizing: compute --cell so whole app fits 100svh without scroll
  const rootRef=useRef(null);
  const boardBoxRef=useRef(null);
  useEffect(()=>{
    function fit(){
      const root = rootRef.current;
      const box = boardBoxRef.current;
      if(!root || !box) return;

      const styles = getComputedStyle(document.documentElement);
      const gap = parseFloat(styles.getPropertyValue("--gap")) || 10;
      const pad = gap*2; // board padding approx

      const header = root.querySelector(".mm4-header")?.getBoundingClientRect().height || 0;
      const status = root.querySelector(".mm4-status")?.getBoundingClientRect().height || 0;

      const vh = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const vw = Math.max(window.innerWidth, document.documentElement.clientWidth);

      // layout: on desktop we have stats on the right; on mobile stats are below
      const isDesktop = vw >= 900;

      // available height for main content
      const availH = vh - header - status - 16; // margins
      // board container dims
      const boxRect = box.getBoundingClientRect();
      const availW = isDesktop ? (boxRect.width) : vw - 24;

      // compute max cell without scroll
      const cellW = (availW - gap*(COLS-1) - pad) / COLS;
      const cellH = (availH - gap*(ROWS-1) - pad) / ROWS;
      let cell = Math.floor(Math.max(28, Math.min(cellW, cellH)));

      // prefer a bit smaller on phones for thumbs
      if (!isDesktop) cell = Math.min(cell, 56);

      document.documentElement.style.setProperty("--cell", `${cell}px`);
      document.documentElement.style.setProperty("--disc-pad", `${Math.round(cell*0.18)}px`);
      document.documentElement.style.setProperty("--gap", `${Math.max(6, Math.round(cell*0.18))}px`);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    window.addEventListener("orientationchange", fit);
    window.addEventListener("resize", fit);
    return ()=>{ ro.disconnect(); window.removeEventListener("orientationchange",fit); window.removeEventListener("resize",fit); }
  },[]);

  // adapt on mount
  useEffect(()=>{const p=adapt({...profile},{...stats}); saveProfile(p); setProfile(p); /* eslint-disable-next-line */},[]);

  // AI move
  useEffect(()=>{
    if(screen!=="vsai") return;
    if (turn!==AI || over) return;
    const t=setTimeout(()=>{
      const mv=decide(board,profile,query);
      if(mv==null) return;
      const nb=drop(board,mv,AI); if(!nb) return;
      setBoard(nb); setTurn(HUMAN);
    },160);
    return ()=>clearTimeout(t);
  },[turn,over,board,profile,query,screen]);

  // status text
  useEffect(()=>{
    if(screen==="menu"){ setStatus(""); return; }
    if (w===HUMAN) setStatus("Player 1 wins! 🎉");
    else if (w===AI && screen==="vsai") setStatus("AI wins 🤖");
    else if (w===AI && screen==="local") setStatus("Player 2 wins! 🎉");
    else if (w===3) setStatus("Draw");
    else setStatus(turn===HUMAN? (screen==="vsai"?"Your turn":"P1 turn") : (screen==="vsai"?"AI thinking…":"P2 turn"));
  },[turn,w,screen]);

  // end of game
  useEffect(()=>{
    if(screen==="menu" || !over) return;
    const res = (screen==="vsai")
      ? (w===HUMAN?'W':w===AI?'L':'D')
      : (w===HUMAN?'W':'L'); // for local, treat P1 as HUMAN stats
    const p={...profile, lastTen:[...profile.lastTen, (res==='W'?'W':'L')].slice(-10)};
    const ns=updStats(stats,res);
    adapt(p,ns); saveProfile(p); saveStats(ns); setProfile(p); setStats(ns);
    if(res==='W') confetti(1000);
    setOverlay(w===3?'draw':(res==='W'?'win':'lose'));
  // eslint-disable-next-line
  },[over,screen]);

  function decide(b,p,q){
    const ms=moves(b); if(!ms.length) return null;
    for(const c of ms) if(winner(drop(b,c,AI))===AI) return c;
    for(const c of ms) if(winner(drop(b,c,HUMAN))===HUMAN) return c;
    const depth=clamp(q.depth??p.aiConfig.depth,3,8), randomness=clamp(q.rand??p.aiConfig.randomness,0,0.6), style=q.style??p.aiConfig.style;
    const scored=ms.map(col=>{const child=drop(b,col,AI); const {score}=minimax(child,Math.max(0,depth-1),false,style,p.humanColumnFreq); return {col,score:score-(p.humanColumnFreq[col]||0)*2};}).sort((a,b)=>b.score-a.score);
    if(Math.random()<randomness && scored.length>1){ const i=Math.min(2,Math.floor(Math.random()*Math.min(3,scored.length))); return scored[i].col; }
    return scored[0].col;
  }

  function human(col){
    if (over) return;
    if (screen==="vsai" && turn!==HUMAN) return;
    if (screen==="local" && turn!==HUMAN && turn!==AI) return;

    const player = (screen==="local" ? (turn===HUMAN?HUMAN:AI) : HUMAN);
    const nb=drop(board,col,player); if(!nb) return;
    setBoard(nb);
    if(screen==="vsai"){ setTurn(AI); const p={...profile}; p.humanColumnFreq[col]=(p.humanColumnFreq[col]||0)+1; saveProfile(p); setProfile(p); }
    else { setTurn(turn===HUMAN?AI:HUMAN); } // alternate P1/P2
  }

  function reset(){ setBoard(empty()); setTurn(HUMAN); setOverlay(null); }
  function resetAll(){ saveProfile(defProfile()); saveStats(defStats()); setProfile(defProfile()); setStats(defStats()); reset(); }
  function shareUrl(){ const u=new URL(location.href); u.searchParams.set("mm4","1"); u.searchParams.set("mode","streak"); u.searchParams.set("target",String(stats.bestStreak||1)); u.searchParams.set("depth",String(profile.aiConfig.depth)); u.searchParams.set("rand",String(profile.aiConfig.randomness)); u.searchParams.set("style",String(profile.aiConfig.style)); return u.toString(); }
  async function share(){ const link=shareUrl(); const text=`MindMatch 4 — beat my ${stats.bestStreak}-win streak!`; if(navigator.share){try{await navigator.share({title:"MindMatch 4 — Challenge",text,url:link}); return;}catch{}} await navigator.clipboard?.writeText(link); setToast("Challenge link copied!"); setTimeout(()=>setToast(null),1500); }

  /* ---------- screens ---------- */
  if(screen==="menu"){
    return (
      <div ref={rootRef} style={ui.page}>
        <header className="mm4-header" style={ui.header}>
          <img src="./logo-128.png" alt="MindMatch 4 logo" width="40" height="40" style={{borderRadius:8}}/>
        </header>

        <main style={ui.menuMain}>
          <div style={ui.titleWrap}>
            <h1 style={ui.h1}>MindMatch 4</h1>
            <div style={ui.tagline}>Every win makes me stronger.</div>
          </div>

          <div style={ui.menuButtons}>
            <button style={{...ui.btn, background:"#22c55e"}} onClick={()=>{setScreen("vsai"); reset();}}>Play vs AI</button>
            <button style={{...ui.btn, background:"#38bdf8"}} onClick={()=>{setScreen("local"); reset();}}>Multiplayer (Local)</button>
          </div>

          <div style={ui.row}>
            <label style={{...ui.muted,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
              Theme
              <select value={theme} onChange={e=>setTheme(e.target.value)} style={ui.select}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>

          <div style={ui.menuFoot}>
            <div style={{...ui.muted,fontSize:12}}>Tip: “Multiplayer (Local)” is hot‑seat on the same device. Online play needs a small server—happy to wire that when you’re ready.</div>
          </div>
        </main>
      </div>
    );
  }

  // Game UI
  return (
    <div ref={rootRef} style={ui.page}>
      <header className="mm4-header" style={ui.header}>
        <img src="./logo-128.png" alt="MindMatch 4 logo" width="36" height="36" style={{borderRadius:8}}/>
        <div style={{textAlign:"center",flex:1}}>
          <div style={ui.h1Small}>MindMatch 4</div>
          <div style={ui.taglineSmall}>{screen==="vsai" ? "Beat the adaptive AI." : "Local hot‑seat: P1 vs P2"}</div>
        </div>
        <div style={ui.rowRight}>
          <select value={theme} onChange={e=>setTheme(e.target.value)} style={ui.select}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button style={{...ui.btn,background:"#ef4444"}} onClick={()=>{setScreen("menu");}}>Home</button>
        </div>
      </header>

      <div className="mm4-status" style={ui.status}>
        <div style={{fontWeight:700}}>{status}</div>
        <div style={{...ui.muted,fontSize:14}}>
          {screen==="vsai" ? <>Depth <b>{profile.aiConfig.depth}</b> · RNG <b>{Math.round(profile.aiConfig.randomness*100)}%</b> · Style <b>{profile.aiConfig.style}</b> · </> : null}
          Rating <b>{stats.rating}</b> · Best Streak <b>{stats.bestStreak}</b>
        </div>
      </div>

      <main className="mm4-main" style={ui.main}>
        {/* Board (left/top) */}
        <section ref={boardBoxRef} style={ui.panel}>
          <div style={ui.boardWrap}>
            <div style={ui.boardFrame}>
              <div style={ui.boardGrid}>
                {Array.from({length:COLS}).map((_, c)=>{
                  const col = [...board.map(r=>r[c])].reverse(); // bottom-first
                  return (
                    <button key={c} style={ui.colBtn} onClick={()=>human(c)} title={`Drop in column ${c+1}`} disabled={!!winner(board)}>
                      {col.map((cell,i)=>(
                        <div key={i} style={ui.cell}>
                          <div style={{
                            ...ui.disc,
                            background: cell===HUMAN? "var(--red)" : cell===AI? "var(--yellow)" : "transparent",
                            boxShadow: cell? "inset 0 6px 12px rgba(0,0,0,.35)":"none"
                          }}/>
                        </div>
                      ))}
                    </button>
                  );
                })}
              </div>
              <div style={ui.holes} aria-hidden="true"></div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:8}}>
            <button style={{...ui.btn,background:"#38bdf8"}} onClick={reset}>New Game</button>
            <button style={{...ui.btn,background:"#22c55e"}} onClick={share}>Share Challenge</button>
            <button style={{...ui.btn,background:"#ef4444"}} onClick={resetAll}>Reset Profile</button>
          </div>
        </section>

        {/* Stats (right on desktop, below on mobile) */}
        <aside style={ui.panel}>
          <h3 style={{marginTop:0}}>Stats</h3>
          <div style={{fontSize:14,lineHeight:1.6}}>
            <div><span style={ui.muted}>Games:</span> {stats.games}</div>
            <div><span style={ui.muted}>Wins:</span> {stats.wins} · <span style={ui.muted}>Losses:</span> {stats.losses} · <span style={ui.muted}>Draws:</span> {stats.draws}</div>
            <div><span style={ui.muted}>Recent:</span> {profile.lastTen.join(" ") || "—"}</div>
          </div>

          <h4 style={{margin:"16px 0 8px"}}>Your Column Preferences</h4>
          <div style={ui.bars}>
            {profile.humanColumnFreq.map((f,i,arr)=>{
              const total=Math.max(1,arr.reduce((a,b)=>a+b,0));
              const h=(f/total)*100;
              return (
                <div key={i} style={ui.bar}>
                  <div style={ui.barOuter}><div style={{...ui.barInner,height:`${h}%`}}/></div>
                  <div style={{textAlign:"center",fontSize:12,marginTop:6}}>{i+1}</div>
                </div>
              );
            })}
          </div>

          <h4 style={{margin:"18px 0 8px"}}>Name</h4>
          <input value={name} onChange={e=>{setName(e.target.value); localStorage.setItem(LS_NAME,e.target.value);}} placeholder="Your name" style={ui.input}/>
        </aside>
      </main>

      {overlay && (
        <div style={{...ui.overlay, zIndex:60}}>
          <div style={ui.card}>
            <div style={{fontSize:26,fontWeight:800,marginBottom:8}}>
              {overlay==='win'?"You win! 🎉":overlay==='lose'?"You lost":"Draw"}
            </div>
            <div style={{...ui.muted,marginBottom:10}}>
              {overlay==='win' ? "Nice! Try to push your streak." : overlay==='lose' ? "Go again—you’ll get it." : "Evenly matched!"}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button style={{...ui.btn,background:"#38bdf8"}} onClick={()=>{setOverlay(null); reset();}}>Play Again</button>
              <button style={{...ui.btn,background:"#22c55e"}} onClick={share}>Share Challenge</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={ui.toast}>{toast}</div>}
    </div>
  );
}

/* ---------- styles ---------- */
const ui = {
  page:{minHeight:"100svh", background:"linear-gradient(180deg,var(--bg2),var(--bg))", color:"var(--ink)", overflow:"hidden"},
  header:{display:"flex",alignItems:"center",gap:12, padding:"10px 12px"},
  h1:{margin:"0 0 6px", fontSize:32, fontWeight:900, textAlign:"center"},
  tagline:{textAlign:"center", color:"var(--muted)"},
  h1Small:{fontSize:20, fontWeight:800, lineHeight:1},
  taglineSmall:{fontSize:12, color:"var(--muted)"},
  row:{display:"flex",gap:8,alignItems:"center",justifyContent:"center",marginTop:14},
  rowRight:{display:"flex",gap:8,alignItems:"center"},
  btn:{border:0,padding:"10px 14px",borderRadius:12,color:"#fff",fontWeight:700,cursor:"pointer"},
  select:{border:"1px solid var(--panel-border)", background:"var(--panel)", color:"var(--ink)", borderRadius:10, padding:"8px 10px", fontWeight:600},
  muted:{color:"var(--muted)"},
  menuMain:{display:"grid", gridTemplateRows:"auto auto auto 1fr", gap:12, height:"calc(100svh - 64px)", padding:"0 12px"},
  titleWrap:{marginTop:4},
  menuButtons:{display:"flex", gap:10, justifyContent:"center", marginTop:8},
  menuFoot:{display:"grid", placeItems:"center"},
  status:{display:"flex",justifyContent:"space-between",alignItems:"center", padding:"0 12px 6px"},
  main:{maxWidth:1200, margin:"0 auto", padding:"0 12px", display:"grid", gridTemplateColumns:"1fr", gap:12, height:"calc(100svh - 136px)"},
  panel:{background:"var(--panel)", border:"1px solid var(--panel-border)", borderRadius:16, padding:12, boxShadow:"0 10px 30px rgba(0,0,0,.12)", minHeight:0},
  /* Board */
  boardWrap:{display:"grid", placeItems:"center", height:"100%"},
  boardFrame:{position:"relative", borderRadius:16, padding:"calc(var(--gap) * .6)", background:"linear-gradient(180deg,#0b162b,#0a1222)", height:"100%", width:"fit-content", maxWidth:"100%"},
  boardGrid:{position:"relative", display:"grid", gridTemplateColumns:"repeat(7, var(--cell))", gap:"var(--gap)", padding:"var(--gap)", borderRadius:12, background:"var(--bg2)"},
  holes:{position:"absolute", inset:0, pointerEvents:"none", borderRadius:12, boxShadow:"inset 0 0 0 2px var(--grid), inset 0 6px 18px rgba(0,0,0,.35)"},
  colBtn:{display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:"var(--gap)",background:"transparent",border:0,cursor:"pointer",padding:0},
  cell:{width:"var(--cell)", height:"var(--cell)", borderRadius:"50%", display:"grid", placeItems:"center", background:"radial-gradient(circle at 50% 50%, var(--hole) 62%, transparent 63%)", boxShadow:"inset 0 0 0 1px var(--grid)"},
  disc:{width:"calc(var(--cell) - var(--disc-pad))", height:"calc(var(--cell) - var(--disc-pad))", borderRadius:"50%", transition:"transform .2s ease"},
  /* Stats */
  bars:{display:"flex",gap:6,alignItems:"end"},
  bar:{flex:1},
  barOuter:{height:64, background:"rgba(148,163,184,.35)", borderRadius:"6px 6px 0 0", overflow:"hidden", display:"flex", alignItems:"end"},
  barInner:{width:"100%", background:"var(--green)"},
  input:{padding:"8px 10px", borderRadius:10, border:"1px solid var(--panel-border)", background:"var(--panel)", color:"var(--ink)", width:"100%"},
  /* Overlay & toast */
  overlay:{position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"grid", placeItems:"center", padding:16},
  card:{background:"var(--panel)", color:"var(--ink)", padding:18, borderRadius:16, border:"1px solid var(--panel-border)", width:"92%", maxWidth:460, textAlign:"center"},
  toast:{position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", background:"var(--panel)", color:"var(--ink)", padding:"8px 12px", border:"1px solid var(--panel-border)", borderRadius:10}
};

// desktop layout: stats on right
const styleEl=document.createElement("style");
styleEl.textContent=`@media (min-width: 900px){ .mm4-main{ grid-template-columns: 1fr 320px; } }`;
document.head.appendChild(styleEl);
