import { calculateWinner } from './helpers.js';
import { MARK_X, MARK_O } from '../constants.js';

/** Score magnitude for a win, adjusted by depth so quicker wins rank higher. */
const WIN_SCORE = 10;

/** Map of each mark to its opponent. */
const OPPONENT = { [MARK_X]: MARK_O, [MARK_O]: MARK_X };

/**
 * Unbeatable Tic-Tac-Toe move chooser (minimax).
 *
 * @param {Array<string | null>} board - 9-cell board.
 * @param {string} aiPlayer - the mark the computer plays.
 * @returns {number} index of the best move, or -1 if the board is full.
 */
export function bestMove(board, aiPlayer) {
  const result = minimax(board.slice(), aiPlayer, aiPlayer, 0);
  return result.index;
}

/**
 * @param {Array<string | null>} board
 * @param {string} playerToMove
 * @param {string} aiPlayer
 * @param {number} depth
 * @returns {{ score: number, index: number }}
 */
function minimax(board, playerToMove, aiPlayer, depth) {
  const winner = calculateWinner(board);
  if (winner) {
    // Prefer faster wins / slower losses by folding depth into the score.
    return {
      score: winner[0] === aiPlayer ? WIN_SCORE - depth : depth - WIN_SCORE,
      index: -1,
    };
  }
  if (board.every((cell) => cell !== null)) {
    return { score: 0, index: -1 };
  }

  const available = board
    .map((cell, i) => (cell === null ? i : -1))
    .filter((i) => i !== -1);

  const isMaximizing = playerToMove === aiPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestIndex = available[0];

  for (const index of available) {
    board[index] = playerToMove;
    const { score } = minimax(board, OPPONENT[playerToMove], aiPlayer, depth + 1);
    board[index] = null;

    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return { score: bestScore, index: bestIndex };
}
