import { MARK_X, MODE_SINGLE, STATUS_TIE, STATUS_WON, STATUS_IN_PROGRESS } from '../constants.js';

function WinnerModal({ game, onNewGame }) {
  if (!game || game.status === STATUS_IN_PROGRESS) return null;

  let title;
  let subtitle;
  if (game.status === STATUS_TIE) {
    title = "It's a Draw!";
    subtitle = 'All cells are filled with no winner.';
  } else if (game.mode === MODE_SINGLE) {
    if (game.winner === MARK_X) {
      title = 'You Win!';
      subtitle = 'You beat the computer.';
    } else {
      title = 'Computer Wins!';
      subtitle = 'Better luck next time.';
    }
  } else {
    title = `Player ${game.winner} Wins!`;
    subtitle = `Player ${game.winner} completed a line.`;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 className={`modal-title ${game.status === STATUS_WON ? `cell-${game.winner}` : ''}`}>
          {title}
        </h2>
        <p className="modal-subtitle">{subtitle}</p>
        <button className="status-button modal-button" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}

export default WinnerModal;

