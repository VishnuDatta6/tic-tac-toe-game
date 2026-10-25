import Square from './Square.jsx';
import { BOARD_COLUMNS } from '../constants.js';

function Board({ squares, winningLine, disabled, onClick }) {
  const isHighlighted = (i) => Array.isArray(winningLine) && winningLine.includes(i);

  const renderSquare = (i) => (
    <Square
      value={squares[i]}
      highlighted={isHighlighted(i)}
      disabled={disabled || squares[i] !== null}
      onClick={() => onClick(i)}
    />
  );

  const renderRow = (rowIndex) => {
    const base = rowIndex * BOARD_COLUMNS;
    return (
      <div className="board-row" key={rowIndex}>
        <div className="axis-label row-label">{rowIndex + 1}</div>
        <div id={String(base)}>{renderSquare(base)}</div>
        <div id={String(base + 1)}>{renderSquare(base + 1)}</div>
        <div id={String(base + 2)}>{renderSquare(base + 2)}</div>
      </div>
    );
  };

  return (
    <div className="board-container">
      <div className="board-row column-labels">
        <div className="axis-label corner-label" />
        <div className="axis-label col-label">1</div>
        <div className="axis-label col-label">2</div>
        <div className="axis-label col-label">3</div>
      </div>
      {[0, 1, 2].map(renderRow)}
    </div>
  );
}

export default Board;

