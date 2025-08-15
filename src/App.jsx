import React, { useEffect, useMemo, useRef, useState } from "react";

/** MindMatch 4 — V2.2
 * - Smaller mobile board/discs, no scroll
 * - Desktop vs mobile layout
 * - Column Preferences compress to fit
 * - Last move highlight (~2.3s) before celebration
 */

const ROWS=6, COLS=7, HUMAN=1, AI=2;
const LS_PROFILE="mm4_profile_v10";
const LS_STATS="mm4_stats_v10";
const LS_NAME="mm4_name";
const LS_THEME="mm4_theme";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const empty=()=>Array.from({length:ROWS},()=>Array(COLS).fill(0));
const clone=b=>b.map(r=>r.slice());

/* ---------- precomputed windows ---------- */
const WINDOWS=[];
(function(){
  for(let r=0;r<ROWS;r++) for(let c=0;c<=COLS-4;c++) WINDOWS.push([[r,c],[r,c+1],[r,c+2],[r,c+3]]);
  for(let c=0;c<COLS;c++) for(let r=0;r<=ROWS-4;r++) WINDOWS.push([[r,c],[r+1,c],[r+2,c],[r+3,c]]);
  for(let r=0;r<=ROWS-4;r++) for(let c=0;c<=COLS-4;c++) WINDOWS.push([[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]]);
  for(let r=3;r<ROWS;r++) for(let c=0;c<=COLS-4;c++) WINDOWS.push([[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]]);
})();

/* ---------- theme ---------- */
function applyTheme(mode){ if(mode==="system"||!mode){document.documentElement.removeAttribute("data-theme");return;} document.documentElement.setAttribute("data-theme",mode); }
function useTheme(){ const t=localStorage.getItem(LS_THEME); const init=(t==="light"||t==="dark"||t==="system")?t:"system"; const [mode,setMode]=useState(init); useEffect(()=>{applyTheme(mode);localStorage.setItem(LS_THEME,mode||"system");},[mode]); return [mode,setMode]; }

/* ---------- storage ---------- */
function defProfile(){return{humanColumnFreq:Array(COLS).fill(0),lastTen:[],aiConfig:{depth:4,randomness:0.2,style:"balanced"}}}
function loadProfile(){try{const s=localStorage.getItem(LS_PROFILE); if(!s) return defProfile(); const p=JSON.parse(s); return {...defProfile(),...p, aiConfig:{...defProfile().aiConfig, ...(p.aiConfig||{})}}}catch{return defProfile()}}
function saveProfile(p){localStorage.setItem(LS_PROFILE,JSON.stringify(p))}
function defStats(){return{games:0,wins:0,losses:0,draws:0,bestStreak:0,curStreak:0,rating:1200}}
function loadStats(){try{return JSON.parse(localStorage.getItem(LS_STATS))||defStats()}catch{return defStats()}}
function saveStats(s){localStorage.setItem(LS_STATS,JSON.stringify(s))}

/* ---------- board core ---------- */
function drop(b,col,pl){ if(b[0][col]!==0) return null; const nb=clone(b); for(let r=ROWS-1;r>=0;r--) if(nb[r][col]===0){nb[r][col]=pl; return nb} return null }
function moves(b){ const m=[]; for(let c=0;c<COLS;c++) if(b[0][c]===0) m.push(c); return m; }
function winner(b){
  for(const w of WINDOWS){
    const a=b[w[0][0]][w[0][1]], b1=b[w[1][0]][w[1][1]], c=b[w[2][0]][w[2][1]], d=b[w[3][0]][w[3][1]];
    if(a!==0 && a===b1 && a===c && a===d) return a;
  }
  return moves(b).length?0:3;
}

