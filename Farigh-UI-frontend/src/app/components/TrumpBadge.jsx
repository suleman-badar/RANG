import { useGame } from '../context/GameContext.jsx';

const SUIT_SYMBOLS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const SUIT_NAMES = { H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' };
const SUIT_BG = { H: '#fef2f2', D: '#fef2f2', C: '#f8fafc', S: '#f8fafc' };
const SUIT_BORDER = { H: '#fca5a5', D: '#fca5a5', C: '#94a3b8', S: '#94a3b8' };
const SUIT_COLORS = { H: '#dc2626', D: '#dc2626', C: '#1e293b', S: '#1e293b' };

export function TrumpBadge() {
  const { gameState } = useGame();

  if (!gameState?.trumpRevealed || !gameState?.trumpSuit) return null;

  const suit = gameState.trumpSuit;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        padding: '6px 16px',
        background: SUIT_BG[suit],
        border: `2px solid ${SUIT_BORDER[suit]}`,
        borderRadius: '20px',
        color: SUIT_COLORS[suit],
        fontWeight: 'bold',
        fontSize: '14px',
      }}
    >
      <span style={{ fontSize: '20px' }}>{SUIT_SYMBOLS[suit]}</span>
      <span>Trump: {SUIT_NAMES[suit]}</span>
      {gameState.doubleOpenMode && (
        <span
          style={{
            background: '#7c3aed',
            color: '#fff',
            borderRadius: '10px',
            padding: '1px 8px',
            fontSize: '11px',
          }}
        >
          DOUBLE OPEN
        </span>
      )}
      {gameState.openMode && !gameState.doubleOpenMode && (
        <span
          style={{
            background: '#2563eb',
            color: '#fff',
            borderRadius: '10px',
            padding: '1px 8px',
            fontSize: '11px',
          }}
        >
          OPEN
        </span>
      )}
    </div>
  );
}
