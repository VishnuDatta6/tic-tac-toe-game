/**
 * Thin fetch wrappers for the mocked game API.
 * Components import these instead of calling fetch() directly, so swapping in
 * a real backend later means changing only this file.
 */

import { API_BASE, DEFAULT_MODE } from '../constants.js';
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Some responses may have no body; ignore parse errors.
  }

  if (!res.ok) {
    const message = data?.error ?? `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

/** @param {'single' | 'multi'} [mode] */
export function createGame(mode = DEFAULT_MODE) {
  return request('/games', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

/** @param {string} id */
export function getGame(id) {
  return request(`/games/${id}`);
}

/** @param {string} id @param {number} index */
export function submitMove(id, index) {
  return request(`/games/${id}/moves`, {
    method: 'POST',
    body: JSON.stringify({ index }),
  });
}

/** Let the computer play its turn (single-player only). @param {string} id */
export function playComputerMove(id) {
  return request(`/games/${id}/computer-move`, { method: 'POST' });
}

/** @param {string} id */
export function undoMove(id) {
  return request(`/games/${id}/undo`, { method: 'POST' });
}

/** @param {string} id */
export function resetGame(id) {
  return request(`/games/${id}/reset`, { method: 'POST' });
}

export function getScoreboard() {
  return request('/scoreboard');
}

export function resetScoreboard() {
  return request('/scoreboard/reset', { method: 'POST' });
}

/** Returns `{ currentGameId: string | null }` for restoring on reload. */
export function getSession() {
  return request('/session');
}

/** Wipe games + scoreboard + active game (return to mode select). */
export function resetSession() {
  return request('/session/reset', { method: 'POST' });
}



