// ai/adapter.js
(function(){
  const W = window;
  function isColMajor(b){ return Array.isArray(b) && b.length===7 && b.every(col=>Array.isArray(col)); }
  function isGrid(b){ return Array.isArray(b) && b.length>=6 && Array.isArray(b[0]) && b[0].length===7; }
  function gridToCols(grid){
    const cols = Array.from({length:7}, ()=>[]);
    for (let c=0;c<7;c++){
      for (let r=5;r>=0;r--){
        const v = grid[r][c];
        if (v===1 || v===-1) cols[c].push(v);
        else if (v===0 || v===undefined) break;
      }
    }
    return cols;
  }
  function colsToGrid(cols){
    const grid = Array.from({length:6}, ()=>Array(7).fill(0));
    for (let c=0;c<7;c++){
      const col = cols[c]||[];
      for (let r=0;r<col.length && r<6;r++){ grid[5-r][c] = col[r]; }
    }
    return grid;
  }
  function sniffBoard(){
    let b = W.board || (W.game && W.game.board) || null;
    if (b){
      if (isColMajor(b)) return b;
      if (isGrid(b)) return gridToCols(b);
    }
    const cells = document.querySelectorAll("[data-col][data-row][data-val]");
    if (cells.length){
      const grid = Array.from({length:6}, ()=>Array(7).fill(0));
      cells.forEach(el=>{
        const r = parseInt(el.getAttribute("data-row"),10);
        const c = parseInt(el.getAttribute("data-col"),10);
        const v = parseInt(el.getAttribute("data-val"),10);
        if (!Number.isNaN(r)&&!Number.isNaN(c)&&!Number.isNaN(v)) grid[r][c]=v;
      });
      return gridToCols(grid);
    }
    return Array.from({length:7},()=>[]);
  }
  function setBoard(cols){
    if (isColMajor(W.board)) { W.board = cols; }
    else if (W.board && isGrid(W.board)) { W.board = colsToGrid(cols); }
    else if (W.game && isColMajor(W.game.board)) { W.game.board = cols; }
    else if (W.game && isGrid(W.game.board)) { W.game.board = colsToGrid(cols); }
    if (typeof W.renderBoard === "function") W.renderBoard(W.board || colsToGrid(cols));
  }
  function applyMove(col){
    if (typeof W.dropPiece === "function"){
      try { W.dropPiece(col); return true; } catch(e){}
    }
    const cols = sniffBoard();
    if (cols[col].length<6){
      cols[col].push(-1);
      setBoard(cols);
      return true;
    }
    return false;
  }
  let lastHintTimer = null;
  function highlightCols(cols){
    document.querySelectorAll(".col,.column,[data-col]").forEach(el=>el.classList.remove("hint-col"));
    cols.forEach(c=>{
      const sel = `[data-col="${c}"]`;
      const targets = document.querySelectorAll(sel);
      targets.forEach(el=>el.classList.add("hint-col"));
      const header = document.querySelector(`.col-${c}`);
      if (header) header.classList.add("hint-col");
      const t = targets[0] || header;
      if (t && typeof t.scrollIntoView === "function"){
        t.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    });
    if (lastHintTimer) clearTimeout(lastHintTimer);
    lastHintTimer = setTimeout(()=>{
      document.querySelectorAll(".hint-col").forEach(el=>el.classList.remove("hint-col"));
    }, 2500);
  }
  W.getBoardState = W.getBoardState || sniffBoard;
  W.loadBoardState = W.loadBoardState || setBoard;
  W.applyMove = W.applyMove || applyMove;
  W.highlightCols = W.highlightCols || highlightCols;
})();