/* ---------- eval / minimax ---------- */
function evalWindow(vals, me){
  const you = me===AI?HUMAN:AI;
  const m=vals.filter(v=>v===me).length, y=vals.filter(v=>v===you).length, e=vals.filter(v=>v===0).length;
  if(m===4) return 100000;
  if(m===3 && e===1) return 220;
  if(m===2 && e===2) return 50;
  if(y===3 && e===1) return -200;
  if(y===2 && e===2) return -40;
  return 0;
}
function scorePosition(b, me, style="balanced"){
  let s=0, center=Math.floor(COLS/2);
  for(let r=0;r<ROWS;r++) if(b[r][center]===me) s+=9;
  for(const w of WINDOWS){
    const vals=[b[w[0][0]][w[0][1]],b[w[1][0]][w[1][1]],b[w[2][0]][w[2][1]],b[w[3][0]][w[3][1]]];
    s+=evalWindow(vals, me);
  }
  if(style==="aggressive") s*=1.06; else if(style==="defensive") s*=0.98;
  return s;
}
function minimax(b, depth, maximizing, style, bias, alpha=-Infinity, beta=Infinity){
  const w=winner(b);
  if(depth===0 || w){
    if(w===AI) return {score:1e9};
    if(w===HUMAN) return {score:-1e9};
    if(w===3) return {score:0};
    return {score:scorePosition(b, AI, style)};
  }
  const ms=moves(b).sort((a,c)=>Math.abs(a-3)-Math.abs(c-3)), pen=c=>(bias[c]||0)*1.25;
  if(maximizing){
    let best={score:-Infinity,col:ms[0]};
    for(const c of ms){
      const child=drop(b,c,AI); if(!child) continue;
      let {score}=minimax(child, depth-1, false, style, bias, alpha, beta);
      score-=pen(c);
      if(score>best.score) best={score,col:c};
      alpha=Math.max(alpha,score); if(beta<=alpha) break;
    }
    return best;
  }else{
    let best={score:Infinity,col:ms[0]};
    for(const c of ms){
      const child=drop(b,c,HUMAN); if(!child) continue;
      let {score}=minimax(child, depth-1, true, style, bias, alpha, beta);
      score+=pen(c);
      if(score<best.score) best={score,col:c};
      beta=Math.min(beta,score); if(beta<=alpha) break;
    }
    return best;
  }
}

/* ---------- adapt & stats ---------- */
function adapt(profile, stats){
  const wr=(stats.wins||0)/Math.max(1,stats.games||0);
  const streaky=(stats.curStreak||0)>=3;
  const depth=Math.round(3+4*clamp(wr*1.4,0,1));
  const randomness=Math.max(0.05,0.35-wr*0.4-(streaky?0.08:0));
  const center=(profile.humanColumnFreq[3]||0)+(profile.humanColumnFreq[2]||0)+(profile.humanColumnFreq[4]||0);
  const edge=(profile.humanColumnFreq[0]||0)+(profile.humanColumnFreq[1]||0)+(profile.humanColumnFreq[5]||0)+(profile.humanColumnFreq[6]||0);
  profile.aiConfig={depth, randomness:Number(randomness.toFixed(2)), style:center>=edge?"defensive":"aggressive"};
  return profile;
}
function updStats(s,res){
  const n={...s}; n.games++;
  if(res==='W'){ n.wins++; n.curStreak++; n.bestStreak=Math.max(n.bestStreak,n.curStreak); n.rating+=12+Math.max(0,6-Math.floor(n.curStreak/2));}
  else if(res==='L'){ n.losses++; n.curStreak=0; n.rating-=10; }
  else { n.draws++; n.rating-=2; }
  n.rating=clamp(Math.round(n.rating),600,3000); return n;
}

/* ---------- confetti & haptics ---------- */
function confetti(ms=950){
  const old=document.getElementById("mm4-confetti"); if(old) old.remove();
  const c=document.createElement("canvas"); c.id="mm4-confetti"; document.body.appendChild(c);
  const ctx=c.getContext("2d"); const resize=()=>{c.width=innerWidth; c.height=innerHeight}; resize();
  const cols=["#ef4444","#f59e0b","#10b981","#38bdf8","#a78bfa"];
  const ps=Array.from({length:90},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.4,vx:(Math.random()-.5)*4,vy:3+Math.random()*3.5,g:.18+Math.random()*.18,w:8+Math.random()*6,h:12+Math.random()*8,a:Math.random()*Math.PI,s:(Math.random()<.5?-1:1)*(.1+Math.random()*.2),color:cols[Math.floor(Math.random()*cols.length)]}));
  const end=performance.now()+ms;
  const tick=t=>{ctx.clearRect(0,0,c.width,c.height); for(const p of ps){p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();} if(t<end) requestAnimationFrame(tick); else c.remove();};
  requestAnimationFrame(tick);
}
const haptic=(ms=12)=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch{}};

