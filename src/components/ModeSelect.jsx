import { MODE_SINGLE, MODE_MULTI } from '../constants.js';

function ModeSelect({ onStart, starting }) {
  return (
    <div className="mode-select">
      <h1 className="header">TIC-TAC-TOE</h1>
      <p className="mode-subtitle">Choose a game mode</p>
      <div className="mode-buttons">
        <button
          className="status-button"
          disabled={starting}
          onClick={() => onStart(MODE_SINGLE)}
        >
          Single Player
        </button>
        <button
          className="status-button"
          disabled={starting}
          onClick={() => onStart(MODE_MULTI)}
        >
          Two Players
        </button>
      </div>
      {starting && <p className="hint">Starting game…</p>}
    </div>
  );
}

export default ModeSelect;
