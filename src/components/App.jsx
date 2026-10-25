import ModeSelect from './ModeSelect.jsx';
import Game from './Game.jsx';
import Scoreboard from './Scoreboard.jsx';
import { useGameSession } from '../context/GameSessionContext.jsx';

function App() {
  const { game, status, error, starting, startGame } = useGameSession();

  if (status === 'restoring' || status === 'loading') {
    return <div className="game-status-line">Loading...</div>;
  }

  return (
    <div className="app">
      <Scoreboard />
      {error && <div className="error-banner">{error}</div>}
      {game ? <Game /> : <ModeSelect onStart={startGame} starting={starting} />}
    </div>
  );
}

export default App;
