import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGame,
  getGame,
  submitMove,
  playComputerMove,
  undoMove,
  resetGame,
  getScoreboard,
} from '../api/client.js';
import { resetStore } from './store.js';
import { MODE_SINGLE, MODE_MULTI } from '../constants.js';

/**
 * These tests exercise the REAL request handlers through fetch (intercepted by
 * the MSW node server), giving full coverage of the game rules without the
 * browser service worker.
 */

beforeEach(() => resetStore());

async function expectRejection(promise, status) {
  await expect(promise).rejects.toMatchObject({ status });
}

describe('POST /games', () => {
  it('creates a game with an empty board, X to move, in progress', async () => {
    const game = await createGame(MODE_MULTI);
    expect(game.id).toBeTruthy();
    expect(game.mode).toBe(MODE_MULTI);
    expect(game.board).toEqual(Array(9).fill(null));
    expect(game.currentPlayer).toBe('X');
    expect(game.status).toBe('in_progress');
    expect(game.moves).toEqual([]);
  });

  it('defaults to multiplayer when no mode is given', async () => {
    const game = await createGame();
    expect(game.mode).toBe(MODE_MULTI);
  });
});

describe('valid move', () => {
  it('places the mark and records the move', async () => {
    const { id } = await createGame(MODE_MULTI);
    const game = await submitMove(id, 4);
    expect(game.board[4]).toBe('X');
    expect(game.moves).toHaveLength(1);
    expect(game.moves[0]).toMatchObject({ player: 'X', index: 4, moveNumber: 1 });
  });
});

describe('invalid move', () => {
  it('rejects an out-of-range index', async () => {
    const { id } = await createGame(MODE_MULTI);
    await expectRejection(submitMove(id, 9), 400);
    await expectRejection(submitMove(id, -1), 400);
  });

  it('rejects a non-integer index', async () => {
    const { id } = await createGame(MODE_MULTI);
    await expectRejection(submitMove(id, 1.5), 400);
  });

  it('rejects an occupied cell and leaves state unchanged', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0); // X
    await expectRejection(submitMove(id, 0), 409);
    const game = await getGame(id);
    expect(game.board[0]).toBe('X');
    expect(game.moves).toHaveLength(1);
  });
});

describe('turn switching', () => {
  it('alternates X and O between valid moves', async () => {
    const { id } = await createGame(MODE_MULTI);
    expect((await submitMove(id, 0)).currentPlayer).toBe('O');
    expect((await submitMove(id, 1)).currentPlayer).toBe('X');
    expect((await submitMove(id, 2)).currentPlayer).toBe('O');
  });

  it('does not switch turns on an invalid move', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0); // X, now O
    await expectRejection(submitMove(id, 5.5), 400);
    const game = await getGame(id);
    expect(game.currentPlayer).toBe('O');
  });
});

describe('win detection through moves', () => {
  it('detects a row win and stops the game', async () => {
    const { id } = await createGame(MODE_MULTI);
    // X:0 O:3 X:1 O:4 X:2 -> X wins row 0-1-2
    await submitMove(id, 0);
    await submitMove(id, 3);
    await submitMove(id, 1);
    await submitMove(id, 4);
    const game = await submitMove(id, 2);
    expect(game.status).toBe('won');
    expect(game.winner).toBe('X');
    expect(game.winningLine).toEqual([0, 1, 2]);
  });

  it('detects a column win', async () => {
    const { id } = await createGame(MODE_MULTI);
    // O wins column 0-3-6
    await submitMove(id, 1); // X
    await submitMove(id, 0); // O
    await submitMove(id, 4); // X
    await submitMove(id, 3); // O
    await submitMove(id, 8); // X
    const game = await submitMove(id, 6); // O
    expect(game.status).toBe('won');
    expect(game.winner).toBe('O');
    expect(game.winningLine).toEqual([0, 3, 6]);
  });

  it('detects a diagonal win', async () => {
    const { id } = await createGame(MODE_MULTI);
    // X wins main diagonal 0-4-8
    await submitMove(id, 0); // X
    await submitMove(id, 1); // O
    await submitMove(id, 4); // X
    await submitMove(id, 2); // O
    const game = await submitMove(id, 8); // X
    expect(game.status).toBe('won');
    expect(game.winner).toBe('X');
    expect(game.winningLine).toEqual([0, 4, 8]);
  });

  it('detects a draw when the board fills without a winner', async () => {
    const { id } = await createGame(MODE_MULTI);
    // X O X / X O O / O X X  -> draw
    const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    let game;
    for (const m of moves) game = await submitMove(id, m);
    expect(game.status).toBe('tie');
    expect(game.winner).toBeNull();
    expect(game.board.every((c) => c !== null)).toBe(true);
  });
});

