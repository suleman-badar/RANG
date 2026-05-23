import { createRoom, joinRoom, getRoom, findPlayerBySocket, findPlayerById, consumePausedPhase, setPausedPhase, scheduleCleanupIfAllDisconnected, cancelCleanup, getBatterTeamIndex, getBowlingTeamIndex, computeBatterRotationOrder } from './rooms.js';

import { createDeck, shuffle } from './gameLogic/deck.js';
import { runTossStep } from './gameLogic/toss.js';
import { validatePlay, resolveTrick, checkConsecutiveWins, resetConsecutiveState } from './gameLogic/turnEngine.js';
import { revealTrump } from './gameLogic/trumpEngine.js';
import { canDeclareOpen, executeOpen, canDeclareDoubleOpen, executeDoubleOpen } from './gameLogic/openMode.js';
import { calculatePoints } from './gameLogic/scoring.js';
import { getNextBatterIndex, isGameOver } from './gameLogic/rotation.js';
import { getOpenContractTeam } from './gameLogic/openContract.js';

const readySetsByRoom = Object.create(null);

function emitError(socket, code, message) {
    socket.emit('error', { code, message });
}

function cardLabel(card) {
    if (!card) return null;
    return `${card.suit}-${card.value}`;
}

function logInvalidPlay(room, player, cardId, errorCode) {
    const attemptedCard = player.hand.find((c) => c.id === cardId) || null;
    const currentPlayer = room.players.find((p) => p.playerIndex === room.currentPlayerIndex) || null;
    const activeSuitCards = room.activeSuit ? player.hand.filter((c) => c.suit === room.activeSuit).map(cardLabel) : [];
    const payload = {
        code: errorCode,
        roomCode: room.roomCode,
        phase: room.phase,
        round: room.currentRound,
        turn: room.currentTurn,
        activeSuit: room.activeSuit,
        trumpRevealed: room.trumpRevealed,
        trumpSuit: room.trumpSuit,
        player: {
            id: player.id,
            name: player.name,
            playerIndex: player.playerIndex,
            teamIndex: player.teamIndex,
        },
        expectedTurn: currentPlayer
            ? {
                id: currentPlayer.id,
                name: currentPlayer.name,
                playerIndex: currentPlayer.playerIndex,
                teamIndex: currentPlayer.teamIndex,
            }
            : null,
        attemptedCard: cardLabel(attemptedCard),
        attemptedCardId: cardId,
        handSize: player.hand.length,
        handSuits: player.hand.map((c) => c.suit),
        activeSuitCards,
        trickCards: room.trickCards.map((slot) => ({
            playerId: slot.playerId,
            card: cardLabel(slot.card),
            hidden: !!slot.hidden,
            dead: !!slot.dead,
            playedAfterTrumpReveal: !!slot.playedAfterTrumpReveal,
        })),
    };

    console.warn(`Invalid play diagnostic ${JSON.stringify(payload)}`);
}

function playerDebugPayload(player) {
    if (!player) return null;
    return {
        id: player.id,
        name: player.name,
        playerIndex: player.playerIndex,
        teamIndex: player.teamIndex,
        connected: player.connected,
    };
}

function roomDebugPayload(room) {
    if (!room) return null;
    return {
        roomCode: room.roomCode,
        phase: room.phase,
        currentRound: room.currentRound,
        currentTurn: room.currentTurn,
        currentBatterIndex: room.currentBatterIndex,
        currentPlayerIndex: room.currentPlayerIndex,
        batterRoundsPlayed: room.batterRoundsPlayed,
        openCountForBatter: room.openCountForBatter,
        connectedCount: room.players.filter((p) => p.connected).length,
        playerCount: room.players.length,
    };
}

function logSocketRoomEvent(event, socket, room, player, extra = {}) {
    console.log(`Socket lifecycle ${JSON.stringify({
        event,
        socketId: socket.id,
        transport: socket.conn?.transport?.name || null,
        room: roomDebugPayload(room),
        player: playerDebugPayload(player),
        ...extra,
    })}`);
}

