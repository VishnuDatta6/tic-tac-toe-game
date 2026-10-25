# Tic-Tac-Toe

A polished Tic-Tac-Toe game built with React and Vite, featuring a human-vs-human
(two-player) mode and an unbeatable human-vs-computer mode. The "backend" is
fully mocked with Mock Service Worker (MSW), so the app runs as a standalone
frontend with a realistic, latency-aware API — no server required.

---

## 1. Project Overview

This is a client-side Tic-Tac-Toe game that models a real client/server
architecture on the frontend:

- **UI layer** (`components/`) renders the board, controls, scoreboard, move
  history, and modal dialogs.
- **State layer** (`context/GameSessionContext.jsx`) owns all server-derived
  state (active game, scoreboard, session) and the actions that mutate it.
- **API layer** (`api/client.js`) is a thin `fetch` wrapper. Components never
  call `fetch` directly.
- **Mock backend** (`mocks/`) simulates a REST API with MSW. Handlers mutate an
  in-memory store that mirrors `sessionStorage`, so reloads within the same tab
  keep the active game.

Because the API is mocked at the network boundary, swapping in a real backend
later requires changing only `api/client.js` and disabling the mock — the
components and game rules stay untouched.

The computer opponent uses the **minimax algorithm**, so it plays optimally and
cannot be beaten (a perfect game ends in a draw).

---

## 2. Tech Stack

| Concern | Choice |
| --- | --- |
| UI library | React 19 |
| Build tool / dev server | Vite 8 |
| Language | JavaScript (JSX) |
| API mocking | MSW 3 (Service Worker in browser, Node server in tests) |
| Testing | Vitest + Testing Library (React, user-event, jest-dom) + jsdom |
| Styling | Plain CSS with CSS custom properties (design tokens) |
| Persistence | `sessionStorage` (via the mock store) |

---

## 3. Features Implemented

**Gameplay**
- Two game modes: **Single Player** (vs. an unbeatable AI) and **Two Players**.
- Full Tic-Tac-Toe rules: turn switching, row/column/diagonal win detection,
  and draw detection.
- Winning line highlighted on the board.
- **Undo last move** — undoes one ply in two-player mode; in single-player it
  undoes both the computer's and human's last moves so the human gets their turn
  back.
- **Reset game** — clears the current board without leaving the mode.
- Winner/Draw modal with a "New Game" action.

**Session & scoreboard**
- Session scoreboard tracking wins for X, wins for O, and draws.
- Scoreboard resets independently of the active game.
- **New Session** wipes games + scoreboard and returns to mode select.
- Active game is restored on page reload (survives refresh in the same tab).
- The currently selected game mode is displayed at the right of the scoreboard
  bar (hidden on the mode-select screen).

**UX / engineering**
- Loading states for the initial restore and per-action pending state.
- "Computer is thinking…" pause so the AI turn is visible and understandable.
- Centralized design tokens (colors), constants, and state management.
- **Paper / notebook visual theme**: a warm off-white background with a
  pure-CSS ruled grid, grain, and vignette (no image assets); ink-colored X/O
  marks, highlighter-style status badge and winning-line highlight.
- Responsive layout for small screens.
- Comprehensive automated test suite (unit, integration/API, context, UI).

---

## 5. How to Run the Frontend Locally

**Prerequisites:** Node.js `^22.12.0` or `>=24` (required by Vite 8 / Vitest 5 /
MSW 3) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (mock API starts automatically in dev)
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`). The MSW
service worker is registered automatically in development, so the game is fully
functional with no backend.

**Build and preview a production bundle:**

```bash
npm run build      # outputs to dist/
npm run preview    # serves the production build locally
```

> The mock API is enabled automatically in dev. For a preview/production build
> you can force it on or off with the `VITE_ENABLE_MOCK` environment variable
> (`true` to force on, `false` to force off), e.g. `VITE_ENABLE_MOCK=true npm run build`.

---

## 6. API Endpoint Summary

All endpoints are served under `/api` and implemented by the MSW mock handlers
in `src/mocks/handlers.js`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/games` | Create a new game. Body: `{ "mode": "single" \| "multi" }` (defaults to `multi`). Returns `201` with the game. |
| `GET` | `/api/games/:id` | Fetch the current state of a game. `404` if not found. |
| `POST` | `/api/games/:id/moves` | Submit a human move. Body: `{ "index": 0-8 }`. Validates range, occupancy, and game status. |
| `POST` | `/api/games/:id/computer-move` | Let the AI play. Only valid in single-player mode and when it's the computer's turn. |
| `POST` | `/api/games/:id/undo` | Undo the last move(s). One ply in two-player; two plies (human + computer) in single-player. Rolls back scoreboard contribution if the game had ended. |
| `POST` | `/api/games/:id/reset` | Reset the current board and history; keeps the scoreboard. |
| `GET` | `/api/scoreboard` | Get `{ X, O, draws }`. |
| `POST` | `/api/scoreboard/reset` | Reset the scoreboard tallies to zero. |
| `GET` | `/api/session` | Get `{ currentGameId }` — used to restore the active game on reload. |
| `POST` | `/api/session/reset` | Wipe games + scoreboard + active game (returns to mode select). |

