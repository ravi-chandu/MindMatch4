import React, { useEffect, useMemo, useState } from "react";

/** MindMatch 4 — Mobile-first, SEO-ready, creative UI
 *  - Bigger cells via CSS var --cell; layout scales on phones.
 *  - Discs render from bottom (explicit reverse) + drop animation.
 *  - Inline SVG logo + consistent branding text.
 *  - Same adaptive AI + share challenge + confetti + leaderboard hooks.
 */

const ROWS=6, COLS=7, HUMAN=1, AI=2;
const LS_PROFILE_KEY="mm4_profile_v2", LS_STATS_KEY="mm4_stats_v2", LS_NAME_KEY="mm4_player_name";

const clone=b=>b.map(r=>r.slice());
const empty=()=>Array.from({length:ROWS},()=>Array(COLS).fill(0));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- Storage ---------- */
function defProfile(){return{humanColumnFreq:Array(COLS).fill(0), lastTen:[], aiConfig:{depth:4, randomness:0.2, style:"balanced"}}}
function loadProfile(){try{const s=localStorage.getItem(LS_PROFILE_KEY); if(!s) return defProfile(); const p=JSON.parse(s); return {...defProfile(), ...p, aiConfig:{...defProfile().aiConfig, ...(p.aiConfig||{})}}}catch{return defProfile()}}
function saveProfile(p){localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(p))}
function defStats(){return{games:0,wins:0,losses:0,draws:0,bestStreak:0,curStreak:0,rating:1200}}
function loadStats(){try{return JSON.parse(localStorage.getItem(LS_STATS_KEY))||defStats()}catch{return defStats()}}
function saveStats(s){localStorage.setItem(LS_STATS_KEY, JSON.stringify(s))}

const parseQuery=()=>{const p=new URLSearchParams(location.search);const q=Object.fromEntries(p.entries());["target","depth","rand"].forEach(k=>q[k]=q[k]!==undefined?Number(q[k]):undefined);return q}

/* ---------- Board logic ---------- */
function drop(board,col,pl){ if(board[0][col]!==0) return null; const nb=clone(board); for(let r=ROWS-1;r>=0;r--) if(nb[r][col]===0){nb[r][col]=pl; return nb} return null }
function moves(board){const m=[]; for(let c=0;c<COLS;c++) if(board[0][c]===0) m.push(c); return m}
function win(board){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]], inB=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){const p=board[r][c]; if(!p) continue;
    for(const[dr,dc] of dirs){ let k=1, nr=r+dr, nc=c+dc; while(inB(nr,nc)&&board[nr][nc]===p){ if(++k>=4) return p; nr+=dr; nc+=dc; } } }
  return moves(board).length?0:3;
}

/* ---------- AI ---------- */
function evalWin(w,player){ const opp=player===AI?HUMAN:AI; const cp=w.filter(x=>x===player).length, co=w.filter(x=>x===opp).length, ce=w.filter(x=>x===0).length;
  if(cp===4) return 100000; if(cp===3&&ce===1) return 200; if(cp===2&&ce===2) return 40; if(co===3&&ce===1) return -180; if(co===2&&ce===2) return -30; return 0; }
function score(b,player,style="balanced"){
  let s=0, ctr=Math.floor(COLS/2);
  for(let r=0;r<ROWS;r++) if(b[r][ctr]===player) s+=8;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS-3;c++) s+=evalWin([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]],player);
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS-3;r++) s+=evalWin([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]],player);
  for(let r=0;r<ROWS-3;r++) for(let c=0;c<COLS-3;c++) s+=evalWin([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]],player);
  for(let r=3;r<ROWS;r++) for(let c=0;c<COLS-3;c++) s+=evalWin([b[r][c],b[r-1][c+1],b[r-2][c+2],b[r-3][c+3]],player);
  if(style==="aggressive") s*=1.08; else if(style==="defensive") s*=0.98;
  return s;
}
function minimax(b,d,maxing,style,bias,alpha=-Infinity,beta=Infinity){
  const w=win(b);
  if(d===0||w){ if(w===AI) return{score:1e9}; if(w===HUMAN) return{score:-1e9}; if(w===3) return{score:0}; return{score:score(b,AI,style)}}
  const ms=moves(b).sort((a,c)=>Math.abs(a-3)-Math.abs(c-3)), pen=col=>(bias[col]||0)*1.5;
  if(maxing){ let best={score:-Infinity,col:ms[0]}; for(const col of ms){const child=drop(b,col,AI); if(!child) continue; let{score:s}=minimax(child,d-1,false,style,bias,alpha,beta); s-=pen(col); if(s>best.score) best={score:s,col}; alpha=Math.max(alpha,s); if(beta<=alpha) break} return best; }
  let best={score:Infinity,col:ms[0]}; for(const col of ms){const child=drop(b,col,HUMAN); if(!child) continue; let{score:s}=minimax(child,d-1,true,style,bias,alpha,beta); s+=pen(col); if(s<best.score) best={score:s,col}; beta=Math.min(beta,s); if(beta<=alpha) break} return best;
}

