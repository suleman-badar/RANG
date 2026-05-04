import { useGame } from '../context/GameContext.jsx';

const SUIT_SYMBOLS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const SUIT_COLORS = { H: '#dc2626', D: '#dc2626', C: '#111827', S: '#111827' };
const VALUE_MAP = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function displayVal(v) {
  return VALUE_MAP[v] || String(v);
}

function CardDisplay({ card }) {
  return (
    <span
      style={{
        fontWeight: 'bold',
        color: SUIT_COLORS[card.suit],
        fontSize: '18px',
      }}
    >
      {displayVal(card.value)}
      {SUIT_SYMBOLS[card.suit]}
    </span>
  );
}

export function Toss() {
  const { gameState, tossCards, tossResult, selectBatter } = useGame();

  const players = gameState?.players || [];
  const myId = gameState?.me?.id;
  const isWinner = tossResult && tossResult.winnerId === myId;

  const getPlayerName = (id) => {
    const p = players.find((pl) => pl.id === id);
    return p ? p.name : id;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '520px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '16px' }}>Toss Phase</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '8px' }}>Toss Cards</h3>
        {tossCards.length === 0 && (
          <p style={{ color: '#666', fontSize: '14px' }}>Waiting for toss cards…</p>
        )}
        {tossCards.map((tc, i) => (
          <div
            key={i}
            style={{
              padding: '8px 12px',
              marginBottom: '6px',
              borderRadius: '6px',
              background: '#f8f8f8',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ flex: 1, fontSize: '14px' }}>{getPlayerName(tc.playerId)}</span>
            <CardDisplay card={tc.card} />
          </div>
        ))}
      </div>

      {tossResult && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: isWinner ? '#dcfce7' : '#f3f4f6',
            border: `1px solid ${isWinner ? '#86efac' : '#d1d5db'}`,
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            {isWinner
              ? '🎉 You won the toss! Select who bats first.'
              : `${getPlayerName(tossResult.winnerId)} won the toss.`}
          </p>
        </div>
      )}

      {isWinner && (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Select Batter</h3>
          <p style={{ color: '#555', fontSize: '13px', marginBottom: '10px' }}>
            Choose which player bats first:
          </p>
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => selectBatter(p.id)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: '6px',
                padding: '8px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
              }}
            >
              {p.name}{' '}
              <span
                style={{
                  fontSize: '12px',
                  color: p.teamIndex === 0 ? '#1d4ed8' : '#be185d',
                }}
              >
                (Team {p.teamIndex + 1})
              </span>
            </button>
          ))}
        </div>
      )}

      {!tossResult && (
        <p style={{ color: '#666', fontSize: '14px' }}>Waiting for toss result…</p>
      )}
      {tossResult && !isWinner && (
        <p style={{ color: '#666', fontSize: '14px' }}>
          Waiting for {getPlayerName(tossResult.winnerId)} to select the batter…
        </p>
      )}
    </div>
  );
}
