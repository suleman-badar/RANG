import { useGame } from '../context/GameContext.jsx';

export function HiddenCard() {
  const { gameState } = useGame();

  if (!gameState) return null;

  const { hiddenCard } = gameState;

  if (!hiddenCard?.exists || hiddenCard?.isRevealed) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        padding: '6px 14px',
        background: '#1c1917',
        border: '2px solid #ca8a04',
        borderRadius: '8px',
        color: '#fde68a',
        fontWeight: 'bold',
        fontSize: '14px',
      }}
    >
      <span style={{ fontSize: '22px' }}>🂠</span>
      <span>Hidden Card (Trump Unrevealed)</span>
    </div>
  );
}