function roomPlayersPublic(room) {
    return room.players.map((p) => ({
        id: p.id,
        name: p.name,
        teamIndex: p.teamIndex,
        playerIndex: p.playerIndex,
        connected: p.connected,
        handSize: Array.isArray(p.hand) ? p.hand.length : 0,
    }));
}

function roomUpdatePayload(room) {
    return {
        roomCode: room.roomCode,
        hostSocketId: room.hostSocketId,
        phase: room.phase,
        players: roomPlayersPublic(room),
        tossWinnerId: room.tossWinnerId,
        currentBatterIndex: room.currentBatterIndex,
    };
}

function emitRoomUpdate(io, room) {
    io.to(room.roomCode).emit('room_update', roomUpdatePayload(room));
}

function playerCardCounts(room) {
    const counts = {};
    for (const p of room.players) counts[p.id] = p.hand.length;
    return counts;
}

function isHiddenBatterFor(room, player) {
    return player.playerIndex === room.currentBatterIndex && !room.trumpRevealed && !!room.hiddenCard;
}

function initTrickCards(room) {
    room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false, dead: false, playedAfterTrumpReveal: false }));
    room.trumpRevealedThisTrick = false;
}

function buildTrickCardsForViewer(room, viewerPlayerId) {
    return room.trickCards.map((slot) => {
        if (!slot.card) return { playerId: slot.playerId, card: null };
        if (room.trumpRevealed) return { playerId: slot.playerId, card: slot.card, dead: !!slot.dead };
        if (slot.hidden && slot.playerId !== viewerPlayerId) return { playerId: slot.playerId, card: null, hidden: true, dead: !!slot.dead };
        return { playerId: slot.playerId, card: slot.card, dead: !!slot.dead };
    });
}

function buildTrickResultCardsForViewer(room, viewerPlayerId) {
    return room.trickCards.map((slot) => {
        if (!slot.card) return { playerId: slot.playerId, card: null };
        if (room.trumpRevealed || !slot.hidden || slot.playerId === viewerPlayerId) {
            return { playerId: slot.playerId, card: slot.card, hidden: false, dead: !!slot.dead };
        }
        return { playerId: slot.playerId, card: slot.card, hidden: true, dead: !!slot.dead };
    });
}

function markDeadCardsAfterTrumpReveal(room) {
    for (const slot of room.trickCards) {
        if (!slot.card) continue;
        if (slot.playedAfterTrumpReveal) continue;
        if (slot.card.suit !== room.activeSuit) {
            slot.dead = true;
            slot.hidden = false;
        }
    }
}

function classifyPlayedCard(room, slot) {
    if (!slot.card || !room.activeSuit) return;
    if (!room.trumpRevealed) return;
    if (slot.card.suit === room.activeSuit) return;
    if (slot.card.suit === room.trumpSuit && slot.playedAfterTrumpReveal) return;
    slot.dead = true;
    slot.hidden = false;
}

function emitGameState(io, room) {
    for (const player of room.players) {
        if (!player.connected) continue;
        const payload = {
            players: roomPlayersPublic(room),
            phase: room.phase,
            currentTurn: room.currentTurn,
            currentRound: room.currentRound,
            currentBatterIndex: room.currentBatterIndex,
            currentPlayerIndex: room.currentPlayerIndex,
            activeSuit: room.activeSuit,
            trumpRevealed: room.trumpRevealed,
            trumpSuit: room.trumpRevealed ? room.trumpSuit : null,
            tossWinnerId: room.tossWinnerId,
            trickCards: buildTrickCardsForViewer(room, player.id),
            openMode: room.openMode,
            doubleOpenMode: room.doubleOpenMode,
            openDeclaredByTeam: room.openDeclaredByTeam,
            openDeclaredByPlayerId: room.openDeclaredByPlayerId,
            doubleOpenDeclaredByTeam: room.doubleOpenDeclaredByTeam,
            doubleOpenDeclaredByPlayerId: room.doubleOpenDeclaredByPlayerId,
            openCountForBatter: room.openCountForBatter,
            batterRoundsPlayed: room.batterRoundsPlayed,
            pausedForPlayerId: room.pausedForPlayerId || null,
            scores: { team0: room.totalScores[0], team1: room.totalScores[1] },
            playerCardCounts: playerCardCounts(room),
        };
        io.to(player.socketId).emit('game_state', payload);
    }
}

