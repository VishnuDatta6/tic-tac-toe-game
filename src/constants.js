/**
 * Centralized constants shared across the app, mocks, and utilities.
 */

/* ------------------------------ Game marks ------------------------------ */

export const MARK_X = 'X';
export const MARK_O = 'O';

/** Marks the human player controls (always X, always moves first). */
export const HUMAN_MARK = MARK_X;
/** Marks the computer controls in single-player mode. */
export const AI_MARK = MARK_O;

/* ------------------------------ Game modes ------------------------------ */

export const MODE_SINGLE = 'single';
export const MODE_MULTI = 'multi';
export const DEFAULT_MODE = MODE_MULTI;

/** Human-readable labels for each game mode. */
export const MODE_LABELS = {
  [MODE_SINGLE]: 'Single Player',
  [MODE_MULTI]: 'Two Players',
};

/* ----------------------------- Game status ----------------------------- */

export const STATUS_IN_PROGRESS = 'in_progress';
export const STATUS_WON = 'won';
export const STATUS_TIE = 'tie';

/* ------------------------------- Board --------------------------------- */

export const BOARD_SIZE = 9;
export const BOARD_COLUMNS = 3;
export const LAST_CELL_INDEX = BOARD_SIZE - 1;

/** All winning lines (rows, columns, diagonals) as board indices. */
export const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/* ------------------------------ API layer ------------------------------ */

export const API_BASE = '/api';

/* --------------------------- Mock backend ------------------------------ */

/** sessionStorage key for the mocked "server" state. */
export const STORAGE_KEY = 'ttt:state:v2';

/** Artificial latency range (ms) used by mock handlers to show loading. */
export const MOCK_LATENCY_MS = { min: 200, max: 400 };

/* ------------------------------- Client -------------------------------- */

/** How long to pause on the computer's turn so the player can see it. */
export const COMPUTER_TURN_DELAY_MS = 700;
