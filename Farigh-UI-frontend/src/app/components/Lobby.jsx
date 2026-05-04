import { useGame } from '../context/GameContext.jsx';

export function Lobby() {
  const { roomCode, roomData, gameState, startGame, connected, playerName } = useGame();

  const players = gameState?.players || roomData?.players || [];
  const displayRoomCode = gameState?.roomCode || roomData?.roomCode || roomCode;

  const myId = gameState?.me?.id;
  const hostPlayer = players[0];
  const isHost = myId && hostPlayer && myId === hostPlayer.id;

  return (
    <div style={{ padding: '24px', maxWidth: '520px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '4px' }}>Lobby</h2>
      <p style={{ color: connected ? '#27ae60' : '#e74c3c', margin: '0 0 12px 0' }}>
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </p>

      <div style={{ background: '#f4f4f4', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Room Code</p>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px' }}>
          {displayRoomCode || '—'}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
          Playing as <strong>{playerName}</strong>
        </p>
      </div>

      <h3 style={{ marginBottom: '8px' }}>Players ({players.length})</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
        {players.map((p, idx) => (
          <li
            key={p.id}
            style={{
              padding: '8px 12px',
              marginBottom: '6px',
              borderRadius: '6px',
              background: '#fff',
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ flex: 1, fontWeight: p.id === myId ? 'bold' : 'normal' }}>
              {p.name}
              {p.id === myId ? ' (you)' : ''}
              {idx === 0 ? ' 👑' : ''}
            </span>
            <span
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: p.teamIndex === 0 ? '#dbeafe' : '#fce7f3',
                color: p.teamIndex === 0 ? '#1d4ed8' : '#be185d',
              }}
            >
              Team {p.teamIndex + 1}
            </span>
            {!p.connected && (
              <span style={{ fontSize: '12px', color: '#e74c3c' }}>disconnected</span>
            )}
          </li>
        ))}
        {players.length === 0 && (
          <li style={{ color: '#999', fontSize: '14px' }}>Waiting for players to join…</li>
        )}
      </ul>

      {isHost ? (
        <button
          onClick={startGame}
          style={{
            padding: '10px 24px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
          }}
        >
          Start Game
        </button>
      ) : (
        <p style={{ color: '#666', fontSize: '14px' }}>Waiting for the host to start the game…</p>
      )}
    </div>
  );
}
