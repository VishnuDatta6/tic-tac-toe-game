import { BOARD_COLUMNS } from '../constants.js';

/**
 * Format a 0-based board index as "Row R, Column C" (1-based).
 * @param {number} index
 */
function formatPosition(index) {
  const row = Math.floor(index / BOARD_COLUMNS) + 1;
  const col = (index % BOARD_COLUMNS) + 1;
  return `Row ${row}, Column ${col}`;
}

function MoveHistory({ moves }) {
  return (
    <div className="move-history">
      <h2 className="move-history-title">Move History</h2>
      {moves.length === 0 ? (
        <p className="move-history-empty">No moves yet.</p>
      ) : (
        <table className="move-history-table">
          <thead>
            <tr>
              <th>Move</th>
              <th>Player</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((move) => (
              <tr key={move.moveNumber}>
                <td>{move.moveNumber}</td>
                <td className={`cell-${move.player}`}>{move.player}</td>
                <td>{formatPosition(move.index)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MoveHistory;

