/* eslint-env jest */
import { winner, bestMoveTimeboxed, findWinLine } from '../ai/engine.js';

describe('winner', () => {
  test('detects horizontal win for player 1', () => {
    const board = [[1], [1], [1], [1], [], [], []];
    expect(winner(board)).toBe(1);
  });
});

describe('findWinLine', () => {
  test('identifies vertical win line for player -1', () => {
    const board = [[-1, -1, -1, -1], [], [], [], [], [], []];
    const line = findWinLine(board);
    expect(line).toEqual([
      { r: 2, c: 0 },
      { r: 3, c: 0 },
      { r: 4, c: 0 },
      { r: 5, c: 0 },
    ]);
  });
});

describe('bestMoveTimeboxed', () => {
  test('chooses winning move within time limit', () => {
    const board = [[1], [1], [1], [], [], [], []];
    const result = bestMoveTimeboxed(board, 1, 100);
    expect(result.best).toBe(3);
  });
});
