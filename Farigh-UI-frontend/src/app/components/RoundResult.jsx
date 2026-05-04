import { useGame } from '../context/GameContext.jsx';

export function RoundResult() {
  const { roundResult, gameState, readyNextRound } = useGame();

  if (!roundResult) return null;

  const { winnerTeam, pointsAwarded, reason } = roundResult;
  const myTeam = gameState?.me?.teamIndex;
  const didIWin = myTeam === winnerTeam;

  return (
    <div
      style={{
        padding: '32px 24px',
        maxWidth: '420px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          padding: '24px',
          borderRadius: '14px',
          border: `2px solid ${didIWin ? '#86efac' : '#fca5a5'}`,
          background: didIWin ? '#f0fdf4' : '#fff5f5',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>
          {didIWin ? '🎉' : '😔'}
        </div>
        <h2 style={{ margin: '0 0 4px 0', color: didIWin ? '#15803d' : '#b91c1c' }}>
          {didIWin ? 'Your Team Wins the Round!' : 'Your Team Lost the Round'}
        </h2>
        <p style={{ color: '#555', margin: '0 0 12px 0', fontSize: '14px' }}>
          Winner: <strong>Team {winnerTeam + 1}</strong>
        </p>
        <p style={{ color: '#555', margin: '0 0 4px 0', fontSize: '14px' }}>
          Points awarded: <strong>{pointsAwarded}</strong>
        </p>
        <p style={{ color: '#777', margin: 0, fontSize: '13px' }}>{reason}</p>
      </div>

      {gameState?.scores && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            padding: '14px',
            background: '#f8fafc',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#1d4ed8', marginBottom: '2px' }}>Team 1</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#1d4ed8' }}>
              {gameState.scores.team0}
            </div>
          </div>
          <div style={{ alignSelf: 'center', color: '#cbd5e1', fontSize: '18px' }}>vs</div>
          <div>
            <div style={{ fontSize: '12px', color: '#be185d', marginBottom: '2px' }}>Team 2</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#be185d' }}>
              {gameState.scores.team1}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={readyNextRound}
        style={{
          padding: '12px 28px',
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '15px',
        }}
      >
        Ready for Next Round
      </button>
    </div>
  );
}
