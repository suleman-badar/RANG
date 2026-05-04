import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import { Lobby } from './components/Lobby.jsx';
import { Toss } from './components/Toss.jsx';
import { Hand } from './components/Hand.jsx';
import { Table } from './components/Table.jsx';
import { HiddenCard } from './components/HiddenCard.jsx';
import { TrumpBadge } from './components/TrumpBadge.jsx';
import { OpenDeclare } from './components/OpenDeclare.jsx';
import { ScoreBoard } from './components/ScoreBoard.jsx';
import { RoundResult } from './components/RoundResult.jsx';
import { GameOver } from './components/GameOver.jsx';

// ── Playing Phase Layout ──────────────────────────────────────────────────

function GameUI() {
  const { gameState } = useGame();
  if (!gameState) return null;

  const { hiddenCard, trumpRevealed, currentTurn } = gameState;

  return (
    <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
      <ScoreBoard />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {trumpRevealed && <TrumpBadge />}
        {hiddenCard?.exists && !hiddenCard?.isRevealed && <HiddenCard />}
      </div>

      {currentTurn === 1 && <OpenDeclare />}

      <Table />
      <Hand />
    </div>
  );
}

// ── Other Players Info Panel ──────────────────────────────────────────────

function OtherPlayers() {
  const { gameState } = useGame();
  if (!gameState) return null;

  const { players, me, currentPlayerId } = gameState;
  const others = players?.filter((p) => p.id !== me?.id) || [];
  if (others.length === 0) return null;

  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {others.map((p) => (
        <span
          key={p.id}
          style={{
            fontSize: '13px',
            padding: '3px 10px',
            borderRadius: '12px',
            background: p.id === currentPlayerId ? '#fef9c3' : '#fff',
            border: `1px solid ${p.id === currentPlayerId ? '#fde047' : '#d1d5db'}`,
            color: p.connected ? '#111' : '#9ca3af',
          }}
        >
          {p.name}
          {p.id === currentPlayerId ? ' 🎴' : ''}
          {!p.connected ? ' (offline)' : ''}
          {' '}
          <span style={{ color: '#94a3b8' }}>×{p.cardCount}</span>
        </span>
      ))}
    </div>
  );
}

// ─��� Home Screen ───────────────────────────────────────────────────────────

function HomeScreen() {
  const { createRoom, joinRoom, error, setError, connected } = useGame();
  const [nameInput, setNameInput] = useState('');
  const [roomInput, setRoomInput] = useState('');

  const handleCreate = () => {
    if (nameInput.trim()) createRoom(nameInput.trim());
  };

  const handleJoin = () => {
    if (nameInput.trim() && roomInput.trim()) joinRoom(nameInput.trim(), roomInput.trim());
  };

  return (
    <div
      style={{
        padding: '40px 24px',
        maxWidth: '380px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '4px' }}>Rang</h1>
      <p
        style={{
          fontSize: '13px',
          color: connected ? '#16a34a' : '#dc2626',
          marginBottom: '24px',
        }}
      >
        {connected ? '🟢 Connected to server' : '🔴 Connecting to server…'}
      </p>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fff5f5',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ flex: 1 }}>⚠ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#b91c1c',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
          Your Name
        </label>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Enter your name"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </div>

      {/* Create Room */}
      <button
        onClick={handleCreate}
        disabled={!nameInput.trim()}
        style={{
          width: '100%',
          padding: '10px',
          background: nameInput.trim() ? '#2563eb' : '#d1d5db',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: nameInput.trim() ? 'pointer' : 'default',
          fontSize: '15px',
          marginBottom: '16px',
        }}
      >
        Create Room
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          color: '#9ca3af',
          fontSize: '13px',
        }}
      >
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
        or join existing
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
      </div>

      {/* Join Room */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
          Room Code
        </label>
        <input
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
          placeholder="Enter room code"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            letterSpacing: '2px',
            boxSizing: 'border-box',
            marginBottom: '10px',
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button
          onClick={handleJoin}
          disabled={!nameInput.trim() || !roomInput.trim()}
          style={{
            width: '100%',
            padding: '10px',
            background: nameInput.trim() && roomInput.trim() ? '#059669' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: nameInput.trim() && roomInput.trim() ? 'pointer' : 'default',
            fontSize: '15px',
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}

// ── App Router ────────────────────────────────────────────────────────────

function AppContent() {
  const { hasJoined, gameState, error } = useGame();

  if (!hasJoined) {
    return <HomeScreen />;
  }

  const phase = gameState?.phase || 'lobby';

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Top error banner */}
      {error && (
        <ErrorBanner />
      )}

      {phase === 'lobby' && <Lobby />}
      {phase === 'toss' && <Toss />}
      {phase === 'playing' && (
        <>
          <OtherPlayers />
          <GameUI />
        </>
      )}
      {phase === 'round_end' && <RoundResult />}
      {phase === 'game_over' && <GameOver />}
    </div>
  );
}

function ErrorBanner() {
  const { error, setError } = useGame();
  if (!error) return null;
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#fef2f2',
        borderBottom: '1px solid #fca5a5',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#b91c1c',
      }}
    >
      <span style={{ flex: 1 }}>⚠ {error}</span>
      <button
        onClick={() => setError(null)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
