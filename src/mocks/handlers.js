import { http, HttpResponse, delay } from 'msw';
import {
  getGame,
  getScoreboard,
  getCurrentGameId,
  saveGame,
  setCurrentGameId,
  bumpScoreboard,
  resetScoreboard,
  resetSession,
} from './store.js';
import { calculateWinner } from '../utils/helpers.js';
import { bestMove } from '../utils/minimax.js';
import {
  MOCK_LATENCY_MS,
  HUMAN_MARK,
  AI_MARK,
  MARK_X,
  DEFAULT_MODE,
  MODE_SINGLE,
  MODE_MULTI,
  STATUS_WON,
  STATUS_TIE,
  STATUS_IN_PROGRESS,
  BOARD_SIZE,
  LAST_CELL_INDEX,
} from '../constants.js';

function artificialDelay() {
  const { min, max } = MOCK_LATENCY_MS;
  if (max <= 0) return Promise.resolve();
  return delay(min + Math.random() * (max - min));
}

/**
 * Mutable latency override. Tests call `setMockLatency(0)` to disable the
 * artificial delay so suites run fast and deterministically.
 * @param {number} ms
 */
let latencyOverride = null;
export function setMockLatency(ms) {
  latencyOverride = ms;
}

function mockDelay() {
  if (latencyOverride !== null) {
    return latencyOverride > 0
      ? delay(latencyOverride)
      : Promise.resolve();
  }
  return artificialDelay();
}

/**
 * Compute the derived fields (status/winner/winningLine) for a board.
 * @param {Array<string | null>} board
 */
function evaluateBoard(board) {
  const winner = calculateWinner(board);
  if (winner) {
    return { status: STATUS_WON, winner: winner[0], winningLine: winner[1] };
  }
  if (board.every((cell) => cell !== null)) {
    return { status: STATUS_TIE, winner: null, winningLine: null };
  }
  return { status: STATUS_IN_PROGRESS, winner: null, winningLine: null };
}

/**
 * Create a fresh game object.
 * @param {'single' | 'multi'} mode
 */
function createGame(mode) {
  const board = Array(BOARD_SIZE).fill(null);
  const { status, winner, winningLine } = evaluateBoard(board);
  return {
    id: crypto.randomUUID(),
    mode,
    board,
    currentPlayer: HUMAN_MARK,
    status,
    winner,
    winningLine,
    moves: [],
    history: [],
    createdAt: Date.now(),
  };
}

/**
 * Update the scoreboard when a game transitions to a terminal state.
 * @param {import('./store.js').Game} game
 */
function applyScoreboardResult(game) {
  if (game.status === STATUS_WON) {
    bumpScoreboard(game.winner === MARK_X ? { X: 1 } : { O: 1 });
  } else if (game.status === STATUS_TIE) {
    bumpScoreboard({ draws: 1 });
  }
}

