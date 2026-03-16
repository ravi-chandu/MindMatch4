export const REVERSI_SIZE = 8;
export const BLACK = 1;
export const WHITE = -1;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const POSITION_WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
];

export function createReversiBoard() {
  const board = Array.from({ length: REVERSI_SIZE }, () =>
    Array(REVERSI_SIZE).fill(0)
  );

  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;

  return board;
}

export function cloneReversiBoard(board) {
  return board.map((row) => row.slice());
}

export function inBounds(row, col) {
  return row >= 0 && row < REVERSI_SIZE && col >= 0 && col < REVERSI_SIZE;
}

export function getFlips(board, row, col, player) {
  if (!inBounds(row, col) || board[row][col] !== 0) return [];

  const flips = [];

  for (const [dr, dc] of DIRECTIONS) {
    const line = [];
    let nextRow = row + dr;
    let nextCol = col + dc;

    while (inBounds(nextRow, nextCol) && board[nextRow][nextCol] === -player) {
      line.push([nextRow, nextCol]);
      nextRow += dr;
      nextCol += dc;
    }

    if (line.length && inBounds(nextRow, nextCol) && board[nextRow][nextCol] === player) {
      flips.push(...line);
    }
  }

  return flips;
}

export function getValidMoves(board, player) {
  const moves = [];

  for (let row = 0; row < REVERSI_SIZE; row++) {
    for (let col = 0; col < REVERSI_SIZE; col++) {
      const flips = getFlips(board, row, col, player);
      if (flips.length) moves.push({ row, col, flips });
    }
  }

  return moves;
}

export function applyReversiMove(board, move, player) {
  const flips = move.flips?.length
    ? move.flips
    : getFlips(board, move.row, move.col, player);

  if (!flips.length) return null;

  const nextBoard = cloneReversiBoard(board);
  nextBoard[move.row][move.col] = player;

  flips.forEach(([row, col]) => {
    nextBoard[row][col] = player;
  });

  return nextBoard;
}

export function countDiscs(board) {
  const totals = { black: 0, white: 0, empty: 0 };

  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell === BLACK) totals.black += 1;
      else if (cell === WHITE) totals.white += 1;
      else totals.empty += 1;
    });
  });

  return totals;
}

export function hasMoves(board, player) {
  return getValidMoves(board, player).length > 0;
}

export function isCorner(row, col) {
  return (row === 0 || row === 7) && (col === 0 || col === 7);
}

function isEdge(row, col) {
  return row === 0 || row === 7 || col === 0 || col === 7;
}

function touchesOpenCorner(board, row, col) {
  const riskySpots = [
    [0, 1, 0, 0],
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 6, 0, 7],
    [1, 6, 0, 7],
    [1, 7, 0, 7],
    [6, 0, 7, 0],
    [6, 1, 7, 0],
    [7, 1, 7, 0],
    [6, 6, 7, 7],
    [6, 7, 7, 7],
    [7, 6, 7, 7],
  ];

  return riskySpots.some(
    ([r, c, cornerRow, cornerCol]) =>
      row === r && col === c && board[cornerRow][cornerCol] === 0
  );
}

function countCorners(board, player) {
  return [
    board[0][0],
    board[0][7],
    board[7][0],
    board[7][7],
  ].filter((cell) => cell === player).length;
}

export function moveLabel(row, col) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

export function getWinner(board) {
  const { black, white } = countDiscs(board);
  if (black === white) return 0;
  return black > white ? BLACK : WHITE;
}

export function isGameOver(board) {
  const { empty } = countDiscs(board);
  return empty === 0 || (!hasMoves(board, BLACK) && !hasMoves(board, WHITE));
}

export function pickBestReversiMove(board, player, difficulty = "Hard") {
  const moves = getValidMoves(board, player);
  if (!moves.length) return null;

  // Easy: pick a random legal move
  if (difficulty === "Easy") {
    const move = moves[Math.floor(Math.random() * moves.length)];
    let note = "Random pick";
    if (isCorner(move.row, move.col)) note = "Lucky corner grab";
    return { ...move, score: 0, note };
  }

  let best = null;

  moves.forEach((move) => {
    const nextBoard = applyReversiMove(board, move, player);
    const nextMoves = getValidMoves(nextBoard, -player);
    const counts = countDiscs(nextBoard);
    const ourCount = player === BLACK ? counts.black : counts.white;
    const theirCount = player === BLACK ? counts.white : counts.black;
    const givesCorner = nextMoves.some(({ row, col }) => isCorner(row, col));

    let score = POSITION_WEIGHTS[move.row][move.col];
    score += move.flips.length * 2;
    score += (ourCount - theirCount) * 0.5;
    score += countCorners(nextBoard, player) * 45;
    score -= countCorners(nextBoard, -player) * 35;
    score -= nextMoves.length * 4;

    if (isEdge(move.row, move.col)) score += 6;
    if (touchesOpenCorner(board, move.row, move.col)) score -= 32;
    if (givesCorner) score -= 40;

    // Expert: also evaluate opponent's best reply
    if (difficulty === "Expert" && nextMoves.length) {
      let worstReply = Infinity;
      nextMoves.forEach((opp) => {
        const oppBoard = applyReversiMove(nextBoard, opp, -player);
        const afterMoves = getValidMoves(oppBoard, player);
        let replyScore = POSITION_WEIGHTS[opp.row][opp.col];
        replyScore += opp.flips.length * 2;
        replyScore -= afterMoves.length * 3;
        if (isCorner(opp.row, opp.col)) replyScore += 50;
        worstReply = Math.min(worstReply, -replyScore);
      });
      score += worstReply * 0.6;
    }

    // Medium: ignore mobility/corner-risk penalties (simpler evaluation)
    if (difficulty === "Medium") {
      score = POSITION_WEIGHTS[move.row][move.col] + move.flips.length * 2;
      if (isCorner(move.row, move.col)) score += 40;
    }

    let note = "Improves board control";
    if (isCorner(move.row, move.col)) note = "Secures a corner";
    else if (nextMoves.length === 0) note = "Forces a pass";
    else if (isEdge(move.row, move.col)) note = "Builds a safe edge";
    else if (move.flips.length >= 4) note = "Creates a strong swing";
    else if (touchesOpenCorner(board, move.row, move.col)) {
      note = "Playable, but still risky near a corner";
    }

    if (!best || score > best.score) {
      best = { ...move, score, note };
    }
  });

  // Auto: blend — play Easy for first 8 moves, then Hard
  if (difficulty === "Auto") {
    const { empty } = countDiscs(board);
    const movesPlayed = 64 - empty - 4; // subtract initial 4 discs
    if (movesPlayed < 8) {
      // Mix: 50% chance of random in early game
      if (Math.random() < 0.5) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        return { ...move, score: 0, note: "Warming up" };
      }
    }
  }

  return best;
}