describe('move after game completion', () => {
  it('rejects any move once the game is won', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0);
    await submitMove(id, 3);
    await submitMove(id, 1);
    await submitMove(id, 4);
    await submitMove(id, 2); // X wins
    await expectRejection(submitMove(id, 5), 409);
  });
});

describe('reset game', () => {
  it('clears the board, history, and turn; keeps the scoreboard', async () => {
    const { id } = await createGame(MODE_MULTI);
    // Play a full X win to bump the scoreboard.
    await submitMove(id, 0);
    await submitMove(id, 3);
    await submitMove(id, 1);
    await submitMove(id, 4);
    await submitMove(id, 2);

    const before = await getScoreboard();
    expect(before.X).toBe(1);

    const game = await resetGame(id);
    expect(game.board).toEqual(Array(9).fill(null));
    expect(game.moves).toEqual([]);
    expect(game.currentPlayer).toBe('X');
    expect(game.status).toBe('in_progress');

    const after = await getScoreboard();
    expect(after.X).toBe(1); // reset does not touch the scoreboard
  });
});

describe('undo in two-player mode', () => {
  it('removes exactly one ply and restores the previous turn', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0); // X
    await submitMove(id, 1); // O
    const game = await undoMove(id);
    expect(game.board[1]).toBeNull();
    expect(game.board[0]).toBe('X');
    expect(game.moves).toHaveLength(1);
    expect(game.currentPlayer).toBe('O');
  });

  it('rejects undo when there is nothing to undo', async () => {
    const { id } = await createGame(MODE_MULTI);
    await expectRejection(undoMove(id), 409);
  });

  it('rolls back a scoreboard win when undoing a finished game', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0);
    await submitMove(id, 3);
    await submitMove(id, 1);
    await submitMove(id, 4);
    await submitMove(id, 2); // X wins -> scoreboard X = 1

    expect((await getScoreboard()).X).toBe(1);
    const game = await undoMove(id);
    expect(game.status).toBe('in_progress');
    expect((await getScoreboard()).X).toBe(0);
  });
});

describe('undo in computer mode', () => {
  it('undoes both the computer and human plies', async () => {
    const { id } = await createGame(MODE_SINGLE);
    await submitMove(id, 0); // X
    let game = await playComputerMove(id); // O
    expect(game.moves).toHaveLength(2);

    game = await undoMove(id);
    expect(game.moves).toHaveLength(0);
    expect(game.board.every((c) => c === null)).toBe(true);
    expect(game.currentPlayer).toBe('X');
  });
});

describe('scoreboard updates', () => {
  it('increments the winner tally once per completed game', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0);
    await submitMove(id, 3);
    await submitMove(id, 1);
    await submitMove(id, 4);
    await submitMove(id, 2); // X wins

    const scores = await getScoreboard();
    expect(scores.X).toBe(1);
    expect(scores.O).toBe(0);
    expect(scores.draws).toBe(0);
  });

  it('increments draws on a tie', async () => {
    const { id } = await createGame(MODE_MULTI);
    const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const m of moves) await submitMove(id, m);

    expect((await getScoreboard()).draws).toBe(1);
  });
});

describe('computer move endpoint guards', () => {
  it('rejects computer moves in two-player mode', async () => {
    const { id } = await createGame(MODE_MULTI);
    await submitMove(id, 0); // X -> it's O's turn but mode is multi
    await expectRejection(playComputerMove(id), 409);
  });

  it('rejects computer move when it is not the computer’s turn', async () => {
    const { id } = await createGame(MODE_SINGLE);
    // Fresh game: it's X's turn, not the computer's.
    await expectRejection(playComputerMove(id), 409);
  });
});
