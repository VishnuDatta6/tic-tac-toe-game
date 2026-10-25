import { describe, it, expect } from 'vitest';
import { calculateWinner, isOccupied } from './helpers.js';

/**
 * Build a 9-cell board from a compact 3x3 string ("X", "O", or "." for empty).
 * Example: board3('X X', '.O.', '..X') -> row0 = X,null,X
 */
function board3(...rows) {
  return rows
    .join('')
    .replace(/\s/g, '')
    .split('')
    .map((c) => (c === '.' ? null : c));
}

describe('calculateWinner', () => {
  it('returns null for an empty board', () => {
    expect(calculateWinner(Array(9).fill(null))).toBeNull();
  });

  it('returns null when the game is still in progress', () => {
    const board = board3('X.O', '.X.', '..O');
    expect(calculateWinner(board)).toBeNull();
  });

  it('detects a row win', () => {
    const board = board3('XXX', 'OO.', '...');
    expect(calculateWinner(board)).toEqual(['X', [0, 1, 2]]);
  });

  it('detects a column win', () => {
    const board = board3('O.X', 'O.X', 'O..');
    expect(calculateWinner(board)).toEqual(['O', [0, 3, 6]]);
  });

  it('detects a main diagonal win', () => {
    const board = board3('XOO', '.X.', '..X');
    expect(calculateWinner(board)).toEqual(['X', [0, 4, 8]]);
  });

  it('detects an anti-diagonal win', () => {
    const board = board3('..O', '.O.', 'O.X');
    expect(calculateWinner(board)).toEqual(['O', [2, 4, 6]]);
  });

  it('detects a win on the last row', () => {
    const board = board3('X.O', 'X.O', 'XXX');
    expect(calculateWinner(board)).toEqual(['X', [6, 7, 8]]);
  });
});

describe('isOccupied', () => {
  it('is true for X and O', () => {
    expect(isOccupied('X')).toBe(true);
    expect(isOccupied('O')).toBe(true);
  });

  it('is false for null and empty', () => {
    expect(isOccupied(null)).toBe(false);
    expect(isOccupied('')).toBe(false);
  });
});
