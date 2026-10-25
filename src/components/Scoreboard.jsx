import { MODE_LABELS } from '../constants.js';
import { useGameSession } from '../context/GameSessionContext.jsx';

function Scoreboard() {
  const { scoreboard, mode, pending, newSession, resetScoreboard } =
    useGameSession();

  if (!scoreboard) {
    return (
      <div className="scoreboard">
        <span className="scoreboard-title">Scoreboard</span>
        <span>...</span>
      </div>
    );
  }

  return (
    <div className="scoreboard">
      <span className="scoreboard-title">Scoreboard</span>
      <span className="score-item">X: {scoreboard.X}</span>
      <span className="score-item">O: {scoreboard.O}</span>
      <span className="score-item">Draws: {scoreboard.draws}</span>
      <button
        className="scoreboard-reset"
        disabled={pending}
        onClick={resetScoreboard}
      >
        Reset Scoreboard
      </button>
      <button
        className="scoreboard-session"
        disabled={pending}
        onClick={newSession}
      >
        New Session
      </button>
      {mode && (
        <span className="scoreboard-mode">Mode: {MODE_LABELS[mode] ?? mode}</span>
      )}
    </div>
  );
}

export default Scoreboard;