/* ---------- helpers ---------- */
const parseQuery=()=>{const sp=new URLSearchParams(location.search); const q=Object.fromEntries(sp.entries()); ["target","depth","rand"].forEach(k=>q[k]=q[k]!==undefined?Number(q[k]):undefined); return q}
function findRowOf(col, b){ // row index of piece just placed in a column
  for(let r=0;r<ROWS;r++){
    if(b[r][col]!==0){
      let rr=r; while(rr+1<ROWS && b[rr+1][col]!==0) rr++;
      return rr;
    }
  }
  return null;
}

/* ---------- App ---------- */
export default function App(){
  const query=useMemo(()=>parseQuery(),[]);
  const [theme,setTheme]=useTheme();

  const [screen,setScreen]=useState("menu"); // "menu" | "vsai" | "local"
  const [board,setBoard]=useState(()=>empty());
  const [turn,setTurn]=useState(HUMAN);
  const [status,setStatus]=useState("");
  const [profile,setProfile]=useState(()=>loadProfile());
  const [stats,setStats]=useState(()=>loadStats());
  const [overlay,setOverlay]=useState(null);
  const [name,setName]=useState(()=>localStorage.getItem(LS_NAME)||"Player");
  const [toast,setToast]=useState(null);

  const [lastMove,setLastMove]=useState(null);        // {r,c,t}
  const lastTimerRef=useRef(null);

  const w=useMemo(()=>winner(board),[board]);
  const over=w!==0;

  const rootRef=useRef(null);
  const boardPanelRef=useRef(null);

  /* ---------- auto-fit ---------- */
  useEffect(()=>{
    let raf1=0, raf2=0, tmo=0;
    const fit=()=>{
      const root=rootRef.current, panel=boardPanelRef.current;
      if(!root||!panel) return;
      const styles=getComputedStyle(document.documentElement);
      const gap=parseFloat(styles.getPropertyValue("--gap"))||10;

      const header=root.querySelector(".mm4-header");
      const status=root.querySelector(".mm4-status");
      const headerH=header?header.getBoundingClientRect().height:0;
      const statusH=status?status.getBoundingClientRect().height:0;

      const vw=Math.max(innerWidth,document.documentElement.clientWidth);
      const vh=Math.max(innerHeight,document.documentElement.clientHeight);
      const isDesktop=vw>=900;

      const safety=isDesktop?24:84; // reserve for actions + stats
      const availH=vh-headerH-statusH-safety;

      const panelRect=panel.getBoundingClientRect();
      const availW=isDesktop?panelRect.width:vw-24;

      const cellW=(availW-gap*(COLS-1)-gap*2)/COLS;
      const cellH=(availH-gap*(ROWS-1)-gap*2)/ROWS;
      let cell=Math.floor(Math.max(24,Math.min(cellW,cellH)));
      cell=Math.min(cell,isDesktop?72:52);  // smaller on phones

      document.documentElement.style.setProperty("--cell",`${cell}px`);
      document.documentElement.style.setProperty("--disc-pad",`${Math.round(cell*0.18)}px`);
      document.documentElement.style.setProperty("--gap",`${Math.max(6,Math.round(cell*0.16))}px`);
    };
    const schedule=()=>{ cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(tmo);
      raf1=requestAnimationFrame(()=>{ raf2=requestAnimationFrame(fit); });
      tmo=setTimeout(fit,60);
    };
    schedule();
    const ro=new ResizeObserver(schedule);
    ro.observe(document.body);
    addEventListener("resize",schedule); addEventListener("orientationchange",schedule);
    return ()=>{ ro.disconnect(); removeEventListener("resize",schedule); removeEventListener("orientationchange",schedule); cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(tmo); };
  },[]);

  /* ---------- initial adapt ---------- */
  useEffect(()=>{ const p=adapt({...profile},{...stats}); saveProfile(p); setProfile(p); /* eslint-disable-next-line */},[]);

  /* ---------- status ---------- */
  useEffect(()=>{
    if(screen==="menu"){ setStatus(""); return; }
    if (w===HUMAN) setStatus(screen==="vsai"?"You win! 🎉":"Player 1 wins! 🎉");
    else if (w===AI) setStatus(screen==="vsai"?"AI wins 🤖":"Player 2 wins! 🎉");
    else if (w===3) setStatus("Draw");
    else setStatus(turn===HUMAN? (screen==="vsai"?"Your turn":"P1 turn") : (screen==="vsai"?"AI thinking…":"P2 turn"));
  },[turn,w,screen]);

  /* ---------- AI move ---------- */
  useEffect(()=>{
    if(screen!=="vsai"||turn!==AI||over) return;
    const t=setTimeout(()=>{
      const ms=moves(board); if(!ms.length) return;
      for(const c of ms){ if(winner(drop(board,c,AI))===AI){ playAI(c); return; } }
      for(const c of ms){ if(winner(drop(board,c,HUMAN))===HUMAN){ playAI(c); return; } }
      const depth=clamp(query.depth??profile.aiConfig.depth,3,8);
      const randomness=clamp(query.rand??profile.aiConfig.randomness,0,0.6);
      const style=query.style??profile.aiConfig.style;
      const scored=ms.map(col=>{
        const child=drop(board,col,AI);
        const {score}=minimax(child, Math.max(0,depth-1), false, style, profile.humanColumnFreq);
        return {col,score:score-(profile.humanColumnFreq[col]||0)*1.8};
      }).sort((a,b)=>b.score-a.score);
      const pick=(Math.random()<randomness && scored.length>1)
        ? scored[Math.min(2,Math.floor(Math.random()*Math.min(3,scored.length)))].col
        : scored[0].col;
      playAI(pick);
    },140);
    return ()=>clearTimeout(t);
  },[turn,over,board,profile,query,screen]);

  /* ---------- end of game; delay for last-move highlight ---------- */
  useEffect(()=>{
    if(screen==="menu"||!over) return;
    const res=(screen==="vsai")?(w===HUMAN?'W':w===AI?'L':'D'):(w===HUMAN?'W':'L');
    const p={...profile,lastTen:[...profile.lastTen,(res==='W'?'W':'L')].slice(-10)};
    const ns=updStats(stats,res);
    adapt(p,ns); saveProfile(p); saveStats(ns); setProfile(p); setStats(ns);
    const show=()=>{ if(res==='W'){ confetti(1000); haptic(30); } setOverlay(w===3?'draw':(res==='W'?'win':'lose')); };
    const t=setTimeout(show,2000); // wait ~2s so last-move ring is visible
    return ()=>clearTimeout(t);
  // eslint-disable-next-line
  },[over,screen]);

  /* ---------- interactions ---------- */
  function human(col){
    if(over) return;
    if(screen==="vsai" && turn!==HUMAN) return;
    const player=(screen==="local" ? (turn===HUMAN?HUMAN:AI) : HUMAN);
    const nb=drop(board,col,player); if(!nb) return;

    const r=findRowOf(col, nb);
    if(lastTimerRef.current) clearTimeout(lastTimerRef.current);
    setLastMove({r,c:col,t:Date.now()});
    lastTimerRef.current=setTimeout(()=>setLastMove(null),2300);

    setBoard(nb); haptic(8);
    if(screen==="vsai"){ setTurn(AI); const p={...profile}; p.humanColumnFreq[col]=(p.humanColumnFreq[col]||0)+1; saveProfile(p); setProfile(p); }
    else { setTurn(turn===HUMAN?AI:HUMAN); }
  }
  function playAI(col){
    const nb=drop(board,col,AI); if(!nb) return;
    const r=findRowOf(col, nb);
    if(lastTimerRef.current) clearTimeout(lastTimerRef.current);
    setLastMove({r,c:col,t:Date.now()});
    lastTimerRef.current=setTimeout(()=>setLastMove(null),2300);

    setBoard(nb); setTurn(HUMAN);
  }
  function reset(){ setBoard(empty()); setTurn(HUMAN); setOverlay(null); }
  function resetAll(){ saveProfile(defProfile()); saveStats(defStats()); setProfile(defProfile()); setStats(defStats()); reset(); }
  function shareUrl(){ const u=new URL(location.href); u.searchParams.set("mm4","1"); u.searchParams.set("mode","streak"); u.searchParams.set("target",String(stats.bestStreak||1)); u.searchParams.set("depth",String(profile.aiConfig.depth)); u.searchParams.set("rand",String(profile.aiConfig.randomness)); u.searchParams.set("style",String(profile.aiConfig.style)); return u.toString(); }
  async function share(){ const link=shareUrl(); if(navigator.share){ try{ await navigator.share({title:"MindMatch 4 — Challenge",text:`Beat my ${stats.bestStreak}-win streak!`,url:link}); return;}catch{} } await navigator.clipboard?.writeText(link); setToast("Challenge link copied!"); setTimeout(()=>setToast(null),1400); }

  /* ---------- screens ---------- */
  if(screen==="menu"){
    return (
      <div ref={rootRef} style={ui.page}>
        <header className="mm4-header" style={ui.header}>
          <img src="/logo-128.png" alt="MindMatch 4" width="40" height="40" style={{borderRadius:8}} onError={e=>e.currentTarget.style.display='none'}/>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={ui.h1}>MindMatch 4</div>
            <div style={ui.tagline}>Beat the adaptive AI.</div>
          </div>
          <div style={ui.rowRight}>
            <select aria-label="Theme" value={theme} onChange={e=>setTheme(e.target.value)} style={ui.select}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </div>
        </header>

        <main style={ui.menuMain}>
          <div style={ui.menuButtons}>
            <button style={{...ui.btn,background:"#22c55e"}} onClick={()=>{setScreen("vsai"); reset();}}>Play vs AI</button>
            <button style={{...ui.btn,background:"#38bdf8"}} onClick={()=>{setScreen("local"); reset();}}>Multiplayer (Local)</button>
          </div>

          <section style={ui.help}>
            <h2 style={ui.h2}>How to win</h2>
            <div style={ui.steps} className="mm4-help-steps">
              <HowTo img="/howto-win-horizontal.gif" text="Horizontal — four across."/>
              <HowTo img="/howto-win-vertical.gif" text="Vertical — four stacked."/>
              <HowTo img="/howto-win-diagonal.gif" text="Diagonal — four in a slope."/>
            </div>
            <ul style={ui.list}>
              <li>Tap a column to drop your disc. Discs stack from the bottom.</li>
              <li>First to connect four in a row (↔, ↕, ↗/↘) wins.</li>
              <li>AI learns your habits and counters frequent columns.</li>
            </ul>
          </section>
        </main>
      </div>
    );
  }

  /* ---------- game screen ---------- */
  return (
    <div ref={rootRef} style={ui.page}>
      <header className="mm4-header" style={ui.header}>
        <img src="/logo-128.png" alt="MindMatch 4" width="36" height="36" style={{borderRadius:8}} onError={e=>e.currentTarget.style.display='none'}/>
        <div style={{textAlign:"center",flex:1}}>
          <div style={ui.h1Small}>MindMatch 4</div>
          <div style={ui.taglineSmall}>{screen==="vsai" ? "Beat the adaptive AI." : "Local hot‑seat: P1 vs P2"}</div>
        </div>
        <div style={ui.rowRight}>
          <select aria-label="Theme" value={theme} onChange={e=>setTheme(e.target.value)} style={ui.select}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
          <button style={{...ui.btn,background:"#ef4444"}} onClick={()=>{setScreen("menu");}}>Home</button>
        </div>
      </header>

      <div className="mm4-status" style={ui.status}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{display:"inline-block",width:12,height:12,borderRadius:99,background:turn===HUMAN?"var(--red)":"var(--yellow)"}}/>
          <b>{status}</b>
        </div>
        <div style={{...ui.muted,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {screen==="vsai" ? <>Depth <b>{profile.aiConfig.depth}</b> · RNG <b>{Math.round(profile.aiConfig.randomness*100)}%</b> · Style <b>{profile.aiConfig.style}</b> · </> : null}
          Rating <b>{stats.rating}</b> · Best Streak <b>{stats.bestStreak}</b>
        </div>
      </div>

      <main className="mm4-main" style={ui.main}>
        {/* Board */}
        <section ref={boardPanelRef} style={ui.panel}>
          <div style={ui.boardWrap}>
            <div style={ui.boardFrame} role="grid" aria-label="Connect Four board">
              <div style={ui.boardGrid}>
                {Array.from({length:COLS}).map((_,c)=>{
                  const col=[...board.map(r=>r[c])].reverse(); // bottom-up for display
                  return (
                    <button key={c} style={ui.colBtn} onClick={()=>human(c)} title={`Drop in column ${c+1}`} aria-label={`Drop in column ${c+1}`} disabled={!!winner(board)}>
                      {col.map((cell,i)=>{
                        const realRow = ROWS - 1 - i;
                        const isLast = lastMove && lastMove.r === realRow && lastMove.c === c && (Date.now() - lastMove.t) < 2300;
                        return (
                          <div key={i} style={ui.cell}>
                            <div style={{
                              ...ui.disc,
                              background: cell===HUMAN? "var(--red)" : cell===AI? "var(--yellow)" : "transparent",
                              boxShadow: cell ? "inset 0 6px 12px rgba(0,0,0,.35)" : "none",
                              outline: isLast ? "3px solid rgba(56,189,248,.9)" : "none",
                              outlineOffset: isLast ? "2px" : "0"
                            }}/>
                          </div>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
              <div style={ui.holes} aria-hidden="true"></div>
            </div>
          </div>
          <div style={ui.actions}>
            <button style={{...ui.btn,background:"#38bdf8"}} onClick={reset}>New Game</button>
            <button style={{...ui.btn,background:"#22c55e"}} onClick={share}>Share Challenge</button>
            <button style={{...ui.btn,background:"#ef4444"}} onClick={resetAll}>Reset Profile</button>
          </div>
        </section>

        {/* Stats */}
        <aside style={{...ui.panel,overflow:"auto"}}>
          <h3 style={{marginTop:0}}>Stats</h3>
          <div style={{fontSize:14,lineHeight:1.6}}>
            <div><span style={ui.muted}>Games:</span> {stats.games}</div>
            <div><span style={ui.muted}>Wins:</span> {stats.wins} · <span style={ui.muted}>Losses:</span> {stats.losses} · <span style={ui.muted}>Draws:</span> {stats.draws}</div>
            <div><span style={ui.muted}>Recent:</span> {profile.lastTen.join(" ")||"—"}</div>
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
        <div style={{...ui.overlay,zIndex:60}}>
          <div style={ui.card}>
            <div style={{fontSize:26,fontWeight:800,marginBottom:8}}>
              {overlay==='win'?"You win! 🎉":overlay==='lose'?"You lost":"Draw"}
            </div>
            <div style={{...ui.muted,marginBottom:10}}>
              {overlay==='win' ? "Nice! Try to push your streak." : overlay==='lose' ? "Go again—you’ll get it." : "Evenly matched!"}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button style={{...ui.btn,background:"#38bdf8"}} onClick={()=>{setOverlay(null); reset();}}>Play Again</button>
              <button style={{...ui.btn,background:"#22c55e"}} onClick={share}>Share</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={ui.toast}>{toast}</div>}
    </div>
  );
}

/* ---------- HowTo card ---------- */
function HowTo({img,text}){
  const [ok,setOk]=useState(true);
  return (
    <div style={ui.step}>
      <div style={ui.stepMedia}>
        {ok ? <img src={img} alt="" onError={()=>setOk(false)} style={ui.gif}/> :
          <div style={{...ui.gif,display:"grid",placeItems:"center",color:"var(--muted)",fontSize:12}}>(Add {img})</div>}
      </div>
      <div style={ui.stepText}>{text}</div>
    </div>
  );
}

/* ---------- Styles ---------- */
const ui={
  page:{minHeight:"100svh",background:"linear-gradient(180deg,var(--bg2),var(--bg))",color:"var(--ink)",overflow:"hidden"},
  header:{display:"flex",alignItems:"center",gap:12,padding:"10px 12px"},
  h1:{margin:0,fontSize:26,fontWeight:900,lineHeight:1.1},
  h2:{margin:"6px 0 10px",fontSize:18},
  tagline:{color:"var(--muted)",fontSize:13},
  h1Small:{fontSize:20,fontWeight:800,lineHeight:1},
  taglineSmall:{fontSize:12,color:"var(--muted)"},
  rowRight:{display:"flex",gap:8,alignItems:"center"},
  btn:{border:0,padding:"10px 14px",borderRadius:12,color:"#fff",fontWeight:700,cursor:"pointer",boxShadow:"var(--shadow)"},
  select:{border:"1px solid var(--panel-border)",background:"var(--panel)",color:"var(--ink)",borderRadius:10,padding:"8px 10px",fontWeight:600},
  muted:{color:"var(--muted)"},
  menuMain:{display:"grid",gridTemplateRows:"auto 1fr",gap:12,height:"calc(100svh - 62px)",padding:"0 12px",overflow:"hidden"},
  menuButtons:{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"},
  help:{background:"var(--panel)",border:"1px solid var(--panel-border)",borderRadius:16,padding:12,overflow:"auto"},
  steps:{display:"grid",gridTemplateColumns:"1fr",gap:12},
  step:{display:"grid",gridTemplateColumns:"150px 1fr",gap:12,alignItems:"center"},
  stepMedia:{width:150,height:88,overflow:"hidden",borderRadius:10,border:"1px solid var(--panel-border)"},
  gif:{width:"100%",height:"100%",objectFit:"cover"},
  stepText:{fontSize:14},
  list:{margin:"10px 0 0",paddingLeft:18,fontSize:14,lineHeight:1.6},
  status:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 12px 6px"},
  main:{maxWidth:1200,margin:"0 auto",padding:"0 12px",display:"grid",gridTemplateColumns:"1fr",gap:12,height:"calc(100svh - 134px)"},
  panel:{background:"var(--panel)",border:"1px solid var(--panel-border)",borderRadius:16,padding:12,boxShadow:"var(--shadow)",minHeight:0,overflow:"hidden"},
  boardWrap:{display:"grid",placeItems:"center",height:"100%"},
  boardFrame:{position:"relative",borderRadius:16,padding:"calc(var(--gap)*.6)",background:"linear-gradient(180deg,#0b162b,#0a1222)",height:"100%",width:"fit-content",maxWidth:"100%"},
  boardGrid:{position:"relative",display:"grid",gridTemplateColumns:"repeat(7,var(--cell))",gap:"var(--gap)",padding:"var(--gap)",borderRadius:12,background:"var(--bg2)"},
  holes:{position:"absolute",inset:0,pointerEvents:"none",borderRadius:12,boxShadow:"inset 0 0 0 2px var(--grid), inset 0 6px 18px rgba(0,0,0,.35)"},
  colBtn:{display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:"var(--gap)",background:"transparent",border:0,cursor:"pointer",padding:0},
  cell:{width:"var(--cell)",height:"var(--cell)",borderRadius:"50%",display:"grid",placeItems:"center",background:"radial-gradient(circle at 50% 50%, var(--hole) 62%, transparent 63%)",boxShadow:"inset 0 0 0 1px var(--grid)"},
  disc:{width:"calc(var(--cell) - var(--disc-pad))",height:"calc(var(--cell) - var(--disc-pad))",borderRadius:"50%",transition:"transform .18s ease"},
  actions:{display:"flex",gap:8,justifyContent:"center",marginTop:8,flexWrap:"wrap"},
  bars:{display:"flex",gap:6,alignItems:"end"},
  bar:{flex:1},
  barOuter:{height:"clamp(48px, 7.2vh, 70px)",background:"rgba(148,163,184,.35)",borderRadius:"6px 6px 0 0",overflow:"hidden",display:"flex",alignItems:"end"},
  barInner:{width:"100%",background:"var(--green)"},
  input:{padding:"8px 10px",borderRadius:10,border:"1px solid var(--panel-border)",background:"var(--panel)",color:"var(--ink)",width:"100%"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"grid",placeItems:"center",padding:16},
  card:{background:"var(--panel)",color:"var(--ink)",padding:18,borderRadius:16,border:"1px solid var(--panel-border)",width:"92%",maxWidth:460,textAlign:"center"},
  toast:{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",background:"var(--panel)",color:"var(--ink)",padding:"8px 12px",border:"1px solid var(--panel-border)",borderRadius:10}
};

// responsive CSS rules appended once
const styleEl=document.createElement("style");
styleEl.textContent=`@media (min-width:900px){ .mm4-main{grid-template-columns:minmax(0,1fr) 320px;} .mm4-help-steps{grid-template-columns:repeat(3,1fr);} } @media (max-width:899px){ .mm4-main{ height: calc(100svh - 132px); } button{ padding: 9px 12px; } }`;
document.head.appendChild(styleEl);

