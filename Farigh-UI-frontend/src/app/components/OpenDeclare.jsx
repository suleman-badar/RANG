import { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

const SUITS = ['H', 'D', 'C', 'S'];
const SUIT_SYMBOLS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const SUIT_NAMES = { H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' };
const SUIT_COLORS = { H: '#dc2626', D: '#dc2626', C: '#111827', S: '#111827' };

export function OpenDeclare() {
  const { gameState, declareOpen, declareDoubleOpen } = useGame();
  const [selectedSuit, setSelectedSuit] = useState(null);

  if (!gameState) return null;
  if (gameState.currentTurn !== 1) return null;

  const isMyTurn = gameState.currentPlayerId === gameState.me?.id;
  if (!isMyTurn) return null;

  const handleOpen = () => {
    if (!selectedSuit) return;
    declareOpen(selectedSuit);
    setSelectedSuit(null);
  };

  const handleDoubleOpen = () => {
    if (!selectedSuit) return;
    declareDoubleOpen(selectedSuit);
    setSelectedSuit(null);
  };

  return (
    <div
      style={{
        marginBottom: '14px',
        padding: '14px',
        background: '#fdf4ff',
        border: '2px solid #d946ef',
        borderRadius: '10px',
      }}
    >
      <h4 style={{ margin: '0 0 6px 0', color: '#86198f' }}>Declare Trump (Turn 1)</h4>
      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#555' }}>
        Pick a suit, then declare open or double-open:
      </p>

      {/* Suit selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {SUITS.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSuit(s)}
            style={{
              padding: '6px 14px',
              border: `2px solid ${SUIT_COLORS[s]}`,
              borderRadius: '6px',
              background: selectedSuit === s ? SUIT_COLORS[s] : '#fff',
              color: selectedSuit === s ? '#fff' : SUIT_COLORS[s],
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.15s',
            }}
          >
            {SUIT_SYMBOLS[s]} {SUIT_NAMES[s]}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={handleOpen}
          disabled={!selectedSuit}
          style={{
            padding: '8px 18px',
            background: selectedSuit ? '#2563eb' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedSuit ? 'pointer' : 'default',
            fontSize: '14px',
          }}
        >
          Declare Open
        </button>
        <button
          onClick={handleDoubleOpen}
          disabled={!selectedSuit}
          style={{
            padding: '8px 18px',
            background: selectedSuit ? '#7c3aed' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedSuit ? 'pointer' : 'default',
            fontSize: '14px',
          }}
        >
          Declare Double Open
        </button>
      </div>
    </div>
  );
}
