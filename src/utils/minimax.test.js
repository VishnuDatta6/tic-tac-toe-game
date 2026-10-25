import { describe, it, expect } from 'vitest';
import { bestMove } from './minimax.js';

/** Build a board the same way as the helpers tests. */
function board3(...rows) {
  return rows
    .join('')
    .replace(/\s/g, '')
    .split('')
    .map((c) => (c === '.' ? null : c));
}

describe('bestMove (computer move selection)', () => {
  it('takes an immediate winning move', () => {
    // O at 0 and 1; winning move is index 2.
    const board = board3('OO.', 'XX.', '...');
    expect(bestMove(board, 'O')).toBe(2);
  });

  it('blocks the opponent’s immediate win', () => {
    // X threatens 0-1-2; O must block at 2.
    const board = board3('XX.', 'O..', '...');
    expect(bestMove(board, 'O')).toBe(2);
  });

  it('prefers winning over blocking when both are available', () => {
    // O can win at 2, while X also threatens at 6. Winning takes priority.
    const board = board3('OO.', 'XX.', 'X..');
    expect(bestMove(board, 'O')).toBe(2);
  });

  it('returns a legal (empty) index on a fresh board', () => {
    const move = bestMove(Array(9).fill(null), 'O');
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThanOrEqual(8);
  });

  it('returns -1 when the board is full', () => {
    const board = board3('XOX', 'OXO', 'OXO');
    expect(bestMove(board, 'O')).toBe(-1);
  });

  it('never returns an occupied cell', () => {
    const board = board3('X.O', '.X.', 'O..');
    const move = bestMove(board, 'O');
    expect(board[move]).toBeNull();
  });
});