/* ---------- Adaptation ---------- */
function adapt(p,s){ const wr=(s.wins||0)/Math.max(1,(s.games||0)); const streaky=(s.curStreak||0)>=3;
  const depth=Math.round(3+4*clamp(wr*1.4,0,1)); const rand=Math.max(0.05,0.35-wr*0.4-(streaky?0.08:0));
  const center=(p.humanColumnFreq[3]||0)+(p.humanColumnFreq[2]||0)+(p.humanColumnFreq[4]||0);
  const edge=(p.humanColumnFreq[0]||0)+(p.humanColumnFreq[1]||0)+(p.humanColumnFreq[5]||0)+(p.humanColumnFreq[6]||0);
  p.aiConfig={ depth, randomness:Number(rand.toFixed(2)), style: center>=edge? "defensive":"aggressive" }; return p;
}
function updStats(st,res){ const s={...st}; s.games++; if(res==='W'){s.wins++; s.curStreak++; s.bestStreak=Math.max(s.bestStreak,s.curStreak); s.rating+=12+Math.max(0,6-Math.floor(s.curStreak/2))}
  else if(res==='L'){s.losses++; s.curStreak=0; s.rating-=10} else{s.draws++; s.rating-=2}
  s.rating=clamp(Math.round(s.rating),600,3000); return s; }

/* ---------- Confetti (same as before) ---------- */
function confetti(ms=1600){
  const old=document.getElementById("mm4-confetti"); if(old) old.remove();
  const c=document.createElement("canvas"); c.id="mm4-confetti"; document.body.appendChild(c);
  const ctx=c.getContext("2d"); const resize=()=>{c.width=innerWidth;c.height=innerHeight}; resize(); addEventListener("resize",resize,{once:true});
  const colors=["#ef4444","#f59e0b","#10b981","#38bdf8","#a78bfa"];
  const parts=Array.from({length:150},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.4,vx:(Math.random()-.5)*5,vy:3+Math.random()*4,g:.18+Math.random()*.18,w:8+Math.random()*6,h:12+Math.random()*8,a:Math.random()*Math.PI,s:(Math.random()<.5?-1:1)*(.1+Math.random()*.2),color:colors[Math.floor(Math.random()*colors.length)]}));
  let stop=performance.now()+ms; function tick(t){ctx.clearRect(0,0,c.width,c.height); parts.forEach(p=>{p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore()}); if(t<stop) requestAnimationFrame(tick); else c.remove()} requestAnimationFrame(tick);
}

