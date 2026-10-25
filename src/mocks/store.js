import { STORAGE_KEY } from '../constants.js';

/**
 * In-memory "server" state for the mocked API, mirrored to sessionStorage
 * so a page reload within the same tab keeps the game session alive.
 *
 * This simulates a backend that stores games and a scoreboard. All mutations
 * happen here (inside the MSW handlers), never in the React components.
 */

/** @typedef {'single' | 'multi'} GameMode */

/**
 * @typedef {Object} Game
 * @property {string} id
 * @property {GameMode} mode
 * @property {Array<'X' | 'O' | null>} board
 * @property {'X' | 'O'} currentPlayer
 * @property {'in_progress' | 'won' | 'tie'} status
 * @property {'X' | 'O' | null} winner
 * @property {number[] | null} winningLine
 * @property {Array<{ moveNumber: number, player: 'X' | 'O', index: number }>} moves
 * @property {Array<{ board: Array<'X' | 'O' | null>, currentPlayer: 'X' | 'O' }>} history
 * @property {number} createdAt
 */

/**
 * @typedef {Object} Scoreboard
 * @property {number} X
 * @property {number} O
 * @property {number} draws
 */

/**
 * @typedef {Object} ServerState
 * @property {Record<string, Game>} games
 * @property {Scoreboard} scoreboard
 * @property {string | null} currentGameId
 */

/** @returns {ServerState} */
export function emptyState() {
  return {
    games: {},
    scoreboard: { X: 0, O: 0, draws: 0 },
    currentGameId: null,
  };
}

/** @returns {ServerState} */
function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    // Basic shape guard so a corrupted entry doesn't blow up the app.
    if (!parsed || typeof parsed !== 'object' || !parsed.games || !parsed.scoreboard) {
      return emptyState();
    }
    // Migrate older persisted shapes that lacked these fields.
    if (!('currentGameId' in parsed)) parsed.currentGameId = null;
    for (const game of Object.values(parsed.games)) {
      if (!Array.isArray(game.moves)) game.moves = [];
    }
    return parsed;
  } catch {
    return emptyState();
  }
}

/** @type {ServerState} */
let state = loadState();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable (e.g. private mode quota); keep going
    // with in-memory state only.
  }
}

/* ----------------------------- Getters ------------------------------ */

/** @returns {Record<string, Game>} */
export function getGames() {
  return state.games;
}

/** @param {string} id @returns {Game | undefined} */
export function getGame(id) {
  return state.games[id];
}

/** @returns {Scoreboard} */
export function getScoreboard() {
  return { ...state.scoreboard };
}

/** @returns {string | null} */
export function getCurrentGameId() {
  return state.currentGameId;
}

/* ----------------------------- Mutators ----------------------------- */

/**
 * Persist a game back into the store.
 * @param {Game} game
 * @returns {Game}
 */
export function saveGame(game) {
  state.games[game.id] = game;
  persist();
  return game;
}

/**
 * Mark which game is the active session game (survives reload).
 * @param {string | null} id
 */
export function setCurrentGameId(id) {
  state.currentGameId = id;
  persist();
}

/**
 * Apply a scoreboard change and persist.
 * @param {{ X?: number, O?: number, draws?: number }} delta
 * @returns {Scoreboard}
 */
export function bumpScoreboard(delta) {
  state.scoreboard.X += delta.X ?? 0;
  state.scoreboard.O += delta.O ?? 0;
  state.scoreboard.draws += delta.draws ?? 0;
  persist();
  return getScoreboard();
}

/** @returns {Scoreboard} */
export function resetScoreboard() {
  state.scoreboard = { X: 0, O: 0, draws: 0 };
  persist();
  return getScoreboard();
}

/**
 * Wipe everything: games, scoreboard, and the active game id.
 * Used by the "New Session" control which returns the user to mode select.
 * @returns {ServerState}
 */
export function resetSession() {
  state = emptyState();
  persist();
  return { ...state };
}

/**
 * Reset the in-memory + persisted store to a clean slate.
 * Intended for test isolation so state doesn't leak between test cases.
 */
export function resetStore() {
  state = emptyState();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

