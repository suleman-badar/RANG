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

    test('does not count a reveal trick won by active suit toward the next same-player bowling win', () => {
        const io = createMockIo();

        const { roomCode } = createRoom('Host', 's-p0');
        joinRoom(roomCode, 'P2', 's-p1', null);
        joinRoom(roomCode, 'P3', 's-p2', null);
        joinRoom(roomCode, 'P4', 's-p3', null);
        const room = getRoom(roomCode);
        const sockets = room.players.map((player) => {
            const socket = createMockSocket(player.socketId);
            registerSocketHandlers(io, socket);
            return socket;
        });

        room.phase = 'playing';
        room.currentTurn = 4;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 0;
        room.activeSuit = null;
        room.trumpRevealed = false;
        room.trumpSuit = null;
        room.hiddenCard = { suit: 'H', value: 7, id: 'H-7' };
        room.trumpRevealedThisTrick = false;
        room.lastTrickWinnerPlayerId = null;
        room.consecutiveBowlingWins = 0;
        room.consecutiveWinBanked = false;
        room.lastTrickWasAce = false;
        room.lastTrickWasTrumpCutAce = false;
        room.openMode = false;
        room.doubleOpenMode = false;
        room.openDeclaredByTeam = null;

        room.players[0].hand = [
            { suit: 'S', value: 10, id: 'P0-S-10' },
            { suit: 'C', value: 10, id: 'P0-C-10' },
            { suit: 'C', value: 9, id: 'P0-C-9' },
        ];
        room.players[1].hand = [
            { suit: 'S', value: 13, id: 'P1-S-13' },
            { suit: 'C', value: 14, id: 'P1-C-14' },
            { suit: 'C', value: 13, id: 'P1-C-13' },
        ];
        room.players[2].hand = [
            { suit: 'S', value: 11, id: 'P2-S-11' },
            { suit: 'C', value: 8, id: 'P2-C-8' },
            { suit: 'C', value: 7, id: 'P2-C-7' },
        ];
        room.players[3].hand = [
            { suit: 'D', value: 2, id: 'P3-D-2' },
            { suit: 'C', value: 6, id: 'P3-C-6' },
            { suit: 'C', value: 5, id: 'P3-C-5' },
        ];

        room.trickCards = room.players.map((player) => ({
            playerId: player.id,
            card: null,
            hidden: false,
            dead: false,
            playedAfterTrumpReveal: false,
        }));

        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-S-10' });
        expect(room.trumpRevealed).toBe(true);
        expect(room.trumpRevealedThisTrick).toBe(true);

        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-D-2' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-S-11' });
        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-S-13' });

        expect(room.currentTurn).toBe(5);
        expect(room.currentPlayerIndex).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe(null);
        expect(room.consecutiveBowlingWins).toBe(0);
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(0);

        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-C-14' });
        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-C-10' });
        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-C-6' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-C-8' });

        expect(room.phase).toBe('playing');
        expect(room.currentTurn).toBe(6);
        expect(room.currentPlayerIndex).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe(room.players[1].id);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(0);

        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-C-13' });
        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-C-9' });
        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-C-5' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-C-7' });

        expect(room.phase).toBe('round_end');
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(1);
        expect(io.emitted.find((e) => e.event === 'round_result').payload).toMatchObject({
            winnerTeam: 1,
            reason: 'two_consecutive_non_ace_same_player_wins',
        });
    });

    test('resets any hidden-game streak when the reveal trick is won by active suit', () => {
        const io = createMockIo();

        const { roomCode } = createRoom('Host', 's-p0');
        joinRoom(roomCode, 'P2', 's-p1', null);
        joinRoom(roomCode, 'P3', 's-p2', null);
        joinRoom(roomCode, 'P4', 's-p3', null);
        const room = getRoom(roomCode);
        const sockets = room.players.map((player) => {
            const socket = createMockSocket(player.socketId);
            registerSocketHandlers(io, socket);
            return socket;
        });

        room.phase = 'playing';
        room.currentTurn = 4;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 0;
        room.activeSuit = null;
        room.trumpRevealed = false;
        room.trumpSuit = null;
        room.hiddenCard = { suit: 'H', value: 7, id: 'H-7' };
        room.trumpRevealedThisTrick = false;
        room.lastTrickWinnerPlayerId = room.players[1].id;
        room.consecutiveBowlingWins = 1;
        room.consecutiveWinBanked = false;
        room.lastTrickWasAce = false;
        room.lastTrickWasTrumpCutAce = false;
        room.openMode = false;
        room.doubleOpenMode = false;
        room.openDeclaredByTeam = null;

        room.players[0].hand = [
            { suit: 'S', value: 10, id: 'P0-S-10' },
            { suit: 'C', value: 10, id: 'P0-C-10' },
        ];
        room.players[1].hand = [
            { suit: 'S', value: 13, id: 'P1-S-13' },
            { suit: 'C', value: 13, id: 'P1-C-13' },
        ];
        room.players[2].hand = [
            { suit: 'S', value: 11, id: 'P2-S-11' },
            { suit: 'C', value: 8, id: 'P2-C-8' },
        ];
        room.players[3].hand = [
            { suit: 'D', value: 2, id: 'P3-D-2' },
            { suit: 'C', value: 6, id: 'P3-C-6' },
        ];
        room.trickCards = room.players.map((player) => ({
            playerId: player.id,
            card: null,
            hidden: false,
            dead: false,
            playedAfterTrumpReveal: false,
        }));

        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-S-10' });
        expect(room.trumpRevealed).toBe(true);
        expect(room.trumpRevealedThisTrick).toBe(true);

        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-D-2' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-S-11' });
        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-S-13' });

        expect(room.currentTurn).toBe(5);
        expect(room.currentPlayerIndex).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe(null);
        expect(room.consecutiveBowlingWins).toBe(0);
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(0);

        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-C-13' });
        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-C-10' });
        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-C-6' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-C-8' });

        expect(room.phase).toBe('playing');
        expect(room.currentTurn).toBe(6);
        expect(room.currentPlayerIndex).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe(room.players[1].id);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(0);
    });

    test('does not pre-determine the round when a bowler leads King after winning with same-suit Ace', () => {
        const io = createMockIo();

        const { roomCode } = createRoom('Host', 's-p0');
        joinRoom(roomCode, 'P2', 's-p1', null);
        joinRoom(roomCode, 'P3', 's-p2', null);
        joinRoom(roomCode, 'P4', 's-p3', null);
        const room = getRoom(roomCode);
        const sockets = room.players.map((player) => {
            const socket = createMockSocket(player.socketId);
            registerSocketHandlers(io, socket);
            return socket;
        });

        room.phase = 'playing';
        room.currentTurn = 6;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 1;
        room.activeSuit = null;
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.hiddenCard = null;
        room.trumpRevealedThisTrick = false;
        room.lastTrickWinnerPlayerId = null;
        room.consecutiveBowlingWins = 0;
        room.consecutiveWinBanked = false;
        room.lastTrickWasAce = false;
        room.lastTrickWasTrumpCutAce = false;
        room.openMode = false;
        room.doubleOpenMode = false;
        room.openDeclaredByTeam = null;

        room.players[0].hand = [
            { suit: 'S', value: 10, id: 'P0-S-10' },
            { suit: 'D', value: 10, id: 'P0-D-10' },
        ];
        room.players[1].hand = [
            { suit: 'S', value: 14, id: 'P1-S-14' },
            { suit: 'S', value: 13, id: 'P1-S-13' },
        ];
        room.players[2].hand = [
            { suit: 'S', value: 11, id: 'P2-S-11' },
            { suit: 'D', value: 9, id: 'P2-D-9' },
        ];
        room.players[3].hand = [
            { suit: 'S', value: 12, id: 'P3-S-12' },
            { suit: 'C', value: 8, id: 'P3-C-8' },
        ];

        room.trickCards = room.players.map((player) => ({
            playerId: player.id,
            card: null,
            hidden: false,
            dead: false,
            playedAfterTrumpReveal: false,
        }));

        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-S-14' });
        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-S-10' });
        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-S-12' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-S-11' });

        expect(room.currentTurn).toBe(7);
        expect(room.currentPlayerIndex).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe(room.players[1].id);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(io.emitted.filter((e) => e.event === 'trick_result')).toHaveLength(4);
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(0);

        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-S-13' });

        expect(room.phase).toBe('playing');
        expect(room.activeSuit).toBe('S');
        expect(room.currentPlayerIndex).toBe(0);
        expect(room.trickCards.filter((slot) => slot.card)).toHaveLength(1);
        expect(io.emitted.filter((e) => e.event === 'trick_result')).toHaveLength(4);
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(0);

        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-D-10' });
        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-C-8' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-D-9' });

        expect(room.phase).toBe('round_end');
        expect(io.emitted.filter((e) => e.event === 'round_result')).toHaveLength(1);
    });

    test('double-open declarer wins by surviving through turn 13, not by early consecutive tricks', () => {
        const io = createMockIo();

        const { roomCode } = createRoom('Host', 's-p0');
        joinRoom(roomCode, 'P2', 's-p1', null);
        joinRoom(roomCode, 'P3', 's-p2', null);
        joinRoom(roomCode, 'P4', 's-p3', null);
        const room = getRoom(roomCode);
        const sockets = room.players.map((player) => {
            const socket = createMockSocket(player.socketId);
            registerSocketHandlers(io, socket);
            return socket;
        });

        room.phase = 'playing';
        room.currentTurn = 13;
        room.currentBatterIndex = 0;
        room.currentPlayerIndex = 1;
        room.activeSuit = null;
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.hiddenCard = null;
        room.trumpRevealedThisTrick = false;
        room.lastTrickWinnerPlayerId = null;
        room.consecutiveBowlingWins = 0;
        room.consecutiveWinBanked = false;
        room.lastTrickWasAce = false;
        room.lastTrickWasTrumpCutAce = false;
        room.openMode = true;
        room.doubleOpenMode = true;
        room.openDeclaredByTeam = 1;
        room.openDeclaredByPlayerId = room.players[1].id;
        room.doubleOpenDeclaredByTeam = 0;
        room.doubleOpenDeclaredByPlayerId = room.players[0].id;

        room.players[0].hand = [{ suit: 'S', value: 10, id: 'P0-S-10' }];
        room.players[1].hand = [{ suit: 'S', value: 14, id: 'P1-S-14' }];
        room.players[2].hand = [{ suit: 'S', value: 11, id: 'P2-S-11' }];
        room.players[3].hand = [{ suit: 'S', value: 12, id: 'P3-S-12' }];
        room.trickCards = room.players.map((player) => ({
            playerId: player.id,
            card: null,
            hidden: false,
            dead: false,
            playedAfterTrumpReveal: false,
        }));

        sockets[1].getHandler('play_card')({ roomCode, cardId: 'P1-S-14' });
        sockets[0].getHandler('play_card')({ roomCode, cardId: 'P0-S-10' });
        sockets[3].getHandler('play_card')({ roomCode, cardId: 'P3-S-12' });
        sockets[2].getHandler('play_card')({ roomCode, cardId: 'P2-S-11' });

        const roundResults = io.emitted.filter((e) => e.event === 'round_result');
        expect(roundResults).toHaveLength(1);
        expect(roundResults[0].payload).toMatchObject({
            winnerTeam: 0,
            reason: 'tricks_completed',
        });
    });
});
