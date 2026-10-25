import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { GameSessionProvider, useGameSession } from './GameSessionContext.jsx';
import { server } from '../test/server.js';
import { MODE_MULTI, MODE_SINGLE } from '../constants.js';

/**
 * Probe component that exposes the context value through the DOM so tests can
 * drive and assert on provider behaviour directly.
 */
function Probe() {
  const s = useGameSession();
  return (
    <div>
      <span data-testid="status">{s.status}</span>
      <span data-testid="mode">{s.mode ?? 'none'}</span>
      <span data-testid="error">{s.error ?? ''}</span>
      <span data-testid="score">
        {s.scoreboard ? JSON.stringify(s.scoreboard) : 'none'}
      </span>
      <span data-testid="moves">{s.game ? s.game.moves.length : -1}</span>
      <button onClick={() => s.startGame(MODE_MULTI)}>start-multi</button>
      <button onClick={() => s.startGame(MODE_SINGLE)}>start-single</button>
      <button onClick={() => s.submitHumanMove(0).catch(() => {})}>move-0</button>
      <button onClick={() => s.submitHumanMove(1).catch(() => {})}>move-1</button>
      <button onClick={() => s.submitHumanMove(3).catch(() => {})}>move-3</button>
      <button onClick={() => s.submitHumanMove(4).catch(() => {})}>move-4</button>
      <button onClick={() => s.submitHumanMove(2).catch(() => {})}>move-2</button>
      <button onClick={() => s.undo().catch(() => {})}>undo</button>
      <button onClick={() => s.resetGame().catch(() => {})}>reset-game</button>
      <button onClick={() => s.newSession()}>new-session</button>
      <button onClick={() => s.resetScoreboard()}>reset-score</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <GameSessionProvider>
      <Probe />
    </GameSessionProvider>
  );
}

/** Wait until the provider finishes restoring (status leaves 'restoring'). */
async function settled() {
  await waitFor(() => {
    expect(screen.getByTestId('status').textContent).not.toBe('restoring');
  });
}

describe('GameSessionContext: lifecycle', () => {
  it('starts idle with a loaded scoreboard when there is no session', async () => {
    renderProbe();
    await settled();
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('score').textContent).toBe(
      JSON.stringify({ X: 0, O: 0, draws: 0 })
    );
  });
});

describe('GameSessionContext: startGame', () => {
  it('creates a game and becomes ready', async () => {
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('start-multi'));
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });
    expect(screen.getByTestId('mode').textContent).toBe(MODE_MULTI);
    expect(screen.getByTestId('moves').textContent).toBe('0');
  });
});

describe('GameSessionContext: submitHumanMove', () => {
  it('adds a move and updates the game', async () => {
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('start-multi'));
    await waitFor(() =>
      expect(screen.getByTestId('moves').textContent).toBe('0')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('move-0'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('moves').textContent).toBe('1')
    );
  });

  it('surfaces an error when the move is rejected', async () => {
    server.use(
      http.post('/api/games/:id/moves', () =>
        HttpResponse.json({ error: 'Cell already taken' }, { status: 409 })
      )
    );
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('start-multi'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('ready')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('move-0'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Cell already taken')
    );
  });
});

describe('GameSessionContext: scoreboard refresh on game end', () => {
  it('refreshes the scoreboard after a winning move', async () => {
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('start-multi'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('ready')
    );
    expect(screen.getByTestId('score').textContent).toBe(
      JSON.stringify({ X: 0, O: 0, draws: 0 })
    );

    // X wins row 0-1-2: X:0 O:3 X:1 O:4 X:2
    for (const id of ['move-0', 'move-3', 'move-1', 'move-4', 'move-2']) {
      await act(async () => {
        await userEvent.click(screen.getByText(id));
      });
    }

    await waitFor(() =>
      expect(screen.getByTestId('score').textContent).toBe(
        JSON.stringify({ X: 1, O: 0, draws: 0 })
      )
    );
  });
});

describe('GameSessionContext: resetGame and newSession', () => {
  it('resetGame clears the board via the API', async () => {
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('start-multi'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('ready')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('move-0'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('moves').textContent).toBe('1')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('reset-game'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('moves').textContent).toBe('0')
    );
  });

  it('newSession clears the game and returns to idle', async () => {
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('start-multi'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('ready')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('new-session'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('idle')
    );
    expect(screen.getByTestId('mode').textContent).toBe('none');
  });
});
