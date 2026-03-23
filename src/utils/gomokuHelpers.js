export const GOMOKU_SIZE = 15;
export const BLACK = 1;
export const WHITE = -1;

const DIRECTIONS = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↙
];

export function createGomokuBoard() {
  return Array.from({ length: GOMOKU_SIZE }, () =>
    Array(GOMOKU_SIZE).fill(0)
  );
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function inBounds(r, c) {
  return r >= 0 && r < GOMOKU_SIZE && c >= 0 && c < GOMOKU_SIZE;
}

export function moveLabel(row, col) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

/** Returns array of 5 {row,col} positions forming the winning line, or null. */
export function findWinningStones(board) {
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      const player = board[r][c];
      if (!player) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const line = [];
        for (let i = 0; i < 5; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (!inBounds(nr, nc) || board[nr][nc] !== player) break;
          line.push({ row: nr, col: nc });
        }
        if (line.length === 5) return line;
      }
    }
  }
  return null;
}

export function getWinner(board) {
  const line = findWinningStones(board);
  return line ? board[line[0].row][line[0].col] : 0;
}

export function isBoardFull(board) {
  return board.every((row) => row.every((c) => c !== 0));
}

export function isGameOver(board) {
  return !!findWinningStones(board) || isBoardFull(board);
}

export function countStones(board) {
  let black = 0, white = 0, empty = 0;
  board.forEach((row) =>
    row.forEach((c) => {
      if (c === BLACK) black++;
      else if (c === WHITE) white++;
      else empty++;
    })
  );
  return { black, white, empty };
}

/* ── AI move selection ── */

/**
 * Score a line of 5 consecutive cells for a given player.
 * Returns a heuristic value based on how many friendly/enemy stones are in the window.
 */
function scoreWindow(window, player) {
  const mine = window.filter((c) => c === player).length;
  const opp = window.filter((c) => c === -player).length;

  if (mine === 5) return 100000;
  if (opp === 5) return -100000;
  if (mine === 4 && opp === 0) return 10000;
  if (opp === 4 && mine === 0) return -50000; // block opponent 4
  if (mine === 3 && opp === 0) return 1000;
  if (opp === 3 && mine === 0) return -4000;
  if (mine === 2 && opp === 0) return 100;
  if (opp === 2 && mine === 0) return -100;
  return 0;
}

function evaluateBoard(board, player) {
  let score = 0;
  const size = GOMOKU_SIZE;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const window = [];
        for (let i = 0; i < 5; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (!inBounds(nr, nc)) break;
          window.push(board[nr][nc]);
        }
        if (window.length === 5) {
          score += scoreWindow(window, player);
        }
      }
    }
  }

  // Center bias — stones closer to center score slightly higher
  const mid = Math.floor(size / 2);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === player) {
        score += Math.max(0, 4 - Math.max(Math.abs(r - mid), Math.abs(c - mid)));
      }
    }
  }

  return score;
}

/** Collect empty cells adjacent (within distance 2) to any existing stone. */
function getCandidateMoves(board) {
  const candidates = new Set();
  const size = GOMOKU_SIZE;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc) && board[nr][nc] === 0) {
            candidates.add(nr * size + nc);
          }
        }
      }
    }
  }

  // If no stones yet, return center
  if (candidates.size === 0) {
    const mid = Math.floor(size / 2);
    candidates.add(mid * size + mid);
  }

  return Array.from(candidates).map((k) => ({
    row: Math.floor(k / size),
    col: k % size,
  }));
}

function generateNote(board, move, player) {
  // Check if this move creates a winning line
  const testBoard = cloneBoard(board);
  testBoard[move.row][move.col] = player;
  if (findWinningStones(testBoard)) return "Winning move!";

  // Check if this blocks opponent's winning threat
  const oppBoard = cloneBoard(board);
  oppBoard[move.row][move.col] = -player;
  if (findWinningStones(oppBoard)) return "Blocks a critical threat";

  const mid = Math.floor(GOMOKU_SIZE / 2);
  const dist = Math.max(Math.abs(move.row - mid), Math.abs(move.col - mid));
  if (dist <= 2) return "Strong center position";
  return "Extends influence on the board";
}

export function pickBestGomokuMove(board, player, difficulty = "Hard") {
  const candidates = getCandidateMoves(board);
  if (!candidates.length) return null;

  // Easy: random move
  if (difficulty === "Easy") {
    const move = candidates[Math.floor(Math.random() * candidates.length)];
    return { ...move, score: 0, note: generateNote(board, move, player) };
  }

  // Score all candidates
  const scored = candidates.map((move) => {
    const next = cloneBoard(board);
    next[move.row][move.col] = player;
    let score = evaluateBoard(next, player);

    // Medium: basic heuristic, no lookahead
    if (difficulty === "Medium") {
      return { ...move, score };
    }

    // Hard/Expert/Auto: also consider opponent's best reply
    const oppCandidates = getCandidateMoves(next);
    let worstReply = 0;
    for (const opp of oppCandidates) {
      const oppBoard = cloneBoard(next);
      oppBoard[opp.row][opp.col] = -player;
      const replyScore = evaluateBoard(oppBoard, player);
      worstReply = Math.min(worstReply, replyScore);
    }

    if (difficulty === "Expert") {
      score = score * 0.4 + worstReply * 0.6;
    } else {
      score = score * 0.6 + worstReply * 0.4;
    }

    return { ...move, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Auto: blend — early game has randomness
  if (difficulty === "Auto") {
    const { empty } = countStones(board);
    const movesPlayed = GOMOKU_SIZE * GOMOKU_SIZE - empty;
    if (movesPlayed < 6 && Math.random() < 0.4) {
      const top = scored.slice(0, Math.min(5, scored.length));
      const pick = top[Math.floor(Math.random() * top.length)];
      return { ...pick, note: "Warming up" };
    }
  }

  const best = scored[0];
  return { ...best, note: generateNote(board, best, player) };
}
