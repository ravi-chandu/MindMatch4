import {
  BLACK,
  applyReversiMove,
  createReversiBoard,
  getValidMoves,
  pickBestReversiMove,
} from "../src/utils/reversiHelpers.js";

test("initial board gives black four legal moves", () => {
  const board = createReversiBoard();
  const moves = getValidMoves(board, BLACK);

  expect(moves).toHaveLength(4);
  expect(moves.map(({ row, col }) => `${row}-${col}`).sort()).toEqual([
    "2-3",
    "3-2",
    "4-5",
    "5-4",
  ]);
});

test("applying a move flips the trapped white disc", () => {
  const board = createReversiBoard();
  const move = getValidMoves(board, BLACK).find(({ row, col }) => row === 2 && col === 3);
  const nextBoard = applyReversiMove(board, move, BLACK);

  expect(nextBoard[2][3]).toBe(BLACK);
  expect(nextBoard[3][3]).toBe(BLACK);
});

test("ai prefers a corner when one is available", () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));

  board[0][1] = -1;
  board[0][2] = BLACK;
  board[1][0] = -1;
  board[2][0] = BLACK;
  board[1][1] = -1;
  board[2][2] = BLACK;

  const move = pickBestReversiMove(board, BLACK);

  expect(move.row).toBe(0);
  expect(move.col).toBe(0);
});
