import { WINNING_LINES, MARK_X, MARK_O } from '../constants.js';

/**
 * Determine the winning player and the line of squares that produced the win.
 *
 * @param {Array<string | null>} squares - The 9-cell board state.
 * @returns {[string, number[]] | null} `[winner, [a, b, c]]` or `null` if there
 *   is no winner yet.
 */
export function calculateWinner(squares) {
  for (let i = 0; i < WINNING_LINES.length; i++) {
    const [a, b, c] = WINNING_LINES[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return [squares[a], [a, b, c]];
    }
  }
  return null;
}

/**
 * Predicate: is this cell occupied by a player mark?
 *
 * @param {string | null} value
 * @returns {boolean}
 */
export function isOccupied(value) {
  return value === MARK_X || value === MARK_O;
}

