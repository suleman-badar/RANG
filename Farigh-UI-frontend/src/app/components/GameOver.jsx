import { useGame } from '../context/GameContext.jsx';

export function GameOver() {
  const { gameOverData, gameState } = useGame();

  const data = gameOverData;
  if (!data) return null;

  const { team0Score, team1Score, winnerTeam } = data;
  const myTeam = gameState?.me?.teamIndex;
  const didIWin = myTeam === winnerTeam;

  const handlePlayAgain = () => {
    localStorage.removeItem('playerName');
    localStorage.removeItem('roomCode');
    window.location.reload();
  };

  return (
    <div
      style={{
        padding: '40px 24px',
        maxWidth: '440px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h1 style={{ marginBottom: '8px' }}>Game Over</h1>

      <div style={{ fontSize: '52px', marginBottom: '8px' }}>
        {didIWin ? '🏆' : '😔'}
      </div>

      <h2
        style={{
          fontSize: '24px',
          color: didIWin ? '#15803d' : '#b91c1c',
          marginBottom: '8px',
        }}
      >
        {didIWin ? 'Your Team Wins!' : 'Your Team Lost'}
      </h2>

      <p style={{ color: '#555', marginBottom: '24px' }}>
        Winner: <strong>Team {winnerTeam + 1}</strong>
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '32px',
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '14px',
          marginBottom: '28px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#1d4ed8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}
          >
            Team 1
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1d4ed8', lineHeight: 1 }}>
            {team0Score ?? 0}
          </div>
        </div>

        <div style={{ color: '#cbd5e1', fontSize: '22px' }}>vs</div>

        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#be185d',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}
          >
            Team 2
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#be185d', lineHeight: 1 }}>
            {team1Score ?? 0}
          </div>
        </div>
      </div>

      <button
        onClick={handlePlayAgain}
        style={{
          padding: '12px 28px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '15px',
        }}
      >
        Play Again
      </button>
    </div>
  );
}
