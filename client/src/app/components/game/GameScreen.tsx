import React, { useState, useEffect } from "react";
import { useGame, Card, Suit, Player } from "../../context/GameContext";
import { PlayingCard, CardBack, SuitSelector, getSuitSymbol, getSuitName, isRedSuit } from "./PlayingCard";

// ─── Main Game Screen ─────────────────────────────────────────────────────────

export function GameScreen() {
  const {
    state,
    playCard,
    declareOpen,
    declareDoubleOpen,
    requestReshuffle,
    dismissTrickWinner,
    dismissRoundResult,
    clearError,
    leaveRoom,
  } = useGame();

  const {
    players,
    myPlayerId,
    myHand,
    trickCards,
    currentPlayerIndex,
    activeSuit,
    trumpSuit,
    trumpRevealed,
    currentTurn,
    currentRound,
    currentBatterIndex,
    openMode,
    doubleOpenMode,
    openDeclaredByTeam,
    openDeclaredByPlayerId,
    hiddenPile,
    totalScores,
    roundScores,
    lastTrickWinner,
    roundResult,
    lastError,
    lastErrorCode,
    serverPhase,
    pausedForPlayerId,
  } = state;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showSuitSelector, setShowSuitSelector] = useState<"open" | "doubleOpen" | null>(null);

  const relaxReshuffleRule = (import.meta as any).env?.VITE_DEV_ALLOW_RESHUFFLE === "1";

  // Find my player object
  const me = players.find((p) => p.id === myPlayerId);
  const myPlayerIndex = me?.playerIndex ?? 0;
  const isMyTurn = currentPlayerIndex === myPlayerIndex;

  // Determine positions relative to me
  const topIndex = (myPlayerIndex + 2) % 4;
  const rightIndex = (myPlayerIndex + 1) % 4;
  const leftIndex = (myPlayerIndex + 3) % 4;

  const getPlayerAt = (idx: number) => players.find((p) => p.playerIndex === idx);
  const topPlayer = getPlayerAt(topIndex);
  const rightPlayer = getPlayerAt(rightIndex);
  const leftPlayer = getPlayerAt(leftIndex);

  // Playing a card
  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;
    if (selectedCardId === card.id) {
      // Second click = play it
      playCard(card.id);
      setSelectedCardId(null);
    } else {
      setSelectedCardId(card.id);
    }
  };

  // Check if card is playable (basic client-side hint, server validates)
  const isCardPlayable = (card: Card): boolean => {
    if (!isMyTurn) return false;
    if (!activeSuit) return true; // First player, any card
    if (card.suit === activeSuit) return true;
    // Check if I have the active suit
    const hasActiveSuit = myHand.some((c) => c.suit === activeSuit);
    if (!hasActiveSuit) return true; // Must play something, can play anything
    return false;
  };

  // Auto-deselect if not my turn
  useEffect(() => {
    if (!isMyTurn) setSelectedCardId(null);
  }, [isMyTurn]);

  // Eligibility for open/double open (client-side hint)
  const canDeclareOpenClient =
    serverPhase === "open_window" &&
    currentTurn === 1 &&
    isMyTurn &&
    !openMode &&
    !doubleOpenMode &&
    myPlayerIndex !== currentBatterIndex;

  const canDeclareDoubleOpenClient =
    serverPhase === "open_window" &&
    currentTurn === 1 &&
    isMyTurn &&
    openMode &&
    !doubleOpenMode &&
    me?.teamIndex !== openDeclaredByTeam;

  const hasFaceCardsClient = myHand.some((c) => c.value === 11 || c.value === 12 || c.value === 13);

  const showReshuffleButtonClient =
    currentTurn === 1 &&
    !openMode &&
    !doubleOpenMode;

  const canRequestReshuffleClient =
    showReshuffleButtonClient &&
    isMyTurn &&
    (relaxReshuffleRule ? true : myPlayerIndex !== currentBatterIndex) &&
    (relaxReshuffleRule ? true : !hasFaceCardsClient);

  const reshuffleDisabledReason =
    !showReshuffleButtonClient
      ? null
      : !isMyTurn
        ? "Not your turn"
        : !relaxReshuffleRule && myPlayerIndex === currentBatterIndex
          ? "Batter cannot reshuffle"
          : !relaxReshuffleRule && hasFaceCardsClient
            ? "Need no J / Q / K to reshuffle"
            : null;

  const reshuffleInlineError =
    canRequestReshuffleClient &&
    (lastErrorCode === "RESHUFFLE_NOT_ELIGIBLE" || lastErrorCode === "WRONG_TURN")
      ? lastErrorCode === "WRONG_TURN"
        ? "Not your turn"
        : "Not eligible for reshuffle"
      : null;

  // Batter team indicator
  const batterTeam = currentBatterIndex % 2;
  const getBatterTeamLabel = () => `Team ${batterTeam + 1} Bats`;

  // Whether the hidden card placeholder should be visible for a given player index.
  // Any player (me or opponent) whose playerIndex === currentBatterIndex AND trump
  // hasn't been revealed yet should show the face-down card badge.
  const isBatterHiddenActive = !trumpRevealed;
  const amIBatter = myPlayerIndex === currentBatterIndex;

  const pausedPlayer = pausedForPlayerId
    ? players.find((p) => p.id === pausedForPlayerId)
    : null;

  return (
    <div className="h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 flex flex-col overflow-hidden relative">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-gray-800 flex-shrink-0">
        {/* Scores */}
        <div className="flex items-center gap-4">
          <ScoreItem label="Team 1" score={totalScores[0]} color="text-blue-400" />
          <span className="text-gray-600">vs</span>
          <ScoreItem label="Team 2" score={totalScores[1]} color="text-orange-400" />
        </div>

        {/* Round info */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>Round {currentRound}</span>
          <span className="text-gray-600">•</span>
          <span>Turn {currentTurn}</span>
          <span className="text-gray-600">•</span>
          <span className={batterTeam === 0 ? "text-blue-400" : "text-orange-400"}>{getBatterTeamLabel()}</span>
        </div>

        {/* Trump info */}
        <div className="flex items-center gap-2 text-xs">
          {trumpRevealed && trumpSuit ? (
            <span className={`px-2 py-1 rounded ${isRedSuit(trumpSuit) ? "bg-red-900/50 text-red-400" : "bg-gray-800 text-gray-300"}`}>
              Trump: {getSuitSymbol(trumpSuit)}
            </span>
          ) : (
            <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-600 text-xs">Trump: Hidden</span>
          )}
          {(openMode || doubleOpenMode) && (
            <span className={`px-2 py-1 rounded text-xs ${doubleOpenMode ? "bg-purple-900/50 text-purple-400" : "bg-yellow-900/50 text-yellow-400"}`}>
              {doubleOpenMode ? "Double Open!" : "Open"}
            </span>
          )}
        </div>
      </div>

      {/* ── Game Table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col min-h-0">

        {/* Top player */}
        <div className="flex justify-center pt-3 flex-shrink-0">
          {topPlayer && (
            <OpponentPanel
              player={topPlayer}
              isCurrentTurn={topPlayer.playerIndex === currentPlayerIndex}
              trickCard={trickCards.find((tc) => tc.playerId === topPlayer.id)}
              position="top"
              showHiddenCard={isBatterHiddenActive && topPlayer.playerIndex === currentBatterIndex}
            />
          )}
        </div>

        {/* Middle row: left + center + right */}
        <div className="flex-1 flex items-center justify-between px-3 min-h-0">
          {/* Left player */}
          <div className="flex-shrink-0">
            {leftPlayer && (
              <OpponentPanel
                player={leftPlayer}
                isCurrentTurn={leftPlayer.playerIndex === currentPlayerIndex}
                trickCard={trickCards.find((tc) => tc.playerId === leftPlayer.id)}
                position="left"
                showHiddenCard={isBatterHiddenActive && leftPlayer.playerIndex === currentBatterIndex}
              />
            )}
          </div>

          {/* Center: Trick area */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
            <div className="mb-16">
              <HiddenPileArea cards={hiddenPile} revealed={trumpRevealed} />
            </div>
            <TrickArea
              players={players}
              trickCards={trickCards}
              myPlayerIndex={myPlayerIndex}
              activeSuit={activeSuit}
              currentPlayerIndex={currentPlayerIndex}
            />
          </div>

          {/* Right player */}
          <div className="flex-shrink-0">
            {rightPlayer && (
              <OpponentPanel
                player={rightPlayer}
                isCurrentTurn={rightPlayer.playerIndex === currentPlayerIndex}
                trickCard={trickCards.find((tc) => tc.playerId === rightPlayer.id)}
                position="right"
                showHiddenCard={isBatterHiddenActive && rightPlayer.playerIndex === currentBatterIndex}
              />
            )}
          </div>
        </div>

        {/* My player label + hidden-card badge (visible when I am the batter) */}
        <div className="flex justify-center flex-shrink-0 pb-1 gap-2 items-center">
          {me && (
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
              ${isMyTurn ? "bg-yellow-900/60 border border-yellow-600 text-yellow-300" : "bg-gray-900/60 border border-gray-700 text-gray-400"}
            `}>
              <span className={`w-1.5 h-1.5 rounded-full ${me.connected ? "bg-green-400" : "bg-red-400"}`} />
              <span>{me.name} (You)</span>
              {isMyTurn && <span>• Your Turn!</span>}
            </div>
          )}
          {/* Face-down hidden card badge — visible to me when I am the batter and trump not yet revealed */}
          {amIBatter && isBatterHiddenActive && (
            <div className="flex flex-col items-center gap-0.5">
              <CardBack size="sm" />
              <span className="text-xs text-amber-400">Hidden</span>
            </div>
          )}
        </div>

        {/* My hand */}
        <div className="flex-shrink-0 pb-3">
          <MyHand
            hand={myHand}
            selectedCardId={selectedCardId}
            isMyTurn={isMyTurn}
            isCardPlayable={isCardPlayable}
            onCardClick={handleCardClick}
          />

          {/* Action buttons */}
          {(canDeclareOpenClient || canDeclareDoubleOpenClient) && (
            <div className="flex justify-center gap-2 mt-2 px-4">
              {canDeclareOpenClient && (
                <button
                  onClick={() => setShowSuitSelector("open")}
                  className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  Declare Open
                </button>
              )}
              {canDeclareDoubleOpenClient && (
                <button
                  onClick={() => setShowSuitSelector("doubleOpen")}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  Declare Double Open
                </button>
              )}
            </div>
          )}

          {showReshuffleButtonClient && (
            <div className="flex flex-col items-center mt-2 px-4">
              <button
                onClick={requestReshuffle}
                disabled={!canRequestReshuffleClient}
                className={
                  !canRequestReshuffleClient
                    ? "bg-gray-800 text-gray-500 text-xs px-4 py-2 rounded-lg cursor-not-allowed"
                    : "bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                }
              >
                Request Reshuffle
              </button>
              {reshuffleInlineError && (
                <p className="text-red-300 text-xs mt-1">{reshuffleInlineError}</p>
              )}
                {!reshuffleInlineError && reshuffleDisabledReason && (
                  <p className="text-gray-400 text-xs mt-1">{reshuffleDisabledReason}</p>
                )}
            </div>
          )}

          {/* No-active-suit banner: server will accept any card, tell the player */}
          {isMyTurn && activeSuit && !myHand.some((c) => c.suit === activeSuit) && (
            <p className="text-center text-amber-300 text-xs mt-1 font-medium">
              ⚠ No {getSuitName(activeSuit as Suit)} — play any card
            </p>
          )}

          {/* Turn hint */}
          {isMyTurn && !canDeclareOpenClient && !canDeclareDoubleOpenClient && (
            <p className="text-center text-yellow-400 text-xs mt-1">
              {selectedCardId
                ? "Tap the same card again to play it, or tap another to switch"
                : "Tap a card to select it, then tap again to play"}
            </p>
          )}
        </div>
      </div>

      {/* ── Paused overlay ──────────────────────────────────────────────────── */}
      {pausedPlayer && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center max-w-sm mx-4">
            <div className="text-4xl mb-3">⏸️</div>
            <h3 className="text-white text-lg mb-2">Game Paused</h3>
            <p className="text-gray-400 text-sm">
              Waiting for <span className="text-white">{pausedPlayer.name}</span> to reconnect...
            </p>
          </div>
        </div>
      )}

      {/* ── Trick winner overlay ─────────────────────────────────────────────── */}
      {lastTrickWinner && (
        <TrickWinnerOverlay
          winner={players.find((p) => p.id === lastTrickWinner.playerId)}
          isMe={lastTrickWinner.playerId === myPlayerId}
          onDismiss={dismissTrickWinner}
        />
      )}

      {/* ── Round result overlay ─────────────────────────────────────────────── */}
      {roundResult && (
        <RoundResultOverlay
          result={roundResult}
          totalScores={totalScores}
          onDismiss={dismissRoundResult}
        />
      )}

      {/* ── Waiting-for-next-round overlay ───────────────────────────────────── */}
      {/* Show when this player already dismissed the round result but not all   */}
      {/* 4 players have confirmed yet. Blocks interaction until server advances. */}
      {serverPhase === "round_end" && !roundResult && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl">
            <div className="text-5xl mb-4 animate-pulse">⏳</div>
            <h3 className="text-white text-lg font-semibold mb-2">Waiting for Players</h3>
            <p className="text-gray-400 text-sm">
              Waiting for all players to confirm before the next round starts…
            </p>
          </div>
        </div>
      )}

      {/* ── Suit selector modal ──────────────────────────────────────────────── */}
      {showSuitSelector && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="w-full max-w-xs">
            <SuitSelector
              title={showSuitSelector === "open" ? "Select Trump (Open)" : "Select Trump (Double Open)"}
              onSelect={(suit) => {
                if (showSuitSelector === "open") declareOpen(suit);
                else declareDoubleOpen(suit);
                setShowSuitSelector(null);
              }}
            />
            <button
              onClick={() => setShowSuitSelector(null)}
              className="w-full mt-2 text-gray-500 hover:text-gray-300 text-sm py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Error toast ─────────────────────────────────────────────────────── */}
      {lastError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-900 border border-red-700 rounded-lg px-4 py-2 flex items-center gap-2 shadow-xl">
            <span className="text-red-400">⚠</span>
            <span className="text-red-200 text-sm">{lastError}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-200 ml-1">✕</button>
          </div>
        </div>
      )}

      {/* ── Leave button ─────────────────────────────────────────────────────── */}
      <button
        onClick={leaveRoom}
        className="absolute top-12 right-3 text-gray-600 hover:text-gray-400 text-xs transition-colors z-10"
      >
        Leave
      </button>
    </div>
  );
}

// ─── My Hand ──────────────────────────────────────────────────────────────────

function MyHand({
  hand,
  selectedCardId,
  isMyTurn,
  isCardPlayable,
  onCardClick,
}: {
  hand: Card[];
  selectedCardId: string | null;
  isMyTurn: boolean;
  isCardPlayable: (card: Card) => boolean;
  onCardClick: (card: Card) => void;
}) {
  if (hand.length === 0) {
    return (
      <div className="flex justify-center">
        <p className="text-gray-600 text-xs py-2">No cards in hand</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-2 overflow-x-auto pb-1">
      <div className="flex gap-1 flex-wrap justify-center max-w-full">
        {hand.map((card) => {
          const playable = isCardPlayable(card);
          const selected = selectedCardId === card.id;
          return (
            <PlayingCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              selected={selected}
              playable={isMyTurn && playable}
              size="md"
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Trick Area ───────────────────────────────────────────────────────────────

function TrickArea({
  players,
  trickCards,
  myPlayerIndex,
  activeSuit,
  currentPlayerIndex,
}: {
  players: Player[];
  trickCards: any[];
  myPlayerIndex: number;
  activeSuit: string | null;
  currentPlayerIndex: number;
}) {
  const topIdx = (myPlayerIndex + 2) % 4;
  const rightIdx = (myPlayerIndex + 1) % 4;
  const leftIdx = (myPlayerIndex + 3) % 4;

  const getCardFor = (playerIndex: number) => {
    const p = players.find((pl) => pl.playerIndex === playerIndex);
    if (!p) return null;
    return trickCards.find((tc) => tc.playerId === p.id) || null;
  };

  const renderSlot = (playerIndex: number, label: string) => {
    const slot = getCardFor(playerIndex);
    const waiting = currentPlayerIndex === playerIndex && !slot?.card;

    return (
      <div className={`flex flex-col items-center gap-1`}>
        {slot?.card && !slot.hidden && !slot.dead ? (
          <PlayingCard card={slot.card} size="sm" />
        ) : slot?.hidden ? (
          <CardBack size="sm" />
        ) : (
          <div className={`
            w-10 h-14 rounded-lg border-2 flex items-center justify-center
            ${waiting ? "border-yellow-500/60 bg-yellow-900/20" : "border-gray-700/50 bg-gray-900/30"}
          `}>
            {waiting && <span className="text-yellow-600 text-xs">?</span>}
          </div>
        )}
        <span className="text-gray-500 text-xs truncate max-w-[60px] text-center">{label}</span>
      </div>
    );
  };

  const topPlayer = players.find((p) => p.playerIndex === topIdx);
  const rightPlayer = players.find((p) => p.playerIndex === rightIdx);
  const leftPlayer = players.find((p) => p.playerIndex === leftIdx);
  const me = players.find((p) => p.playerIndex === myPlayerIndex);
  const wastedCards = trickCards.filter((slot) => slot?.card && slot?.dead);

  return (
    <div className="relative flex flex-col items-center gap-2 w-56">
      {/* Active suit indicator */}
      {activeSuit && (
        <div className={`absolute -top-6 text-xs px-2 py-0.5 rounded ${isRedSuit(activeSuit) ? "bg-red-900/50 text-red-400" : "bg-gray-800 text-gray-400"}`}>
          Active: {getSuitSymbol(activeSuit)}
        </div>
      )}

      {/* Top */}
      <div>{renderSlot(topIdx, topPlayer?.name ?? `P${topIdx + 1}`)}</div>

      {/* Middle row */}
      <div className="flex items-center gap-4">
        <div>{renderSlot(leftIdx, leftPlayer?.name ?? `P${leftIdx + 1}`)}</div>
        {/* Center diamond */}
        <div className="w-8 h-8 rounded-full bg-green-800/50 border border-green-700/50 flex items-center justify-center">
          <span className="text-green-600 text-xs">🂠</span>
        </div>
        <div>{renderSlot(rightIdx, rightPlayer?.name ?? `P${rightIdx + 1}`)}</div>
      </div>

      {/* Bottom (me) */}
      <div>{renderSlot(myPlayerIndex, me?.name ?? "You")}</div>

      <WastedCardsArea cards={wastedCards.map((slot) => slot.card)} />
    </div>
  );
}

function WastedCardsArea({ cards }: { cards: Card[] }) {
  if (!cards.length) return null;

  return (
    <div className="mt-1 flex flex-col items-center gap-1">
      <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
        Wasted
      </div>
      <div className="flex items-center justify-center gap-1">
        {cards.map((card) => (
          <div key={card.id} className="opacity-55 grayscale">
            <PlayingCard card={card} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HiddenPileArea({
  cards,
  revealed,
}: {
  cards: Card[];
  revealed: boolean;
}) {
  if (!cards.length) return null;

  const visibleCards = cards.slice(-6);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
        Hidden pile
      </div>
      <div className="flex items-center justify-center min-h-16 px-2">
        <div className="relative flex items-center justify-center" style={{ width: `${Math.max(visibleCards.length, 1) * 18 + 56}px`, height: "64px" }}>
          {visibleCards.map((card, index) => {
            const offset = index - (visibleCards.length - 1) / 2;
            return (
              <div
                key={card.id}
                className="absolute transition-all duration-500"
                style={{
                  transform: `translateX(${offset * 16}px) translateY(${Math.abs(offset) * 1.5}px) rotate(${offset * 4}deg)`,
                  zIndex: index + 1,
                }}
              >
                {revealed ? (
                  <PlayingCard card={card} size="sm" className="shadow-lg" />
                ) : (
                  <CardBack size="sm" className="shadow-lg" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-[11px] text-gray-400">
        {cards.length} hidden card{cards.length === 1 ? "" : "s"}
        {revealed && <span className="ml-2 text-amber-300">revealed</span>}
      </div>
    </div>
  );
}

// ─── Opponent Panel ───────────────────────────────────────────────────────────

function OpponentPanel({
  player,
  isCurrentTurn,
  trickCard,
  position,
  showHiddenCard = false,
}: {
  player: Player;
  isCurrentTurn: boolean;
  trickCard: any;
  position: "top" | "left" | "right";
  showHiddenCard?: boolean;
}) {
  const handSize = player.handSize ?? 0;

  return (
    <div className={`
      flex gap-1.5 items-center rounded-xl px-2 py-1.5
      border transition-all
      ${isCurrentTurn
        ? "border-yellow-600/60 bg-yellow-900/20"
        : "border-gray-700/40 bg-gray-900/30"
      }
      ${position === "left" || position === "right" ? "flex-col" : ""}
    `}>
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${player.connected ? "bg-green-400" : "bg-red-400"}`} />
        <span className={`text-xs truncate max-w-[80px] ${isCurrentTurn ? "text-yellow-300" : "text-gray-300"}`}>
          {player.name}
        </span>
        {isCurrentTurn && <span className="text-yellow-400 text-xs">●</span>}
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-xs ${player.teamIndex === 0 ? "text-blue-400" : "text-orange-400"}`}>
          T{player.teamIndex + 1}
        </span>
        {handSize > 0 && (
          <span className="text-gray-600 text-xs">· {handSize}🃏</span>
        )}
      </div>
      {/* Face-down hidden card badge — all players can see the batter has a hidden card */}
      {showHiddenCard && (
        <div className="flex flex-col items-center gap-0.5 mt-0.5">
          <CardBack size="sm" />
          <span className="text-xs text-amber-400">Hidden</span>
        </div>
      )}
    </div>
  );
}

// ─── Score item ────────────────────────────────────────────────────────────────

function ScoreItem({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xs ${color}`}>{label}</p>
      <p className="text-white text-lg leading-none">{score}</p>
    </div>
  );
}

// ─── Trick Winner Overlay ─────────────────────────────────────────────────────

function TrickWinnerOverlay({
  winner,
  isMe,
  onDismiss,
}: {
  winner?: Player;
  isMe: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className={`
        px-6 py-4 rounded-2xl border text-center shadow-2xl
        pointer-events-auto cursor-pointer
        ${isMe
          ? "bg-green-900 border-green-600"
          : "bg-gray-900 border-gray-600"
        }
      `} onClick={onDismiss}>
        <p className="text-2xl mb-1">{isMe ? "🎉" : "🃏"}</p>
        <p className={`font-medium ${isMe ? "text-green-300" : "text-white"}`}>
          {isMe ? "You won the trick!" : `${winner?.name ?? "?"} won the trick`}
        </p>
      </div>
    </div>
  );
}

// ─── Round Result Overlay ─────────────────────────────────────────────────────

function RoundResultOverlay({
  result,
  totalScores,
  onDismiss,
}: {
  result: any;
  totalScores: [number, number];
  onDismiss: () => void;
}) {
  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-30"
      onClick={onDismiss}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl">
        <h3 className="text-white text-xl mb-4">Round Over</h3>

        {result.winnerTeam !== undefined && (
          <div className={`
            inline-block px-4 py-2 rounded-xl mb-4
            ${result.winnerTeam === 0
              ? "bg-blue-900/50 border border-blue-700 text-blue-300"
              : "bg-orange-900/50 border border-orange-700 text-orange-300"
            }
          `}>
            Team {result.winnerTeam + 1} wins this round!
          </div>
        )}

        <div className="flex gap-4 justify-center mb-4">
          <div className="text-center">
            <p className="text-blue-400 text-xs">Team 1</p>
            <p className="text-white text-2xl">{totalScores[0]}</p>
          </div>
          <div className="text-gray-600 self-center">:</div>
          <div className="text-center">
            <p className="text-orange-400 text-xs">Team 2</p>
            <p className="text-white text-2xl">{totalScores[1]}</p>
          </div>
        </div>

        <p className="text-gray-500 text-xs">Tap anywhere to continue</p>
      </div>
    </div>
  );
}
