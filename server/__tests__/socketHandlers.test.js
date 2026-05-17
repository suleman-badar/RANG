import { registerSocketHandlers } from '../socketHandlers.js';
import { createRoom, getRoom, joinRoom } from '../rooms.js';

function createMockSocket(socketId) {
    const handlers = new Map();
    const emitted = [];

    return {
        id: socketId,
        data: {},
        rooms: new Set([socketId]),
        conn: { transport: { name: 'websocket' } },
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
    const emitted = [];
    return {
        emitted,
        to(target) {
            return {
                emit(event, payload) {
                    emitted.push({ target, event, payload });
                },
                except() {
                    return {
                        emit(event, payload) {
                            emitted.push({ target, event, payload, except: true });
                        },
                    };
                },
            };
        },
    };
}

describe('socketHandlers trump reveal timing', () => {
    test('does not reveal trump after the fourth card by inspecting the next trick player', () => {
        const io = createMockIo();

        const { roomCode } = createRoom('Host', 's-host');
        joinRoom(roomCode, 'P2', 's-p2', null);
        joinRoom(roomCode, 'P3', 's-p3', null);
        joinRoom(roomCode, 'P4', 's-p4', null);
        const room = getRoom(roomCode);

        room.phase = 'playing';
        room.currentTurn = 4;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 2;
        room.activeSuit = 'S';
        room.trumpRevealed = false;
        room.trumpSuit = null;
        room.hiddenCard = { suit: 'H', value: 7, id: 'H-7' };
        room.trumpRevealedThisTrick = false;
        room.lastTrickWinnerPlayerId = null;
        room.consecutiveBowlingWins = 0;
        room.consecutiveWinBanked = false;
        room.lastTrickWasAce = false;

        room.players[0].hand = [];
        room.players[1].hand = [{ suit: 'D', value: 4, id: 'D-4' }];
        room.players[2].hand = [{ suit: 'S', value: 12, id: 'S-12' }];
        room.players[3].hand = [];

        room.trickCards = [
            { playerId: room.players[0].id, card: { suit: 'S', value: 9, id: 'S-9' }, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: room.players[1].id, card: { suit: 'S', value: 10, id: 'S-10' }, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: room.players[2].id, card: null, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: room.players[3].id, card: { suit: 'S', value: 11, id: 'S-11' }, hidden: false, dead: false, playedAfterTrumpReveal: false },
        ];

        const socket = createMockSocket('s-p3');
        registerSocketHandlers(io, socket);

        socket.getHandler('play_card')({ roomCode, cardId: 'S-12' });

        expect(room.trumpRevealed).toBe(false);
        expect(room.trumpSuit).toBe(null);
        expect(room.hiddenCard).toEqual({ suit: 'H', value: 7, id: 'H-7' });
        expect(room.trumpRevealedThisTrick).toBe(false);
        expect(io.emitted.filter((e) => e.event === 'trump_revealed')).toEqual([]);
    });
});
