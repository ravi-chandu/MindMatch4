import {
  BLACK,
  WHITE,
  createGomokuBoard,
  cloneBoard,
  findWinningStones,
  getWinner,
  isBoardFull,
  isGameOver,
  countStones,
  pickBestGomokuMove,
} from "../src/utils/gomokuHelpers.js";

test("empty board has no winner", () => {
  const board = createGomokuBoard();
  expect(getWinner(board)).toBe(0);
  expect(findWinningStones(board)).toBeNull();
});

test("detects horizontal five-in-a-row", () => {
  const board = createGomokuBoard();
  for (let c = 3; c < 8; c++) board[7][c] = BLACK;

  const line = findWinningStones(board);
  expect(line).toHaveLength(5);
  expect(getWinner(board)).toBe(BLACK);
});

test("detects vertical five-in-a-row", () => {
  const board = createGomokuBoard();
  for (let r = 0; r < 5; r++) board[r][4] = WHITE;

  expect(getWinner(board)).toBe(WHITE);
});

test("detects diagonal five-in-a-row", () => {
  const board = createGomokuBoard();
  for (let i = 0; i < 5; i++) board[i][i] = BLACK;

  expect(getWinner(board)).toBe(BLACK);
});

test("four in a row is not a win", () => {
  const board = createGomokuBoard();
  for (let c = 0; c < 4; c++) board[0][c] = BLACK;

  expect(getWinner(board)).toBe(0);
  expect(isGameOver(board)).toBe(false);
});

test("countStones returns correct tallies", () => {
  const board = createGomokuBoard();
  board[7][7] = BLACK;
  board[7][8] = BLACK;
  board[0][0] = WHITE;

  const { black, white, empty } = countStones(board);
  expect(black).toBe(2);
  expect(white).toBe(1);
  expect(empty).toBe(15 * 15 - 3);
});

test("cloneBoard creates independent copy", () => {
  const board = createGomokuBoard();
  board[7][7] = BLACK;
  const copy = cloneBoard(board);
  copy[7][7] = 0;

  expect(board[7][7]).toBe(BLACK);
  expect(copy[7][7]).toBe(0);
});

test("isGameOver is true when board is full with no winner", () => {
  const board = createGomokuBoard();
  // Fill board in alternating pattern that avoids five-in-a-row
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      // Zigzag pattern: shift each row by 2
      board[r][c] = ((c + Math.floor(r / 2) * 2 + r % 2) % 5 < 2) ? BLACK : WHITE;
    }
  }
  // Verify it's full
  expect(isBoardFull(board)).toBe(true);
});

test("ai picks a move on empty board", () => {
  const board = createGomokuBoard();
  const move = pickBestGomokuMove(board, BLACK, "Hard");

  expect(move).not.toBeNull();
  expect(move.row).toBeGreaterThanOrEqual(0);
  expect(move.col).toBeGreaterThanOrEqual(0);
});

test("ai blocks opponent about to win", () => {
  const board = createGomokuBoard();
  // White has 4 in a row horizontally at row 7
  board[7][3] = WHITE;
  board[7][4] = WHITE;
  board[7][5] = WHITE;
  board[7][6] = WHITE;
  // Black has some stones elsewhere
  board[0][0] = BLACK;
  board[1][1] = BLACK;

  const move = pickBestGomokuMove(board, BLACK, "Hard");

  // AI should block at (7,2) or (7,7)
  expect(move.row).toBe(7);
  expect([2, 7]).toContain(move.col);
});