**Game object shape:**

```jsonc
{
  "id": "uuid",
  "mode": "single" | "multi",
  "board": ["X", null, "O", ...],      // 9 cells
  "currentPlayer": "X" | "O",
  "status": "in_progress" | "won" | "tie",
  "winner": "X" | "O" | null,
  "winningLine": [0, 1, 2] | null,
  "moves": [{ "moveNumber": 1, "player": "X", "index": 4 }],
  "history": [{ "board": [...], "currentPlayer": "X" }],
  "createdAt": 1700000000000
}
```

**Error responses** use `{ "error": "message" }` with `400` (bad input), `404`
(game not found), or `409` (illegal action such as a taken cell or a move after
game over).

---

## 7. How to Run Tests

Tests use **Vitest** with **Testing Library** and **MSW's Node server**
(`setupServer`), which reuses the *same* `handlers.js` as the browser service
worker. This means tests exercise the real API contract without needing the
service worker.

```bash
npm test              # watch mode (interactive)
npm run test:run      # single run (CI-friendly)
npm run test:coverage # single run with coverage report
```

**Test suites**

| File | Scope |
| --- | --- |
| `src/utils/helpers.test.js` | Win detection (rows, columns, diagonals) and helpers |
| `src/utils/minimax.test.js` | Computer move selection (takes wins, blocks losses, legal moves) |
| `src/mocks/handlers.test.js` | API/game rules: valid & invalid moves, turn switching, wins, draw, reset, undo (both modes), scoreboard, move-after-completion |
| `src/context/GameSessionContext.test.jsx` | Provider lifecycle, actions, error surfacing, scoreboard refresh |
| `src/App.test.jsx` | Full UI flows through the components and context |

Test infrastructure lives in `src/test/` (`setup.js` wires MSW lifecycle and
resets the store between tests; `server.js` creates the Node server). Artificial
API latency is disabled in tests via `setMockLatency(0)` for speed and
determinism.

---

## 8. AI Tools and Prompt Summary

This project was developed with the assistance of an AI coding agent. The work
was driven by natural-language prompts and iterated through review. The initial
scaffolding — the base React/Vite setup, the core game logic, the Context API for
state, and the use of a service worker (MSW) to mock the backend — was specified
via prompts, and later iterations refined it. Representative tasks and prompts
included:

- **Initial setup & scaffolding**
  - *"Set up a React app with Vite and build the initial Tic-Tac-Toe game logic."*
  - *"Introduce a Context API to manage state, and mock the backend with a
    service worker (MSW)."*
- **Code refactor / cleanup**
  - *"Centralize magic strings and numbers (marks, statuses, modes, board size,
    win lines, latency) into a constants module."*
  - *"Extract all colors into CSS custom properties and split the large `index.css`
    into focused files."*
- **Feature work**
  - *"Show the selected game mode at the far right of the scoreboard bar, and hide
    it on the mode-select screen."*
- **UI / styling**
  - *"Redesign the visuals with a paper/notebook theme — the background isn't
    looking good — including styled X and O marks on the squares."*
- **Architecture**
  - *"Review the centralized state using the Context API, scoped to server-derived
    state and actions, keeping UI-only state local."*
- **Testing**
  - *"Write tests covering valid/invalid moves, turn switching, row/column/diagonal
    wins, draw, reset, undo in both modes, scoreboard updates, computer move
    selection, and moves after game completion — using MSW's Node server since the
    backend is mocked by a service worker."*

The AI produced initial implementations; all changes were reviewed for
correctness, consistency, and behavior preservation, and validated by the build
and the automated test suite.

