/* ════════════════════════════════════════════════════
   2048 game logic — pure functions, no React.
   Board is a 4x4 grid of numbers (0 = empty).
   ════════════════════════════════════════════════════ */

export const SIZE = 4;
export const WIN_TILE = 2048;

export const BEST_KEY = "mm4_2048_best";

let _id = 1;
export const nextId = () => ++_id;

/** Create a fresh board with two starter tiles. */
export function newBoard() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  return spawnTile(spawnTile({ grid, tiles: [], score: 0, won: false, over: false, moves: 0 }, true), true);
}

function emptyCells(grid) {
  const out = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) out.push([r, c]);
  return out;
}

/** Place a 2 (90%) or 4 (10%) on a random empty cell. */
export function spawnTile(state, fromInit = false) {
  const cells = emptyCells(state.grid);
  if (!cells.length) return state;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const grid = state.grid.map(row => row.slice());
  grid[r][c] = value;
  const id = nextId();
  const tiles = state.tiles.concat([{ id, r, c, value, isNew: !fromInit, merged: false }]);
  return { ...state, grid, tiles };
}

/* ── Move logic ──
   We rotate the grid so all moves become "left", run the slide, then rotate back. */

function rotateCW(grid) {
  const out = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) out[c][SIZE - 1 - r] = grid[r][c];
  return out;
}
function rotateCCW(grid) {
  const out = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) out[SIZE - 1 - c][r] = grid[r][c];
  return out;
}

function slideLeftRow(row) {
  const filtered = row.filter(v => v !== 0);
  const out = [];
  let gained = 0;
  let merges = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      out.push(merged);
      gained += merged;
      merges++;
      i++;
    } else {
      out.push(filtered[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  const moved = !row.every((v, i) => v === out[i]);
  return { row: out, gained, merges, moved };
}

function slideLeft(grid) {
  let gained = 0, moved = false, merges = 0;
  const next = grid.map(row => {
    const r = slideLeftRow(row);
    gained += r.gained; merges += r.merges; if (r.moved) moved = true;
    return r.row;
  });
  return { grid: next, gained, moved, merges };
}

/**
 * Slide direction: "left" | "right" | "up" | "down"
 * Returns new state. Does not spawn a new tile if no tile moved.
 */
export function slide(state, dir) {
  if (state.over) return state;
  let g = state.grid;
  if (dir === "up") g = rotateCCW(g);
  else if (dir === "down") g = rotateCW(g);
  else if (dir === "right") g = g.map(row => row.slice().reverse());

  const res = slideLeft(g);
  if (!res.moved) return state;

  let next = res.grid;
  if (dir === "up") next = rotateCW(next);
  else if (dir === "down") next = rotateCCW(next);
  else if (dir === "right") next = next.map(row => row.reverse());

  // Rebuild tile list from grid (simpler + reliable for animations).
  const tiles = [];
  let won = state.won;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (next[r][c]) {
      tiles.push({ id: nextId(), r, c, value: next[r][c], isNew: false, merged: false });
      if (next[r][c] >= WIN_TILE) won = true;
    }
  }

  let after = { ...state, grid: next, tiles, score: state.score + res.gained, moves: state.moves + 1, won, lastGain: res.gained, lastMerges: res.merges };
  after = spawnTile(after);
  after.over = !canMove(after.grid);
  return after;
}

export function canMove(grid) {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!grid[r][c]) return true;
    if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
    if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
  }
  return false;
}

export function maxTile(grid) {
  let m = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] > m) m = grid[r][c];
  return m;
}

export function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch { return 0; }
}
export function saveBest(score) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
}
