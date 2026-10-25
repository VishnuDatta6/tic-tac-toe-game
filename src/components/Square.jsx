function Square({ value, highlighted, disabled, onClick }) {
  const className = 'square' + (highlighted ? ' square-highlight' : '');
  return (
    <button
      className={className}
      data-mark={value ?? undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {value}
    </button>
  );
}

export default Square;