---

## 9. Design Decisions

- **Mock at the network boundary (MSW), not inside components.** Records the
  "server owns the rules" model. The client is a thin consumer, so the same code
  works against a real backend later by changing `api/client.js`.
- **Server-derived state centralized in Context; UI state local.** A single
  `GameSessionContext` owns the game, scoreboard, and session, eliminating
  prop-drilling and imperative refresh callbacks. Ephemeral UI state (the
  "computer is thinking" pause) stays in `Game` so data and animation concerns
  don't couple.
- **Rules enforced server-side (in handlers).** Move validation, win detection,
  scoreboard increments, and undo/scoreboard rollback all happen in the mock
  backend, mirroring how a real API would behave.
- **Constants and design tokens are centralized.** Statuses/marks/modes are
  single-sourced in `constants.js`; colors are CSS variables in `styles/colors.css`,
  making theming and renaming safe.
- **Paper/notebook theme built with pure CSS.** The background is composed from
  layered CSS gradients (ruled grid, grain, vignette) rather than an image asset,
  so it stays crisp and lightweight. Marks are ink-colored via a `data-mark`
  attribute on each square, keeping the X/O styling declarative and token-driven.
- **Undo semantics differ by mode, intentionally.** In single-player, undo
  removes both the AI and human plies so the human regains their turn; in
  two-player it removes a single ply.
- **Unbeatable AI via minimax.** Simple, deterministic, and correct for 3×3; depth
  is folded into the score so faster wins and slower losses are preferred.
- **Session persistence via `sessionStorage`.** Keeps the active game across a
  reload without a real database, scoped to the tab.
- **Tests target levels that matter:** pure logic (unit), API rules
  (integration), and end-to-end UI behavior, avoiding brittle duplication.

---

## 10. Clarifications and Assumptions

- **The "backend" is a mock.** There is no real server; data lives in
  `sessionStorage` for the tab and is lost when the tab/session ends.
- **The human is always X and always moves first**; the computer is always O.
  Only one computer difficulty exists (unbeatable).
- **Mode is fixed for the lifetime of a game.** Changing mode is done by starting
  a new game/session, not mid-game.
- **The scoreboard is session-scoped**, not global or persisted across tabs. It
  resets via "Reset Scoreboard" or "New Session."
- **Reload restores the active game** only within the same browser tab
  (`sessionStorage` does not persist across tabs or restarts).
- **Single-player computer turn** is applied via a separate request after a short
  visual pause, rather than atomically inside the human-move request, so the UI
  can display the computer's turn.
- **`crypto.randomUUID()`** is used for game IDs and assumes a modern browser.

---

## 11. Known Limitations

- **No real backend or multiplayer over network.** Two-player mode is
  hot-seat (same device) only.
- **State is per-tab and non-durable.** Clearing the tab, opening a new tab, or
  clearing `sessionStorage` loses games and scores.
- **No difficulty levels.** The AI is always optimal (perfect play = draw).
- **No user accounts, saved history, or leaderboards** beyond the session
  scoreboard.
- **The computer-move step is not atomic** with the human move (by design), so a
  hard reload timed exactly between them could leave an unusual state; the
  reload-recovery path re-syncs from the stored game, however.
- **Minimax is not memoized/depth-limited** — fine for 3×3, but not designed to
  scale to larger boards.
- **Accessibility and styling are functional but modest** (e.g., limited explicit
  ARIA beyond the modal; CSS did not undergo a formal a11y audit).

---

## 12. Future Improvements

- **Real backend** (e.g., Node/Express or serverless) behind the same API
  contract, replacing MSW for production.
- **Online multiplayer** with matchmaking and real-time sync (WebSockets).
- **Multiple difficulty levels** (easy/medium/hard) and engine optimizations
  (alpha-beta pruning, memoization).
- **Persistent stats and leaderboards** across sessions and users.
- **Configurable marks/themes** (e.g., X starts, choose symbol) and richer
  visual design.
- **Stronger accessibility**: full keyboard navigation, focus management,
  ARIA live regions for the status, and an a11y audit.
- **E2E tests** (Playwright) against a real browser build, complementing the
  existing Vitest suite.
- **Larger board support** (e.g., 4×4) requiring k-in-a-row win logic and a more
  scalable AI.
- **CI pipeline** to run lint, tests, and coverage on every push/PR.
