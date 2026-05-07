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
});