export const handlers = [
  // POST /api/games — create a new game session
  http.post('/api/games', async ({ request }) => {
    await mockDelay();
    let mode = DEFAULT_MODE;
    try {
      const body = await request.json();
      if (body?.mode === MODE_SINGLE || body?.mode === MODE_MULTI) {
        mode = body.mode;
      }
    } catch {
      // No body → default to multiplayer.
    }
    const game = createGame(mode);
    saveGame(game);
    setCurrentGameId(game.id);
    return HttpResponse.json(game, { status: 201 });
  }),

  // GET /api/games/:id — get current game state
  http.get('/api/games/:id', async ({ params }) => {
    await mockDelay();
    const game = getGame(params.id);
    if (!game) {
      return HttpResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return HttpResponse.json(game);
  }),

  // POST /api/games/:id/moves — submit a player move
  http.post('/api/games/:id/moves', async ({ params, request }) => {
    await mockDelay();
    const game = getGame(params.id);
    if (!game) {
      return HttpResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (game.status !== STATUS_IN_PROGRESS) {
      return HttpResponse.json(
        { error: 'Game is already over' },
        { status: 409 }
      );
    }

    let index;
    try {
      ({ index } = await request.json());
    } catch {
      return HttpResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    if (!Number.isInteger(index) || index < 0 || index > LAST_CELL_INDEX) {
      return HttpResponse.json({ error: 'Invalid move index' }, { status: 400 });
    }
    if (game.board[index] !== null) {
      return HttpResponse.json({ error: 'Cell already taken' }, { status: 409 });
    }

    // Snapshot current state for undo before mutating.
    game.history.push({
      board: game.board.slice(),
      currentPlayer: game.currentPlayer,
    });

    // Apply the human move.
    game.board[index] = game.currentPlayer;
    game.moves.push({
      moveNumber: game.moves.length + 1,
      player: game.currentPlayer,
      index,
    });
    const state = evaluateBoard(game.board);
    game.status = state.status;
    game.winner = state.winner;
    game.winningLine = state.winningLine;

    // Advance turn if still in progress. In single-player, this hands the turn
    // to the computer, but the AI move is applied by a separate
    // /computer-move request so the UI can visibly show the computer's turn.
    if (game.status === STATUS_IN_PROGRESS) {
      game.currentPlayer = game.currentPlayer === MARK_X ? 'O' : MARK_X;
    }

    // Record the scoreboard once, on transition to a terminal state.
    applyScoreboardResult(game);

    saveGame(game);
    return HttpResponse.json(game);
  }),

  // POST /api/games/:id/computer-move — let the computer play its turn
  http.post('/api/games/:id/computer-move', async ({ params }) => {
    await mockDelay();
    const game = getGame(params.id);
    if (!game) {
      return HttpResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (game.mode !== MODE_SINGLE) {
      return HttpResponse.json(
        { error: 'Computer move is only valid in single-player mode' },
        { status: 409 }
      );
    }
    if (game.status !== STATUS_IN_PROGRESS || game.currentPlayer !== AI_MARK) {
      return HttpResponse.json(
        { error: 'Not the computer\u2019s turn' },
        { status: 409 }
      );
    }

    const aiIndex = bestMove(game.board, AI_MARK);
    if (aiIndex === -1) {
      return HttpResponse.json({ error: 'No moves available' }, { status: 409 });
    }

    // Snapshot before the AI move so history stays in sync with moves
    // (one snapshot per ply), letting undo walk back one ply at a time.
    game.history.push({
      board: game.board.slice(),
      currentPlayer: game.currentPlayer,
    });
    game.board[aiIndex] = AI_MARK;
    game.moves.push({
      moveNumber: game.moves.length + 1,
      player: AI_MARK,
      index: aiIndex,
    });
    const state = evaluateBoard(game.board);
    game.status = state.status;
    game.winner = state.winner;
    game.winningLine = state.winningLine;

    if (game.status === STATUS_IN_PROGRESS) {
      game.currentPlayer = HUMAN_MARK;
    }

    applyScoreboardResult(game);

    saveGame(game);
    return HttpResponse.json(game);
  }),

  // POST /api/games/:id/undo — undo last move
  http.post('/api/games/:id/undo', async ({ params }) => {
    await mockDelay();
    const game = getGame(params.id);
    if (!game) {
      return HttpResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (game.history.length === 0) {
      return HttpResponse.json({ error: 'Nothing to undo' }, { status: 409 });
    }

    // If the game had ended, roll back its scoreboard contribution first.
    if (game.status === STATUS_WON) {
      bumpScoreboard(game.winner === MARK_X ? { X: -1 } : { O: -1 });
    } else if (game.status === STATUS_TIE) {
      bumpScoreboard({ draws: -1 });
    }

    // In single-player, undo BOTH the computer move and the human move so the
    // human gets their turn back. Otherwise undo a single ply.
    const pliesToUndo =
      game.mode === MODE_SINGLE ? Math.min(2, game.history.length) : 1;

    let snapshot;
    for (let i = 0; i < pliesToUndo; i += 1) {
      snapshot = game.history.pop();
      game.moves.pop();
    }

    game.board = snapshot.board;
    game.currentPlayer = snapshot.currentPlayer;
    const state = evaluateBoard(game.board);
    game.status = state.status;
    game.winner = state.winner;
    game.winningLine = state.winningLine;

    saveGame(game);
    return HttpResponse.json(game);
  }),

  // POST /api/games/:id/reset — reset the current game
  http.post('/api/games/:id/reset', async ({ params }) => {
    await mockDelay();
    const game = getGame(params.id);
    if (!game) {
      return HttpResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const board = Array(BOARD_SIZE).fill(null);
    const state = evaluateBoard(board);
    game.board = board;
    game.currentPlayer = HUMAN_MARK;
    game.status = state.status;
    game.winner = state.winner;
    game.winningLine = state.winningLine;
    game.moves = [];
    game.history = [];

    saveGame(game);
    return HttpResponse.json(game);
  }),

  // GET /api/scoreboard — get scoreboard
  http.get('/api/scoreboard', async () => {
    await mockDelay();
    return HttpResponse.json(getScoreboard());
  }),

  // POST /api/scoreboard/reset — reset scoreboard
  http.post('/api/scoreboard/reset', async () => {
    await mockDelay();
    return HttpResponse.json(resetScoreboard());
  }),

  // GET /api/session — current session info (used to restore on reload)
  http.get('/api/session', async () => {
    return HttpResponse.json({ currentGameId: getCurrentGameId() });
  }),

  // POST /api/session/reset — wipe games + scoreboard + active game
  http.post('/api/session/reset', async () => {
    await mockDelay();
    resetSession();
    return HttpResponse.json({ ok: true });
  }),
];