function emitDealHands(io, room) {
    for (const player of room.players) {
        if (!player.connected) continue;
        io.to(player.socketId).emit('deal_hand', {
            hand: player.hand,
            isHiddenBatter: isHiddenBatterFor(room, player),
        });
    }
}

function emitTrumpRevealed(io, room, hiddenCard) {
    for (const player of room.players) {
        if (!player.connected) continue;
        const payload = {
            trumpSuit: room.trumpSuit,
            hiddenCard,
        };
        if (player.playerIndex === room.currentBatterIndex) {
            payload.batterNewHand = room.players[room.currentBatterIndex].hand;
        }
        io.to(player.socketId).emit('trump_revealed', payload);
    }
}

function dealForRound(room) {
    room.phase = 'dealing';

    room.deck = shuffle(createDeck());
    for (const p of room.players) p.hand = [];

    // Deal 13 each, starting from batter clockwise.
    const start = room.currentBatterIndex;
    for (let dealt = 0; dealt < 13 * 4; dealt += 1) {
        const seat = (start + (dealt % 4)) % 4;
        room.players[seat].hand.push(room.deck.shift());
    }

    // Batter's 3rd card dealt is hidden
    const batter = room.players[room.currentBatterIndex];
    room.hiddenCard = batter.hand[2];
    batter.hand.splice(2, 1);

    // Reset round state
    room.trumpSuit = null;
    room.trumpRevealed = false;
    room.openMode = false;
    room.doubleOpenMode = false;
    room.openDeclaredByPlayerId = null;
    room.openDeclaredByTeam = null;
    room.doubleOpenDeclaredByPlayerId = null;
    room.doubleOpenDeclaredByTeam = null;

    room.currentTurn = 1;
    room.currentPlayerIndex = room.currentBatterIndex;
    room.activeSuit = null;
    room.trumpRevealedThisTrick = false;
    resetConsecutiveState(room);
    room.phase = 'open_window';

    initTrickCards(room);
}

function isReshuffleWindowOpen(room) {
    if (room.phase !== 'open_window') return false;
    if (room.currentTurn !== 1) return false;
    return true;
}

function canReshufflePlayer(player, room) {
    const relaxReshuffleRule = process.env.RANG_DEV_ALLOW_RESHUFFLE === '1';
    if (!relaxReshuffleRule) {
        if (player.playerIndex === room.currentBatterIndex) return { ok: false, code: 'RESHUFFLE_NOT_ELIGIBLE' };
        const hasFace = player.hand.some((c) => c.value === 11 || c.value === 12 || c.value === 13);
        if (hasFace) return { ok: false, code: 'RESHUFFLE_NOT_ELIGIBLE' };
        // Players can only reshuffle on their turn
        if (player.playerIndex !== room.currentPlayerIndex) return { ok: false, code: 'WRONG_TURN' };
    }
    if (!isReshuffleWindowOpen(room)) return { ok: false, code: 'RESHUFFLE_NOT_ELIGIBLE' };
    if (room.openMode || room.doubleOpenMode) return { ok: false, code: 'RESHUFFLE_NOT_ELIGIBLE' };
    const slot = room.trickCards.find((t) => t.playerId === player.id);
    if (slot && slot.card) return { ok: false, code: 'RESHUFFLE_NOT_ELIGIBLE' };
    return { ok: true };
}

function completeRound(io, room, winnerTeam, reason) {
    const { team0Points, team1Points } = calculatePoints(room, winnerTeam);
    room.totalScores[0] += team0Points;
    room.totalScores[1] += team1Points;
    room.roundScores.push({
        round: room.currentRound,
        winnerTeam,
        points: winnerTeam === 0 ? team0Points : team1Points,
    });
    room.batterRoundsPlayed += 1;

    room.phase = 'round_end';
    initTrickCards(room);
    room.activeSuit = null;

    delete readySetsByRoom[room.roomCode];
    io.to(room.roomCode).emit('round_result', {
        winnerTeam,
        pointsAwarded: winnerTeam === 0 ? team0Points : team1Points,
        reason,
        totalScores: { team0: room.totalScores[0], team1: room.totalScores[1] },
        roundScores: room.roundScores,
    });
    emitGameState(io, room);
}

