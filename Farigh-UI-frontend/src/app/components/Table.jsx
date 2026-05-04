import { useGame } from '../context/GameContext.jsx';

const SUIT_SYMBOLS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const SUIT_COLORS = { H: '#dc2626', D: '#dc2626', C: '#111827', S: '#111827' };
const SUIT_NAMES = { H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' };
const VALUE_MAP = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function displayVal(v) {
  return VALUE_MAP[v] || String(v);
}

export function Table() {
  const { gameState, trickResult } = useGame();

  if (!gameState) return null;

  const { trickCards, players, activeSuit, currentPlayerId, me } = gameState;

  const getPlayerName = (id) => {
    const p = players?.find((pl) => pl.id === id);
    return p ? p.name : id;
  };

  const isMyTurn = currentPlayerId === me?.id;

  return (
    <div
      style={{
        padding: '14px',
        background: '#1e3a5f',
        borderRadius: '12px',
        marginBottom: '14px',
        color: '#fff',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0, color: '#fff' }}>Table</h3>

        {activeSuit && (
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '12px',
              background: '#0f172a',
              color: SUIT_COLORS[activeSuit],
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            Lead: {SUIT_SYMBOLS[activeSuit]} {SUIT_NAMES[activeSuit]}
          </span>
        )}

        <span
          style={{
            marginLeft: 'auto',
            fontSize: '13px',
            color: isMyTurn ? '#4ade80' : '#94a3b8',
          }}
        >
          {isMyTurn
            ? '⬤ Your turn'
            : `⬤ ${getPlayerName(currentPlayerId)}'s turn`}
        </span>
      </div>

      {/* Trick result flash */}
      {trickResult && (
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: '#0f172a',
            color: '#facc15',
            fontSize: '13px',
            marginBottom: '10px',
          }}
        >
          🏆 {getPlayerName(trickResult.winnerId)} won the trick!
        </div>
      )}

      {/* Cards on table */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {(!trickCards || trickCards.length === 0) && (
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            No cards played yet this trick.
          </p>
        )}
        {trickCards &&
          trickCards.map((tc, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '10px 14px',
                textAlign: 'center',
                minWidth: '64px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                {getPlayerName(tc.playerId)}
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: SUIT_COLORS[tc.card.suit],
                  lineHeight: 1,
                }}
              >
                {displayVal(tc.card.value)}
                {SUIT_SYMBOLS[tc.card.suit]}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
