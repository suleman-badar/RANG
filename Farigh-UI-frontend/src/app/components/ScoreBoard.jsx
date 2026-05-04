import { useGame } from '../context/GameContext.jsx';

export function ScoreBoard() {
  const { gameState } = useGame();

  if (!gameState?.scores) return null;

  const { scores, players, me } = gameState;

  const team0Players = players?.filter((p) => p.teamIndex === 0) || [];
  const team1Players = players?.filter((p) => p.teamIndex === 1) || [];

  return (
    <div
      style={{
        display: 'flex',
        gap: '0',
        marginBottom: '14px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Team 0 */}
      <div
        style={{
          flex: 1,
          padding: '10px 16px',
          background: me?.teamIndex === 0 ? '#dbeafe' : '#f8fafc',
          textAlign: 'center',
          borderRight: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#1d4ed8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '2px',
          }}
        >
          Team 1{me?.teamIndex === 0 ? ' (You)' : ''}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1d4ed8', lineHeight: 1 }}>
          {scores.team0}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          {team0Players.map((p) => p.name).join(', ') || '—'}
        </div>
      </div>

      {/* Divider label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          background: '#f1f5f9',
          color: '#94a3b8',
          fontSize: '11px',
          fontWeight: 'bold',
        }}
      >
        vs
      </div>

      {/* Team 1 */}
      <div
        style={{
          flex: 1,
          padding: '10px 16px',
          background: me?.teamIndex === 1 ? '#fce7f3' : '#f8fafc',
          textAlign: 'center',
          borderLeft: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#be185d',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '2px',
          }}
        >
          Team 2{me?.teamIndex === 1 ? ' (You)' : ''}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#be185d', lineHeight: 1 }}>
          {scores.team1}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          {team1Players.map((p) => p.name).join(', ') || '—'}
        </div>
      </div>
    </div>
  );
}