function maybeAdvanceToNextRound(io, room) {
    const roundsAllowed = 3 + room.openCountForBatter;
    if (room.batterRoundsPlayed < roundsAllowed) {
        room.currentRound = room.batterRoundsPlayed + 1;
        dealForRound(room);
        emitDealHands(io, room);
        emitGameState(io, room);
        return;
    }

    room.battersCompleted += 1;
    if (isGameOver(room)) {
        room.phase = 'game_over';
        const winnerTeam = room.totalScores[0] === room.totalScores[1] ? 0 : room.totalScores[0] > room.totalScores[1] ? 0 : 1;
        io.to(room.roomCode).emit('game_over', {
            totalScores: { team0: room.totalScores[0], team1: room.totalScores[1] },
            winnerTeam,
            roundScores: room.roundScores,
        });
        emitGameState(io, room);
        return;
    }

    // Next batter anticlockwise.
    room.currentBatterIndex = getNextBatterIndex(room.currentBatterIndex);
    room.openCountForBatter = 0;
    room.batterRoundsPlayed = 0;
    room.currentRound = 1;
    dealForRound(room);
    emitDealHands(io, room);
    emitGameState(io, room);
}

function registerSocketHandlers(io, socket) {
    socket.on('disconnecting', (reason) => {
        const trackedRoomCode = socket.data.roomCode;
        const room = trackedRoomCode ? getRoom(trackedRoomCode) : null;
        const player = room ? findPlayerBySocket(room, socket.id) : null;
        logSocketRoomEvent('disconnecting', socket, room, player, {
            reason,
            socketRooms: Array.from(socket.rooms).filter((r) => r !== socket.id),
        });
    });

    socket.on('create_room', ({ playerName }) => {
        if (!playerName || typeof playerName !== 'string') {
            emitError(socket, 'INVALID_ACTION', 'playerName is required');
            return;
        }
        const { roomCode, player } = createRoom(playerName.trim(), socket.id);
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.emit('room_created', { roomCode, playerId: player.id, playerIndex: player.playerIndex });

        const room = getRoom(roomCode);
        const payload = roomUpdatePayload(room);
        logSocketRoomEvent('create_room', socket, room, player);
        socket.emit('room_update', payload);
        io.to(room.roomCode).except(socket.id).emit('room_update', payload);
        initTrickCards(room);
        emitGameState(io, room);
    });

    socket.on('join_room', ({ roomCode, playerName, playerId }) => {
        if (!roomCode || typeof roomCode !== 'string') {
            emitError(socket, 'ROOM_NOT_FOUND', 'roomCode is required');
            return;
        }
        if (!playerName || typeof playerName !== 'string') {
            emitError(socket, 'INVALID_ACTION', 'playerName is required');
            return;
        }

        const joined = joinRoom(roomCode.trim().toUpperCase(), playerName.trim(), socket.id, typeof playerId === 'string' ? playerId : null);
        if (joined.errorCode) {
            emitError(socket, joined.errorCode, joined.message || 'Unable to join room');
            return;
        }

        const { room, player, reconnected } = joined;
        socket.join(room.roomCode);
        socket.data.roomCode = room.roomCode;
        logSocketRoomEvent('join_room', socket, room, player, { reconnected: !!reconnected });

        socket.emit('joined_room', { roomCode: room.roomCode, playerId: player.id, reconnected: !!reconnected });
        const payload = roomUpdatePayload(room);
        // Ensure the joining socket gets the update even if room join is not applied yet
        socket.emit('room_update', payload);
        io.to(room.roomCode).except(socket.id).emit('room_update', payload);

        if (reconnected) {
            io.to(room.roomCode).except(socket.id).emit('player_reconnected', { playerId: player.id });

            // Resend private hand
            io.to(player.socketId).emit('deal_hand', {
                hand: player.hand,
                isHiddenBatter: isHiddenBatterFor(room, player),
            });

            // Restore phase if we were waiting
            if (room.phase === 'waiting_for_reconnect' && room.pausedForPlayerId === player.id) {
                const prev = consumePausedPhase(room.roomCode);
                room.phase = prev || 'playing';
                room.pausedForPlayerId = null;
            }

            emitGameState(io, room);
        } else {
            emitGameState(io, room);
        }
    });

    socket.on('start_game', ({ roomCode }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        if (room.hostSocketId !== socket.id) {
            emitError(socket, 'NOT_HOST', 'Only host can start the game');
            return;
        }
        if (room.players.length !== 4) {
            emitError(socket, 'INVALID_ACTION', 'Need exactly 4 players to start');
            return;
        }
        room.phase = 'toss';
        room.tossDeck = shuffle(createDeck());
        room.tossCards = [];
        room.tossWinnerId = null;

        // Deal publicly until first Ace
        while (room.tossDeck.length > 0) {
            const step = runTossStep(room);
            io.to(room.roomCode).emit('toss_card', { card: step.card, recipientPlayerId: step.recipientPlayerId });
            if (step.isAce) {
                room.tossWinnerId = step.recipientPlayerId;
                room.phase = 'batter_select';
                io.to(room.roomCode).emit('toss_result', { winnerPlayerId: room.tossWinnerId });
                emitGameState(io, room);
                return;
            }
        }

        emitError(socket, 'INVALID_ACTION', 'Toss deck exhausted unexpectedly');
    });

    socket.on('select_batter', ({ roomCode, targetPlayerId }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        const caller = findPlayerBySocket(room, socket.id);
        if (!caller) {
            emitError(socket, 'INVALID_ACTION', 'Player not in room');
            return;
        }
        if (room.phase !== 'batter_select') {
            emitError(socket, 'INVALID_ACTION', 'Not in batter selection phase');
            return;
        }
        if (caller.id !== room.tossWinnerId) {
            emitError(socket, 'INVALID_ACTION', 'Only toss winner can select batter');
            return;
        }
        const target = findPlayerById(room, targetPlayerId);
        if (!target) {
            emitError(socket, 'INVALID_ACTION', 'Invalid target player');
            return;
        }

        room.currentBatterIndex = target.playerIndex;
        room.batterRotationOrder = computeBatterRotationOrder(room.currentBatterIndex);
        room.battersCompleted = 0;
        room.totalScores = [0, 0];
        room.roundScores = [];
        room.openCountForBatter = 0;
        room.batterRoundsPlayed = 0;
        room.currentRound = 1;

        dealForRound(room);
        emitDealHands(io, room);
        emitRoomUpdate(io, room);
        emitGameState(io, room);
    });

    socket.on('request_reshuffle', ({ roomCode }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        if (room.players.length !== 4) {
            emitError(socket, 'INVALID_ACTION', 'Need exactly 4 players to reshuffle');
            return;
        }
        const player = findPlayerBySocket(room, socket.id);
        if (!player) {
            emitError(socket, 'INVALID_ACTION', 'Player not in room');
            return;
        }
        const eligible = canReshufflePlayer(player, room);
        if (!eligible.ok) {
            emitError(socket, eligible.code, 'Reshuffle not eligible');
            return;
        }

        // Redeal to same batter.
        dealForRound(room);
        emitDealHands(io, room);
        emitGameState(io, room);
    });

    socket.on('declare_open', ({ roomCode, trumpSuit }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        const player = findPlayerBySocket(room, socket.id);
        if (!player) {
            emitError(socket, 'INVALID_ACTION', 'Player not in room');
            return;
        }
        if (room.phase === 'waiting_for_reconnect') {
            emitError(socket, 'INVALID_ACTION', 'Game paused for reconnect');
            return;
        }

        const can = canDeclareOpen(room, player.id);
        if (!can.valid) {
            emitError(socket, can.errorCode, 'Cannot declare open');
            return;
        }
        const res = executeOpen(room, player.id, trumpSuit);
        if (!res.ok) {
            emitError(socket, res.errorCode, 'Cannot execute open');
            return;
        }
        emitDealHands(io, room);
        emitGameState(io, room);
    });

    socket.on('declare_double_open', ({ roomCode, trumpSuit }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        const player = findPlayerBySocket(room, socket.id);
        if (!player) {
            emitError(socket, 'INVALID_ACTION', 'Player not in room');
            return;
        }
        if (room.phase === 'waiting_for_reconnect') {
            emitError(socket, 'INVALID_ACTION', 'Game paused for reconnect');
            return;
        }

        const can = canDeclareDoubleOpen(room, player.id);
        if (!can.valid) {
            emitError(socket, can.errorCode, 'Cannot declare double-open');
            return;
        }
        const res = executeDoubleOpen(room, player.id, trumpSuit);
        if (!res.ok) {
            emitError(socket, res.errorCode, 'Cannot execute double-open');
            return;
        }
        emitDealHands(io, room);
        emitGameState(io, room);
    });

    socket.on('play_card', ({ roomCode, cardId }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        const player = findPlayerBySocket(room, socket.id);
        if (!player) {
            emitError(socket, 'INVALID_ACTION', 'Player not in room');
            return;
        }

        if (room.phase === 'waiting_for_reconnect') {
            emitError(socket, 'INVALID_ACTION', 'Game paused for reconnect');
            return;
        }
        if (room.phase === 'lobby' || room.phase === 'toss' || room.phase === 'batter_select' || room.phase === 'dealing' || room.phase === 'round_end' || room.phase === 'game_over') {
            emitError(socket, 'INVALID_ACTION', 'Cannot play card in this phase');
            return;
        }

        // Turn + card + suit validation
        const check = validatePlay(room, player.id, cardId);
        if (!check.valid) {
            emitError(socket, check.errorCode, 'Invalid play');
            logInvalidPlay(room, player, cardId, check.errorCode);
            return;
        }

        const cardIdx = player.hand.findIndex((c) => c.id === cardId);
        const card = player.hand[cardIdx];

        // Apply play.
        player.hand.splice(cardIdx, 1);
        if (!room.activeSuit) room.activeSuit = card.suit;

        const slot = room.trickCards.find((t) => t.playerId === player.id);
        slot.card = card;
        slot.playedAfterTrumpReveal = room.trumpRevealed;
        slot.dead = false;
        const hideUntilTrumpRevealed = !room.trumpRevealed
            && player.playerIndex === room.currentBatterIndex
            && room.activeSuit
            && card.suit !== room.activeSuit;
        slot.hidden = hideUntilTrumpRevealed;
        classifyPlayedCard(room, slot);
        const playedCardsInTrick = room.trickCards.filter((t) => t.card).length;

        // Advance to next seat within the trick
        room.currentPlayerIndex = (room.currentPlayerIndex + 3) % 4;

        const nextPlayer = room.players[room.currentPlayerIndex];
        if (playedCardsInTrick < 4 && !room.trumpRevealed && room.activeSuit && nextPlayer) {
            const bowlingTeam = getBowlingTeamIndex(room);
            const hasActiveSuit = nextPlayer.hand.some((c) => c.suit === room.activeSuit);
            if (nextPlayer.teamIndex === bowlingTeam && !hasActiveSuit) {
                const hidden = revealTrump(room);
                if (hidden) {
                    room.trumpRevealedThisTrick = true;
                    markDeadCardsAfterTrumpReveal(room);
                    emitTrumpRevealed(io, room, hidden);
                }
            }
        }

        emitGameState(io, room);

        const trick = resolveTrick(room);
        if (!trick) return;

        // Determine winner & broadcast each player's allowed trick view.
        const winner = room.players.find((p) => p.id === trick.winnerPlayerId);
        const winnerTeam = winner ? winner.teamIndex : 0;

        let consecutiveCheck;
        if (room.trumpRevealedThisTrick) {
            resetConsecutiveState(room);
            consecutiveCheck = { roundOver: false };
        } else {
            consecutiveCheck = checkConsecutiveWins(room, trick.winnerPlayerId, trick.winningCard, {
                winningCardWasTrumpCut: trick.winningCardWasTrumpCut,
            });
        }

        const isExcludedOpenTurn1 = (room.openMode || room.doubleOpenMode) && room.currentTurn === 1;

        for (const viewer of room.players) {
            if (!viewer.connected) continue;
            io.to(viewer.socketId).emit('trick_result', {
                winnerPlayerId: trick.winnerPlayerId,
                trickCards: buildTrickResultCardsForViewer(room, viewer.id),
                consecutiveBowlingWins: room.consecutiveBowlingWins,
            });
        }

        // Round completion rules
        const battingTeamIndex = getBatterTeamIndex(room);
        const alphaTeam = room.openMode || room.doubleOpenMode ? getOpenContractTeam(room) : null;
        const defaultWinnerNormal = battingTeamIndex;
        const defaultWinnerOpen = alphaTeam === null ? battingTeamIndex : alphaTeam;

        if (consecutiveCheck.roundOver) {
            completeRound(io, room, consecutiveCheck.winnerTeam, consecutiveCheck.reason);
            return;
        }

        if (room.currentTurn === 13) {
            if (room.openMode || room.doubleOpenMode) {
                completeRound(io, room, defaultWinnerOpen, 'tricks_completed');
            } else {
                completeRound(io, room, defaultWinnerNormal, 'tricks_completed');
            }
            return;
        }

        // Continue to next turn
        room.currentTurn += 1;
        room.activeSuit = null;
        initTrickCards(room);
        room.currentPlayerIndex = trick.winnerPlayerIndex;

        if (room.phase === 'open_window' && room.currentTurn > 1) room.phase = 'playing';
        emitGameState(io, room);
    });

    socket.on('ready_next_round', ({ roomCode }) => {
        const room = getRoom((roomCode || '').trim().toUpperCase());
        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
            return;
        }
        const player = findPlayerBySocket(room, socket.id);
        if (!player) {
            emitError(socket, 'INVALID_ACTION', 'Player not in room');
            return;
        }
        if (room.phase !== 'round_end') {
            emitError(socket, 'INVALID_ACTION', 'Not in round end');
            return;
        }

        if (!readySetsByRoom[room.roomCode]) readySetsByRoom[room.roomCode] = new Set();
        readySetsByRoom[room.roomCode].add(player.id);
        if (readySetsByRoom[room.roomCode].size >= 4) {
            delete readySetsByRoom[room.roomCode];
            maybeAdvanceToNextRound(io, room);
        }
    });

    socket.on('disconnect', (reason) => {
        const trackedRoomCode = socket.data.roomCode;
        const room = trackedRoomCode ? getRoom(trackedRoomCode) : null;
        if (room) {
            const player = findPlayerBySocket(room, socket.id);
            logSocketRoomEvent('disconnect', socket, room, player, { reason, trackedRoomCode });
            if (player) {
                player.connected = false;
                io.to(room.roomCode).emit('player_disconnected', { playerId: player.id });
                emitRoomUpdate(io, room);

                if (player.playerIndex === room.currentPlayerIndex && room.phase !== 'lobby' && room.phase !== 'round_end' && room.phase !== 'game_over') {
                    setPausedPhase(room.roomCode, room.phase);
                    room.phase = 'waiting_for_reconnect';
                    room.pausedForPlayerId = player.id;
                    emitGameState(io, room);
                }

                scheduleCleanupIfAllDisconnected(room);
            }
            return;
        }

        // Fallback: scan rooms this socket was in
        const roomCodes = Array.from(socket.rooms).filter((r) => r !== socket.id);
        for (const roomCode of roomCodes) {
            const r = getRoom(roomCode);
            if (!r) continue;
            const player = findPlayerBySocket(r, socket.id);
            if (!player) continue;
            logSocketRoomEvent('disconnect_fallback', socket, r, player, { reason, roomCode });
            player.connected = false;
            io.to(r.roomCode).emit('player_disconnected', { playerId: player.id });
            emitRoomUpdate(io, r);
            scheduleCleanupIfAllDisconnected(r);
        }
    });
}

export { registerSocketHandlers };
