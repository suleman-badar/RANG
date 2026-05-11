import crypto from 'crypto'; //for random UUID generation

const rooms = {};
const cleanupTimers = {};
const pausedPhaseByRoom = {};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function buildInitialRoomState(roomCode, hostSocketId) {
    return {
        roomCode,
        hostSocketId,
        phase: 'lobby',

        players: [],

        // Toss
        tossDeck: [],
        tossCards: [],
        tossWinnerId: null,

        // Dealing
        deck: [],
        currentBatterIndex: 0,
        batterRotationOrder: [],
        battersCompleted: 0,

        // Hidden card & trump
        hiddenCard: null,
        trumpSuit: null,
        trumpRevealed: false,

        // Round state
        currentRound: 1,
        currentTurn: 1,
        currentPlayerIndex: 0,
        activeSuit: null,
        trickCards: [],
        lastTrickWinnerPlayerId: null,
        consecutiveBowlingWins: 0,
        lastTrickWasAce: false,
        batterRoundsPlayed: 0,
        openCountForBatter: 0,

        // Open mode
        openMode: false,
        doubleOpenMode: false,
        openDeclaredByPlayerId: null,
        openDeclaredByTeam: null,

        // Scoring
        roundScores: [],
        totalScores: [0, 0],

        // Reconnect
        pausedForPlayerId: null,
        roomCreatedAt: new Date(),
    };
}

function createPlayer(playerName, socketId, playerIndex) {
    const id = crypto.randomUUID();
    return {
        id,
        name: playerName,
        socketId,
        teamIndex: playerIndex % 2,
        playerIndex,
        hand: [],
        connected: true,
    };
}

function createRoom(playerName, socketId) {
    let roomCode = generateRoomCode();
    while (rooms[roomCode]) roomCode = generateRoomCode();

    const room = buildInitialRoomState(roomCode, socketId);
    const hostPlayer = createPlayer(playerName, socketId, 0);
    room.players.push(hostPlayer);

    rooms[roomCode] = room;
    return { roomCode, player: hostPlayer };
}

function getRoom(roomCode) {
    // console.log(`Getting room ${roomCode}:`, rooms[roomCode]);
    return rooms[roomCode] || null;
}

function deleteRoom(roomCode) {
    // console.log(`Deleting room ${roomCode}`);
    if (cleanupTimers[roomCode]) {
        clearTimeout(cleanupTimers[roomCode]);
        delete cleanupTimers[roomCode];
    }
    delete pausedPhaseByRoom[roomCode];
    delete rooms[roomCode];
}

function cancelCleanup(roomCode) {
    if (cleanupTimers[roomCode]) {
        clearTimeout(cleanupTimers[roomCode]);
        delete cleanupTimers[roomCode];
    }
}

//delete room if all players are disconnected for 30 minutes or immediately if game is already over
function scheduleCleanupIfAllDisconnected(room) {
    const roomCode = room.roomCode;
    const allDisconnected = room.players.length > 0 && room.players.every((p) => !p.connected);
    if (!allDisconnected) {
        cancelCleanup(roomCode);
        return;
    }

    if (room.phase === 'game_over') {
        deleteRoom(roomCode);
        return;
    }

    if (cleanupTimers[roomCode]) return;

    cleanupTimers[roomCode] = setTimeout(() => {
        const stillThere = rooms[roomCode];
        if (!stillThere) return;
        const stillAllDisconnected = stillThere.players.length > 0 && stillThere.players.every((p) => !p.connected);
        if (stillAllDisconnected) deleteRoom(roomCode);
    }, 30 * 60 * 1000);
}

function setPausedPhase(roomCode, phase) {
    pausedPhaseByRoom[roomCode] = phase;
}

function consumePausedPhase(roomCode) {
    const p = pausedPhaseByRoom[roomCode] || null;
    delete pausedPhaseByRoom[roomCode];
    return p;
}

function joinRoom(roomCode, playerName, socketId, playerId) {
    const room = rooms[roomCode];
    if (!room) return { errorCode: 'ROOM NOT FOUND' };

    cancelCleanup(roomCode);

    if (playerId) {
        const existingById = room.players.find((p) => p.id === playerId);
        if (!existingById) {
            return { errorCode: 'INVALID ACTION', message: 'Unknown playerId for this room.' };
        }
        if (existingById.name !== playerName) {
            return { errorCode: 'INVALID ACTION', message: 'playerId does not match playerName.' };
        }

        existingById.socketId = socketId;
        existingById.connected = true;
        return { room, player: existingById, reconnected: true };
    }

    const existingByName = room.players.find((p) => p.name === playerName);
    if (existingByName) {
        if (existingByName.connected) {
            return { errorCode: 'INVALID ACTION', message: 'Player name already connected in this room.' };
        }

        existingByName.socketId = socketId;
        existingByName.connected = true;
        return { room, player: existingByName, reconnected: true };
    }

    if (room.players.length >= 4) return { errorCode: 'ROOM FULL' };
    const newPlayer = createPlayer(playerName, socketId, room.players.length);
    room.players.push(newPlayer);
    return { room, player: newPlayer, reconnected: false };
}

function findPlayerBySocket(room, socketId) {
    return room.players.find((p) => p.socketId === socketId) || null;
}

function findPlayerById(room, playerId) {
    return room.players.find((p) => p.id === playerId) || null;
}

function getBatterTeamIndex(room) {
    return room.currentBatterIndex % 2;
}

function getBowlingTeamIndex(room) {
    return 1 - getBatterTeamIndex(room);
}

function computeBatterRotationOrder(initialBatterIndex) {
    const order = [initialBatterIndex];
    let cur = initialBatterIndex;
    for (let i = 1; i < 4; ++i) {
        cur = (cur + 3) % 4;
        order.push(cur);
    }
    return order;
}

export {
    createRoom,
    joinRoom,
    getRoom,
    deleteRoom,
    findPlayerBySocket,
    findPlayerById,
    scheduleCleanupIfAllDisconnected,
    setPausedPhase,
    consumePausedPhase,
    getBatterTeamIndex,
    getBowlingTeamIndex,
    computeBatterRotationOrder,
    cancelCleanup,
};

//TODO: Remove the reconnecting logic