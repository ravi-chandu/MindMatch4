// ai/engine.js
// Connect Four engine: negamax + alpha-beta + transposition + iterative deepening
// 0=empty, 1=player (Yellow), -1=AI (Red).
 
export const ROWS = 6, COLS = 7;
export const ORDER = [3,2,4,1,5,0,6];
const TT = new Map(); // transposition table

export const clone = b => b.map(col => col.slice());

export function legalMoves(board){ return [...Array(COLS).keys()].filter(c=>board[c].length<ROWS); }
export function play(board, col, p){ const nb=clone(board); nb[col]=(nb[col]||[]).concat(p); return nb; }

export function winner(board){
  // return 1, -1, or 0 (no winner yet), 2 for draw
  const cell = (r,c)=> (c<0||c>=COLS||r<0||r>=board[c].length)?0:board[c][r];
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for(let c=0;c<COLS;c++)for(let r=0;r<board[c].length;r++){
    const p = cell(r,c); if(!p) continue;
    for(const [dc,dr] of dirs){
      let k=1; for(;k<4;k++) if(cell(r+dr*k,c+dc*k)!==p) break;
      if(k===4) return p;
    }
  }
  if(legalMoves(board).length===0) return 2; // draw
  return 0;
}

function lineScore(a,b,c,d, me){
  const v=[a,b,c,d];
  if (v.includes(-me) && v.includes(me)) return 0; // blocked
  const sum=v.reduce((s,x)=>s+(x===me?1:0),0);
  if(sum===4) return 100000;
  if(sum===3) return 100;
  if(sum===2) return 10;
  if(sum===1) return 1;
  return 0;
}

function evaluate(board, me){
  let s=0;
  const cell=(r,c)=> (c<0||c>=COLS||r<0||r>=board[c].length)?0:board[c][r];
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
    const a=cell(r,c), b=cell(r,c+1), c2=cell(r,c+2), d=cell(r,c+3);
    s+=lineScore(a,b,c2,d, me)-lineScore(a,b,c2,d,-me);
    const e=cell(r+1,c), f=cell(r+2,c), g=cell(r+3,c);
    s+=lineScore(a,e,f,g, me)-lineScore(a,e,f,g,-me);
    const h=cell(r+1,c+1), i=cell(r+2,c+2), j=cell(r+3,c+3);
    s+=lineScore(a,h,i,j, me)-lineScore(a,h,i,j,-me);
    const k=cell(r+1,c-1), l=cell(r+2,c-2), m=cell(r+3,c-3);
    s+=lineScore(a,k,l,m, me)-lineScore(a,k,l,m,-me);
  }
  return s;
}

function keyOf(board, player){ return player+"|"+board.map(c=>c.join("")).join(","); }

function negamax(board, player, depth, alpha, beta, endTime){
  const term = winner(board);
  if (term===player)  return {val:  99999, best:null};
  if (term===-player) return {val: -99999, best:null};
  if (term===2)       return {val: 0, best:null};
  if (depth===0 || performance.now()>endTime) return {val: evaluate(board, player), best:null};

  const ttKey=keyOf(board, player);
  const tt = TT.get(ttKey);
  if (tt && tt.depth>=depth) return {val: tt.val, best: tt.best};

  let bestMove = null, bestVal = -Infinity;
  for (const c of ORDER.filter(x=>board[x].length<ROWS)){
    const child = play(board, c, player);
    const {val} = negamax(child, -player, depth-1, -beta, -alpha, endTime);
    const score = -val;
    if (score>bestVal){ bestVal=score; bestMove=c; }
    alpha = Math.max(alpha, score);
    if (alpha>=beta) break;
  }

  TT.set(ttKey, {depth, val:bestVal, best:bestMove});
  return {val: bestVal, best: bestMove};
}

export function bestMoveTimeboxed(board, player, timeMs, maxDepth=12){
  const end = performance.now()+timeMs;
  TT.clear();
  let out={val:0,best:null}, d=2;
  while (d<=maxDepth && performance.now()<=end){
    const r = negamax(board, player, d, -1e9, 1e9, end);
    if (performance.now()>end) break;
    out=r; d++;
  }
  return out;
}
