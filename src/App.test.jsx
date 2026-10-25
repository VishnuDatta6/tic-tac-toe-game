import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameSessionProvider } from './context/GameSessionContext.jsx';
import App from './components/App.jsx';

/** Render the full app wrapped in the session provider. */
function renderApp() {
  return render(
    <GameSessionProvider>
      <App />
    </GameSessionProvider>
  );
}

/**
 * Click the square at the given board index (0-8).
 * The board renders one button per cell with class "square".
 */
async function clickSquare(container, index) {
  const squares = container.querySelectorAll('.square');
  await userEvent.click(squares[index]);
}

/** Start a game of the given mode from the mode-select screen. */
async function startGame(container, modeLabel) {
  // Wait for the mode-select buttons to appear (after restore completes).
  const button = await screen.findByRole('button', { name: modeLabel });
  await userEvent.click(button);
  // Wait until a board is rendered.
  await waitFor(() => {
    expect(container.querySelectorAll('.square').length).toBe(9);
  });
}

describe('mode select', () => {
  it('shows the two game mode options and no mode badge', async () => {
    const { container } = renderApp();
    expect(await screen.findByText('Single Player')).toBeInTheDocument();
    expect(screen.getByText('Two Players')).toBeInTheDocument();
    // Mode badge is not shown on the select screen.
    expect(screen.queryByText(/^Mode:/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('.square').length).toBe(0);
  });
});

describe('valid move + turn switching (two-player UI)', () => {
  it('places X, then O, alternating turns', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    // X's turn by default.
    expect(screen.getByText('Next player is X')).toBeInTheDocument();

    await clickSquare(container, 4);
    await waitFor(() => {
      expect(container.querySelectorAll('.square')[4]).toHaveTextContent('X');
    });
    expect(screen.getByText('Next player is O')).toBeInTheDocument();

    await clickSquare(container, 0);
    await waitFor(() => {
      expect(container.querySelectorAll('.square')[0]).toHaveTextContent('O');
    });
    expect(screen.getByText('Next player is X')).toBeInTheDocument();
  });

  it('shows the active mode badge in the scoreboard', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');
    expect(await screen.findByText('Mode: Two Players')).toBeInTheDocument();
  });
});

describe('winning via UI (two-player)', () => {
  it('detects a row win and shows the winner modal', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    // X:4 O:0 X:3 O:1 X:5 -> X wins row 3-4-5
    await clickSquare(container, 4);
    await clickSquare(container, 0);
    await clickSquare(container, 3);
    await clickSquare(container, 1);
    await clickSquare(container, 5);

    expect(await screen.findByText('Player X Wins!')).toBeInTheDocument();
  });

  it('detects a diagonal win', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    // X wins main diagonal 0-4-8
    await clickSquare(container, 0);
    await clickSquare(container, 1);
    await clickSquare(container, 4);
    await clickSquare(container, 2);
    await clickSquare(container, 8);

    expect(await screen.findByText('Player X Wins!')).toBeInTheDocument();
  });

  it('detects a draw', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    // X O X / X O O / O X X
    const order = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const i of order) {
      await clickSquare(container, i);
    }

    expect(await screen.findByText("It's a Draw!")).toBeInTheDocument();
  });
});

describe('move after game completion (UI)', () => {
  it('ignores clicks on empty cells after a win', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    // X wins row 0-1-2
    await clickSquare(container, 0);
    await clickSquare(container, 3);
    await clickSquare(container, 1);
    await clickSquare(container, 4);
    await clickSquare(container, 2); // X wins

    await screen.findByText('Player X Wins!');

    // Empty cell 8 should not accept a mark after the game is over.
    await clickSquare(container, 8);
    expect(container.querySelectorAll('.square')[8]).toHaveTextContent('');
  });
});

describe('reset game (UI)', () => {
  it('clears the board and closes the modal', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    await clickSquare(container, 0);
    await clickSquare(container, 3);
    await clickSquare(container, 1);
    await clickSquare(container, 4);
    await clickSquare(container, 2); // X wins

    await screen.findByText('Player X Wins!');

    // "New Game" button in the modal resets the board.
    const newGame = screen.getByRole('button', { name: /New Game/i });
    await userEvent.click(newGame);

    await waitFor(() => {
      const squares = container.querySelectorAll('.square');
      expect([...squares].every((s) => s.textContent === '')).toBe(true);
    });
    expect(screen.queryByText('Player X Wins!')).not.toBeInTheDocument();
  });
});

describe('undo (two-player UI)', () => {
  it('removes the last mark and re-enables it', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    await clickSquare(container, 0); // X
    await waitFor(() => {
      expect(container.querySelectorAll('.square')[0]).toHaveTextContent('X');
    });

    await userEvent.click(screen.getByRole('button', { name: /Undo Last Move/i }));

    await waitFor(() => {
      expect(container.querySelectorAll('.square')[0]).toHaveTextContent('');
    });
    expect(screen.getByText('Next player is X')).toBeInTheDocument();
  });
});

describe('scoreboard update (UI)', () => {
  it('increments X tally after a win', async () => {
    const { container } = renderApp();
    await startGame(container, 'Two Players');

    // X wins row 0-1-2
    await clickSquare(container, 0);
    await clickSquare(container, 3);
    await clickSquare(container, 1);
    await clickSquare(container, 4);
    await clickSquare(container, 2);

    await screen.findByText('Player X Wins!');

    const scoreboard = container.querySelector('.scoreboard');
    await waitFor(() => {
      expect(within(scoreboard).getByText('X: 1')).toBeInTheDocument();
    });
  });
});

describe('single-player flow (UI)', () => {
  it('places the computer O automatically and switches back to the human', async () => {
    const { container } = renderApp();
    await startGame(container, 'Single Player');

    await clickSquare(container, 4); // human X

    // Computer should place an O somewhere, returning control to X.
    await waitFor(
      () => {
        const marks = [...container.querySelectorAll('.square')].map(
          (s) => s.textContent
        );
        expect(marks.filter((m) => m === 'O')).toHaveLength(1);
      },
      { timeout: 3000 }
    );
    expect(screen.getByText('Your turn (X)')).toBeInTheDocument();
  });
});
