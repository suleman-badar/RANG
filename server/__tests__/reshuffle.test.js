import { registerSocketHandlers } from '../socketHandlers.js';
import { createRoom, getRoom, joinRoom } from '../rooms.js';

function createMockSocket(socketId) {
    const handlers = new Map();
    const emitted = [];

    return {
        id: socketId,
        data: {},
        rooms: new Set([socketId]),
        on(event, cb) {
            handlers.set(event, cb);
        },
        emit(event, payload) {
            emitted.push({ event, payload });
        },
        join(roomCode) {
            this.rooms.add(roomCode);
        },
        getHandler(event) {
            return handlers.get(event);
        },
        getEmitted() {
            return emitted;
        },
    };
}

function createMockIo() {
    return {
        to() {
            return {
                emit() { },
                except() {
                    return { emit() { } };
                },
            };
        },
    };
}

describe('request_reshuffle turn enforcement', () => {
    test('prevents reshuffle when not your turn', () => {
        const io = createMockIo();

        // Create room + two players.
        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);
        expect(room).toBeTruthy();

        // Add players 2-4.
        const p2SocketId = 's-p2';
        const j2 = joinRoom(roomCode, 'P2', p2SocketId, null);
        expect(j2.errorCode).toBeUndefined();

        const p3SocketId = 's-p3';
        const j3 = joinRoom(roomCode, 'P3', p3SocketId, null);
        expect(j3.errorCode).toBeUndefined();

        const p4SocketId = 's-p4';
        const j4 = joinRoom(roomCode, 'P4', p4SocketId, null);
        expect(j4.errorCode).toBeUndefined();

        // Prepare reshuffle window state.
        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 0; // Host's turn, not P2's.
        room.activeSuit = null;
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));

        // Give P2 a hand with no face cards.
        const p2 = room.players.find((p) => p.name === 'P2');
        p2.hand = [
            { suit: 'H', value: 2, id: 'H-2' },
            { suit: 'D', value: 3, id: 'D-3' },
            { suit: 'S', value: 10, id: 'S-10' },
        ];

        const socket = createMockSocket(p2SocketId);
        registerSocketHandlers(io, socket);

        const handler = socket.getHandler('request_reshuffle');
        expect(typeof handler).toBe('function');

        handler({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toHaveLength(1);
        expect(errorEmits[0].payload.code).toBe('WRONG_TURN');
    });

    test('allows reshuffle when it is your turn', () => {
        const io = createMockIo();

        // Create room + two players.
        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);
        expect(room).toBeTruthy();

        // Add players 2-4.
        const p2SocketId = 's-p2';
        const j2 = joinRoom(roomCode, 'P2', p2SocketId, null);
        expect(j2.errorCode).toBeUndefined();

        const p3SocketId = 's-p3';
        const j3 = joinRoom(roomCode, 'P3', p3SocketId, null);
        expect(j3.errorCode).toBeUndefined();

        const p4SocketId = 's-p4';
        const j4 = joinRoom(roomCode, 'P4', p4SocketId, null);
        expect(j4.errorCode).toBeUndefined();

        // Prepare reshuffle window state with P2's turn.
        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 1; // P2's turn.
        room.activeSuit = null;
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));

        // Give P2 a hand with no face cards.
        const p2 = room.players.find((p) => p.name === 'P2');
        p2.hand = [
            { suit: 'H', value: 2, id: 'H-2' },
            { suit: 'D', value: 3, id: 'D-3' },
            { suit: 'S', value: 10, id: 'S-10' },
        ];

        const socket = createMockSocket(p2SocketId);
        registerSocketHandlers(io, socket);

        const handler = socket.getHandler('request_reshuffle');
        expect(typeof handler).toBe('function');

        handler({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toEqual([]);
    });

    test('allows reshuffle with an Ace when player has no J, Q, or K', () => {
        const io = createMockIo();

        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);

        const p2SocketId = 's-p2';
        joinRoom(roomCode, 'P2', p2SocketId, null);
        joinRoom(roomCode, 'P3', 's-p3', null);
        joinRoom(roomCode, 'P4', 's-p4', null);

        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 1;
        room.activeSuit = null;
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));

        const p2 = room.players.find((p) => p.name === 'P2');
        p2.hand = [
            { suit: 'H', value: 14, id: 'H-14' },
            { suit: 'D', value: 3, id: 'D-3' },
            { suit: 'S', value: 10, id: 'S-10' },
        ];

        const socket = createMockSocket(p2SocketId);
        registerSocketHandlers(io, socket);

        socket.getHandler('request_reshuffle')({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toEqual([]);
    });

    test('allows reshuffle with three Aces during the first trick after the batter has led', () => {
        const io = createMockIo();

        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);

        joinRoom(roomCode, 'P2', 's-p2', null);
        joinRoom(roomCode, 'P3', 's-p3', null);
        const p4SocketId = 's-p4';
        joinRoom(roomCode, 'P4', p4SocketId, null);

        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 3;
        room.activeSuit = 'S';
        room.trumpRevealed = false;
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));
        room.trickCards[0].card = { suit: 'S', value: 9, id: 'S-9' };

        const p4 = room.players.find((p) => p.name === 'P4');
        p4.hand = [
            { suit: 'H', value: 14, id: 'H-14' },
            { suit: 'D', value: 14, id: 'D-14' },
            { suit: 'C', value: 14, id: 'C-14' },
        ];

        const socket = createMockSocket(p4SocketId);
        registerSocketHandlers(io, socket);

        socket.getHandler('request_reshuffle')({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toEqual([]);
    });

    test('allows reshuffle on current turn even if trump was revealed during the first trick', () => {
        const io = createMockIo();

        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);

        joinRoom(roomCode, 'P2', 's-p2', null);
        const p3SocketId = 's-p3';
        joinRoom(roomCode, 'P3', p3SocketId, null);
        joinRoom(roomCode, 'P4', 's-p4', null);

        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 2;
        room.activeSuit = 'S';
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));
        room.trickCards[0].card = { suit: 'S', value: 9, id: 'S-9' };
        room.trickCards[1].card = { suit: 'S', value: 10, id: 'S-10' };

        const p3 = room.players.find((p) => p.name === 'P3');
        p3.hand = [
            { suit: 'H', value: 14, id: 'H-14' },
            { suit: 'D', value: 14, id: 'D-14' },
            { suit: 'C', value: 14, id: 'C-14' },
        ];

        const socket = createMockSocket(p3SocketId);
        registerSocketHandlers(io, socket);

        socket.getHandler('request_reshuffle')({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toEqual([]);
    });

    test('rejects reshuffle if player has J, Q, or K', () => {
        const io = createMockIo();

        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);

        const p2SocketId = 's-p2';
        joinRoom(roomCode, 'P2', p2SocketId, null);
        joinRoom(roomCode, 'P3', 's-p3', null);
        joinRoom(roomCode, 'P4', 's-p4', null);

        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 1;
        room.activeSuit = null;
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));

        const p2 = room.players.find((p) => p.name === 'P2');
        p2.hand = [
            { suit: 'H', value: 11, id: 'H-11' },
            { suit: 'D', value: 3, id: 'D-3' },
            { suit: 'S', value: 10, id: 'S-10' },
        ];

        const socket = createMockSocket(p2SocketId);
        registerSocketHandlers(io, socket);

        socket.getHandler('request_reshuffle')({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toHaveLength(1);
        expect(errorEmits[0].payload.code).toBe('RESHUFFLE_NOT_ELIGIBLE');
    });

    test('rejects reshuffle from the hidden trump holder even with no J, Q, or K', () => {
        const io = createMockIo();

        const hostSocketId = 's-host';
        const { roomCode } = createRoom('Host', hostSocketId);
        const room = getRoom(roomCode);

        joinRoom(roomCode, 'P2', 's-p2', null);
        joinRoom(roomCode, 'P3', 's-p3', null);
        joinRoom(roomCode, 'P4', 's-p4', null);

        room.phase = 'open_window';
        room.currentTurn = 1;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 0;
        room.activeSuit = null;
        room.trickCards = room.players.map((p) => ({ playerId: p.id, card: null, hidden: false }));

        const host = room.players.find((p) => p.name === 'Host');
        host.hand = [
            { suit: 'H', value: 14, id: 'H-14' },
            { suit: 'D', value: 3, id: 'D-3' },
            { suit: 'S', value: 10, id: 'S-10' },
        ];

        const socket = createMockSocket(hostSocketId);
        registerSocketHandlers(io, socket);

        socket.getHandler('request_reshuffle')({ roomCode });

        const errorEmits = socket.getEmitted().filter((e) => e.event === 'error');
        expect(errorEmits).toHaveLength(1);
        expect(errorEmits[0].payload.code).toBe('RESHUFFLE_NOT_ELIGIBLE');
    });
});
