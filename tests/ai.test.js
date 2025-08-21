import { computeLocalHints, reasonFor } from '../src/App.jsx';
import { aiMove } from '../ai/coach.js';

describe('reasonFor', () => {
  test('identifies winning move', () => {
    const board = [[1], [1], [1], [], [], [], []];
    expect(reasonFor(board, 1, 3)).toEqual({ col: 3, tag: 'win', note: 'Winning move' });
  });

  test('identifies block move', () => {
    const board = [[-1], [-1], [-1], [], [], [], []];
    expect(reasonFor(board, 1, 3)).toEqual({ col: 3, tag: 'block', note: 'Block opponent' });
  });
});

describe('computeLocalHints', () => {
  test('returns winning move', () => {
    const board = [[1], [1], [1], [], [], [], []];
    expect(computeLocalHints(board, 1)).toEqual({
      best: [3],
      note: 'Winning move',
      reasons: [{ col: 3, tag: 'win', note: 'Winning move' }],
    });
  });

  test('returns block move', () => {
    const board = [[-1], [-1], [-1], [], [], [], []];
    const hint = computeLocalHints(board, 1);
    expect(hint.best).toEqual([3]);
    expect(hint.note).toBe('Block opponent');
  });
});

describe('aiMove', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mm4_skill', JSON.stringify({ rating: 900, games: 0 }));
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
  });

  afterEach(() => {
    Math.random.mockRestore();
  });

  test('chooses winning move', () => {
    const board = [[-1], [-1], [-1], [], [], [], []];
    const move = aiMove(board, -1);
    expect(move).toBe(3);
  });

  test('blocks opponent win', () => {
    const board = [[1], [1], [1], [], [], [], []];
    const move = aiMove(board, -1);
    expect(move).toBe(3);
  });
});