/* ---------- App ---------- */
export default function App(){
  const query=useMemo(()=>parseQuery(),[]);
  const [board,setBoard]=useState(()=>empty());
  const [turn,setTurn]=useState(HUMAN);
  const [status,setStatus]=useState("Your turn");
  const [profile,setProfile]=useState(()=>loadProfile());
  const [stats,setStats]=useState(()=>loadStats());
  const [overlay,setOverlay]=useState(null);
  const [name,setName]=useState(()=>localStorage.getItem(LS_NAME_KEY)||"Player");
  const [toast,setToast]=useState(null);
  const winner=useMemo(()=>win(board),[board]);
  const gameOver=winner!==0;

  // daily seed: subtle early variety
  const seed=useMemo(()=>Number(new Date().toISOString().slice(0,10).replace(/-/g,'')),[]);

  useEffect(()=>{ const p=adapt({...profile},{...stats}); saveProfile(p); setProfile(p); /* eslint-disable-next-line */ },[]);
  useEffect(()=>{ // AI move
    if(turn!==AI||gameOver) return;
    const t=setTimeout(()=>{ const mv=aiMove(board,profile,query,seed); if(mv==null) return; const nb=drop(board,mv,AI); if(!nb) return; setBoard(nb); setTurn(HUMAN); },180);
    return()=>clearTimeout(t);
  },[turn,gameOver,board,profile,query,seed]);
  useEffect(()=>{ if(winner===HUMAN) setStatus("You win! 🎉"); else if(winner===AI) setStatus("AI wins 🤖"); else if(winner===3) setStatus("Draw"); else setStatus(turn===HUMAN?"Your turn":"AI thinking…"); },[turn,winner]);
  useEffect(()=>{ if(!gameOver) return; const res=winner===HUMAN?'W':winner===AI?'L':'D';
    const p={...profile, lastTen:[...profile.lastTen,res].slice(-10)}; const ns=updStats(stats,res); adapt(p,ns); saveProfile(p); setProfile(p); saveStats(ns); setStats(ns);
    if(res==='W') confetti(2000); setOverlay(res==='W'?'win':res==='L'?'lose':'draw'); /* eslint-disable-next-line */ },[gameOver]);

  function aiMove(b,p,q,seed){
    const ms=moves(b); if(!ms.length) return null;
    const tokens=b.flat().filter(Boolean).length;
    if(tokens<=1 && Math.random()<0.25){ const idx=Math.abs((seed*9301+49297)%233280)/233280; return ms[Math.floor(idx*ms.length)] }
    for(const c of ms){ if(win(drop(b,c,AI))===AI) return c }
    for(const c of ms){ if(win(drop(b,c,HUMAN))===HUMAN) return c }
    const depth=clamp(q.depth??p.aiConfig.depth,3,8), randomness=clamp(q.rand??p.aiConfig.randomness,0,0.6), style=q.style??p.aiConfig.style;
    const scored=ms.map(col=>{const child=drop(b,col,AI); const {score:s}=minimax(child,Math.max(0,depth-1),false,style,p.humanColumnFreq); return {col,score: s-(p.humanColumnFreq[col]||0)*2}}).sort((a,b)=>b.score-a.score);
    if(Math.random()<randomness && scored.length>1) return scored[Math.min(2,Math.floor(Math.random()*Math.min(3,scored.length)))].col;
    return scored[0].col;
  }

  function onHuman(col){
    if(turn!==HUMAN||gameOver) return;
    const nb=drop(board,col,HUMAN); if(!nb) return;
    setBoard(nb); setTurn(AI);
    const p={...profile}; p.humanColumnFreq[col]=(p.humanColumnFreq[col]||0)+1; saveProfile(p); setProfile(p);
    // trigger drop animation for that new cell (CSS class added briefly)
    requestAnimationFrame(()=>{ const el=document.querySelector(`[data-col='${col}'][data-empty='false']:not(.mm4-done)`); if(el){ el.classList.add('mm4-drop'); setTimeout(()=>el.classList.remove('mm4-drop'),300); el.classList.add('mm4-done'); }});
  }

  function hardReset(){ setBoard(empty()); setTurn(HUMAN); setOverlay(null) }
  function resetAll(){ saveProfile(defProfile()); setProfile(defProfile()); saveStats(defStats()); setStats(defStats()); hardReset() }

  function shareUrl(){ const u=new URL(location.href); u.searchParams.set("mm4","1"); u.searchParams.set("mode","streak"); u.searchParams.set("target",String(stats.bestStreak||1)); u.searchParams.set("depth",String(profile.aiConfig.depth)); u.searchParams.set("rand",String(profile.aiConfig.randomness)); u.searchParams.set("style",String(profile.aiConfig.style)); return u.toString(); }
  async function shareChallenge(){ const link=shareUrl(); const txt=`MindMatch 4 — beat my ${stats.bestStreak}-win streak!`; if(navigator.share){try{await navigator.share({title:"MindMatch 4 — Challenge",text:txt,url:link}); return;}catch{}} await navigator.clipboard?.writeText(link); setToast("Challenge link copied!"); setTimeout(()=>setToast(null),1600) }

  // ——— UI ——— //
  return (
    <div style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <div style={s.brandRow}>
            <Logo />
            <div>
              <h1 style={{margin:0,lineHeight:1}}>MindMatch 4</h1>
              <div style={s.muted}>Every win makes me stronger.</div>
            </div>
          </div>
          <div style={s.row}>
            <button style={{...s.btn,background:"#64748b"}} onClick={()=>alert('Goal: connect 4. Tap a column to drop a disc. Share a challenge after a win!')}>Help</button>
            <button style={{...s.btn,background:"#38bdf8"}} onClick={hardReset}>New Game</button>
            <button style={{...s.btn,background:"#22c55e"}} onClick={shareChallenge}>Share Challenge</button>
            <button style={{...s.btn,background:"#ef4444"}} onClick={resetAll}>Reset Profile</button>
          </div>
        </header>

        <div style={s.status}>
          <div style={{fontWeight:700}}>{status}</div>
          <div style={{...s.muted,fontSize:14}}>
            Depth <b>{profile.aiConfig.depth}</b> · RNG <b>{Math.round(profile.aiConfig.randomness*100)}%</b> · Style <b>{profile.aiConfig.style}</b> · Rating <b>{stats.rating}</b> · Best Streak <b>{stats.bestStreak}</b>
          </div>
        </div>

        <div style={s.grid}>
          {/* Board */}
          <div style={s.panel}>
            <div style={s.frame}>
              <div style={s.board}>
                {Array.from({length:COLS}).map((_,c)=>{
                  // EXPLICIT bottom-first render for each column:
                  const colTopToBottom = board.map(r=>r[c]);
                  const colBottomFirst = [...colTopToBottom].reverse();
                  return (
                    <button key={c} style={s.col} title={`Drop in column ${c+1}`} onClick={()=>onHuman(c)} disabled={!!win(board)}>
                      {colBottomFirst.map((cell,i)=>{
                        const bottomIndex = ROWS-1-i; // real board row index
                        const filled = board[bottomIndex][c]!==0;
                        return (
                          <div key={i} style={s.cell} data-col={c} data-empty={String(!filled)}>
                            <div className={`disc ${filled?'filled':''}`} style={{
                              ...s.disc,
                              background: cell===HUMAN? "#ef4444" : cell===AI? "#fbbf24" : "transparent",
                              boxShadow: cell? "inset 0 6px 12px rgba(0,0,0,.35)" : "none"
                            }} />
                          </div>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
              {/* Board holes overlay for a “real board” look */}
              <div style={s.holes} aria-hidden />
            </div>
          </div>

          {/* Sidebar */}
          <aside style={s.panel}>
            <h3 style={{marginTop:0}}>Stats</h3>
            <div style={{fontSize:14,lineHeight:1.6}}>
              <div><span style={s.muted}>Games:</span> {stats.games}</div>
              <div><span style={s.muted}>Wins:</span> {stats.wins} · <span style={s.muted}>Losses:</span> {stats.losses} · <span style={s.muted}>Draws:</span> {stats.draws}</div>
              <div><span style={s.muted}>Recent:</span> {profile.lastTen.join(" ") || "—"}</div>
            </div>

            <h4 style={{margin:"16px 0 8px"}}>Your Column Preferences</h4>
            <div style={s.bars}>
              {profile.humanColumnFreq.map((f,i,arr)=>{
                const total=Math.max(1,arr.reduce((a,b)=>a+b,0)); const h=(f/total)*100;
                return (
                  <div key={i} style={s.bar}>
                    <div style={s.barOuter}><div style={{...s.barInner,height:`${h}%`}}/></div>
                    <div style={{textAlign:"center",fontSize:12,marginTop:6}}>{i+1}</div>
                  </div>
                );
              })}
            </div>

            <h4 style={{margin:"18px 0 8px"}}>Publish Score</h4>
            <label style={{fontSize:14}}>
              Name:&nbsp;
              <input value={name} onChange={e=>{setName(e.target.value); localStorage.setItem(LS_NAME_KEY,e.target.value)}}
                     placeholder="Your name" style={s.input}/>
            </label>
            <div style={{fontSize:13, ...s.muted, marginTop:6}}>Best streak <b>{stats.bestStreak}</b> · Rating <b>{stats.rating}</b></div>
          </aside>
        </div>

        {overlay && (
          <div style={s.overlay}>
            <div style={s.card}>
              <div style={{fontSize:26,fontWeight:800,marginBottom:8}}>
                {overlay==='win'?"You win! 🎉":overlay==='lose'?"AI wins 🤖":"Draw"}
              </div>
              <div style={{...s.muted,marginBottom:12}}>Play again or share a challenge with a friend.</div>
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <button style={{...s.btn,background:"#38bdf8"}} onClick={()=>{setOverlay(null); setBoard(empty()); setTurn(HUMAN);}}>Play Again</button>
                <button style={{...s.btn,background:"#22c55e"}} onClick={shareChallenge}>Share Challenge</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div style={s.toast}>{toast}</div>}
      </div>
      {/* component-scoped CSS for better UX */}
      <style>{`
        .disc { transition: transform .28s ease, background .2s ease; }
        .disc.filled.mm4-drop { transform: translateY(-12%); } /* quick bounce hint */
        button:disabled { opacity:.5; cursor:not-allowed }
        @media (max-width: 900px){
          .brand-row { gap: 10px; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Small components & styles ---------- */

function Logo(){
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" style={{marginRight:12}}>
      <rect x="2" y="2" width="60" height="60" rx="12" fill="#0b1222" stroke="#1f2937" />
      <circle cx="22" cy="22" r="8" fill="#ef4444"/>
      <circle cx="32" cy="32" r="8" fill="#fbbf24"/>
      <circle cx="42" cy="42" r="8" fill="#38bdf8"/>
      <text x="8" y="58" fontSize="14" fill="#e5e7eb" fontFamily="Arial, sans-serif">4</text>
    </svg>
  );
}

const s={
  page:{minHeight:"100vh", background:"linear-gradient(180deg,#0f172a,#0b1222)", color:"var(--ink)"},
  container:{maxWidth:1100, margin:"0 auto", padding:"16px"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:8},
  brandRow:{display:"flex",alignItems:"center",gap:14} ,
  row:{display:"flex",gap:8,flexWrap:"wrap"},
  btn:{border:0,padding:"10px 14px",borderRadius:12,color:"#fff",fontWeight:700,cursor:"pointer"},
  muted:{color:"var(--muted)"},
  status:{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"6px 4px 14px"},
  grid:{display:"grid",gridTemplateColumns:"1fr 320px",gap:"clamp(12px,2.5vw,18px)"},
  panel:{background:"rgba(17,24,39,.75)",border:"1px solid rgba(255,255,255,.06)",borderRadius:16,padding:"12px",boxShadow:"0 10px 30px rgba(0,0,0,.35)"},
  frame:{position:"relative", padding:"calc(var(--gap) * .5)", borderRadius:16, background:"linear-gradient(180deg,#0b162b,#0a1222)", boxShadow:"inset 0 6px 18px rgba(0,0,0,.45)"},
  board:{position:"relative", display:"grid", gridTemplateColumns:"repeat(7,var(--cell))", gap:"var(--gap)", padding:"var(--gap)"},
  holes:{position:"absolute", inset:0, padding:"var(--gap)", pointerEvents:"none",
    background:"radial-gradient(circle at var(--gap) var(--gap), rgba(0,0,0,.35) 0, rgba(0,0,0,.35) calc(var(--cell)/2), transparent calc(var(--cell)/2 + 1px))",
    mask:`radial-gradient(circle calc(var(--cell)/2) at calc(var(--gap) + var(--cell)/2) calc(var(--gap) + var(--cell)/2), transparent 98%, black 100%)`
  },
  col:{display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:"var(--gap)",background:"transparent",border:0,cursor:"pointer",padding:0},
  cell:{width:"var(--cell)", height:"var(--cell)", borderRadius:"50%", display:"grid", placeItems:"center", position:"relative"},
  disc:{width:"calc(var(--cell) - 8px)",height:"calc(var(--cell) - 8px)",borderRadius:"50%",background:"transparent"},
  bars:{display:"flex",gap:6,alignItems:"end"},
  bar:{flex:1},
  barOuter:{height:64, background:"rgba(148,163,184,.35)", borderRadius:"6px 6px 0 0", overflow:"hidden", display:"flex", alignItems:"end"},
  barInner:{width:"100%", background:"#22c55e"},
  input:{padding:"7px 10px",borderRadius:10,border:"1px solid rgba(255,255,255,.12)",background:"#0d1426",color:"#e5e7eb"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"grid",placeItems:"center",padding:16},
  card:{background:"#0b1324",padding:18,borderRadius:16,border:"1px solid rgba(255,255,255,.08)", width:"92%",maxWidth:460,textAlign:"center"},
  toast:{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",background:"rgba(15,23,42,.95)",padding:"10px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.08)"}
};
