// ai/engine.js
// 0=empty, 1=player (Yellow), -1=AI (Red).

export const ROWS = 6, COLS = 7;
export const ORDER = [3,2,4,1,5,0,6];
const TT = new Map();

export const clone = b => b.map(col => col.slice());
export function legalMoves(board){ return [...Array(COLS).keys()].filter(c=>board[c].length<ROWS); }
export function play(board, col, p){ const nb=clone(board); nb[col]=(nb[col]||[]).concat(p); return nb; }

// cell accessor in DOM row coordinates: r=0 top (visual), c=0..6 left->right
function cell(board, r, c){
  if (c<0 || c>=COLS || r<0 || r>=ROWS) return 0;
  // board stores columns bottom-up; visual r=0 is top, so translate:
  const h = board[c].length;
  const idx = ROWS-1-r;
  return idx < h ? board[c][idx] : 0;
}

export function findWinLine(board){
  // return [{r,c}*4] or null
  const dirs = [[1,0],[0,1],[1,1],[1,-1]]; // →, ↓, ↘, ↗
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){
    const p = cell(board, r, c); if(!p) continue;
    for(const [dc,dr] of dirs){
      let ok = true;
      for(let k=1;k<4;k++) if (cell(board, r+dr*k, c+dc*k)!==p){ ok=false; break; }
      if (ok) return [{r,c},{r:r+dr,c:c+dc},{r:r+2*dr,c:c+2*dc},{r:r+3*dr,c:c+3*dc}];
    }
  }
  return null;
}

export function winner(board){
  const line = findWinLine(board);
  if (line){ return cell(board, line[0].r, line[0].c); }
  if (legalMoves(board).length===0) return 2; // draw
  return 0;
}

function lineScore(a,b,c,d, me){
  const v=[a,b,c,d];
  if (v.includes(-me) && v.includes(me)) return 0;
  const sum=v.reduce((s,x)=>s+(x===me?1:0),0);
  if(sum===4) return 100000;
  if(sum===3) return 100;
  if(sum===2) return 10;
  if(sum===1) return 1;
  return 0;
}

function evaluate(board, me){
  let s=0;
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
    const a=cell(board,r,c), b=cell(board,r,c+1), c2=cell(board,r,c+2), d=cell(board,r,c+3);
    s+=lineScore(a,b,c2,d, me)-lineScore(a,b,c2,d,-me);
    const e=cell(board,r+1,c), f=cell(board,r+2,c), g=cell(board,r+3,c);
    s+=lineScore(a,e,f,g, me)-lineScore(a,e,f,g,-me);
    const h=cell(board,r+1,c+1), i=cell(board,r+2,c+2), j=cell(board,r+3,c+3);
    s+=lineScore(a,h,i,j, me)-lineScore(a,h,i,j,-me);
    const k=cell(board,r+1,c-1), l=cell(board,r+2,c-2), m=cell(board,r+3,c-3);
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
