import { useEffect, useRef, useState } from 'react';
import Board from './Board.jsx';
import MoveHistory from './MoveHistory.jsx';
import WinnerModal from './WinnerModal.jsx';
import { useGameSession } from '../context/GameSessionContext.jsx';
import {
  COMPUTER_TURN_DELAY_MS,
  MARK_X,
  MODE_SINGLE,
  STATUS_IN_PROGRESS,
  STATUS_WON,
  STATUS_TIE,
} from '../constants.js';
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function statusText(game) {
  if (game.status === STATUS_WON) {
    if (game.mode === MODE_SINGLE) {
      return game.winner === MARK_X ? 'You win!' : 'Computer wins!';
    }
    return 'Winner is ' + game.winner;
  }
  if (game.status === STATUS_TIE) return 'The Game is a Tie';
  if (game.mode === MODE_SINGLE) {
    return game.currentPlayer === MARK_X ? 'Your turn (X)' : 'Computer is thinking…';
  }
  return 'Next player is ' + game.currentPlayer;
}

function Game() {
  const { game, pending, submitHumanMove, playComputer, undo, resetGame } =
    useGameSession();
  const [thinking, setThinking] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The provider clears `game` when exiting to mode select.
  if (!game) return null;

  const handleCellClick = async (index) => {
    if (pending || thinking || game.status !== STATUS_IN_PROGRESS) return;
    // In single-player, ignore clicks while the computer is "thinking".
    if (game.mode === MODE_SINGLE && game.currentPlayer !== MARK_X) return;

    try {
      const next = await submitHumanMove(index);
      if (!mountedRef.current) return;

      // Hand the turn to the computer with a visible pause so the player can
      // see "Computer is thinking…" before the O is placed.
      if (
        next &&
        next.mode === MODE_SINGLE &&
        next.status === STATUS_IN_PROGRESS &&
        next.currentPlayer !== MARK_X
      ) {
        setThinking(true);
        await delay(COMPUTER_TURN_DELAY_MS);
        if (!mountedRef.current) return;
        await playComputer();
      }
    } catch {
      // Errors are surfaced via context.error and rendered by App.
    } finally {
      if (mountedRef.current) setThinking(false);
    }
  };

  const canMove =
    !pending &&
    !thinking &&
    game.status === STATUS_IN_PROGRESS &&
    !(game.mode === MODE_SINGLE && game.currentPlayer !== MARK_X);

  return (
    <div className="game">
      <div className="game-board">
        <h1 className="header">TIC-TAC-TOE</h1>
        <Board
          squares={game.board}
          winningLine={game.winningLine}
          disabled={!canMove}
          onClick={handleCellClick}
        />
        <div className="controls">
          <button
            className="status-button"
            disabled={pending || thinking || game.moves.length === 0}
            onClick={undo}
          >
            Undo Last Move
          </button>
          <button
            className="status-button"
            disabled={pending || thinking}
            onClick={resetGame}
          >
            Reset Game
          </button>
        </div>
      </div>
      <div className="game-info">
        <div className={`status ${thinking ? 'status-thinking' : ''}`}>
          {thinking ? 'Computer is thinking…' : statusText(game)}
        </div>
        <MoveHistory moves={game.moves} />
      </div>
      <WinnerModal game={game} onNewGame={resetGame} />
    </div>
  );
}

export default Game;

