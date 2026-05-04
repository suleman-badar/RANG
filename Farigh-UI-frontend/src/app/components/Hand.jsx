import { useGame } from '../context/GameContext.jsx';

const SUIT_SYMBOLS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const SUIT_COLORS = { H: '#dc2626', D: '#dc2626', C: '#111827', S: '#111827' };
const VALUE_MAP = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function displayVal(v) {
  return VALUE_MAP[v] || String(v);
}

export function Hand() {
  const { gameState, hiddenCardIndex, playCard, requestReshuffle } = useGame();

  if (!gameState) return null;

  const { hand, me, currentPlayerId } = gameState;
  const isMyTurn = currentPlayerId === me?.id;

  if (!hand || hand.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px',
        background: '#f0fdf4',
        borderRadius: '10px',
        border: '1px solid #bbf7d0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
        <h3 style={{ margin: 0 }}>Your Hand</h3>
        {isMyTurn ? (
          <span
            style={{
              padding: '2px 10px',
              background: '#16a34a',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            YOUR TURN — click a card to play
          </span>
        ) : (
          <span
            style={{
              padding: '2px 10px',
              background: '#9ca3af',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          >
            Waiting for your turn…
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {hand.map((card, i) => {
          const isHidden = i === hiddenCardIndex;
          return (
            <button
              key={i}
              onClick={() => isMyTurn && playCard(card)}
              disabled={!isMyTurn}
              title={isHidden ? 'Hidden card' : `${displayVal(card.value)} of ${card.suit}`}
              style={{
                position: 'relative',
                padding: '10px 14px',
                border: `2px solid ${isHidden ? '#ca8a04' : isMyTurn ? '#6b7280' : '#d1d5db'}`,
                borderRadius: '8px',
                cursor: isMyTurn ? 'pointer' : 'default',
                background: isMyTurn ? '#fff' : '#f9fafb',
                color: SUIT_COLORS[card.suit],
                fontWeight: 'bold',
                fontSize: '18px',
                boxShadow: isMyTurn ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={(e) => {
                if (isMyTurn) e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {displayVal(card.value)}
              {SUIT_SYMBOLS[card.suit]}
              {isHidden && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    right: '-7px',
                    background: '#ca8a04',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  H
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={requestReshuffle}
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          background: 'transparent',
          border: '1px solid #9ca3af',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#6b7280',
        }}
      >
        Request Reshuffle
      </button>
    </div>
  );
}
