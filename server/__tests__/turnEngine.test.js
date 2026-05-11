import { validatePlay, resolveTrick, checkConsecutiveWins } from '../gameLogic/turnEngine.js';

function makeRoom() {
    return {
        currentBatterIndex: 0,
        activeSuit: 'H',
        trumpSuit: null,
        trumpRevealed: false,
        currentTurn: 2,
        openMode: false,
        doubleOpenMode: false,
        openDeclaredByTeam: null,
        trickCards: [
            { playerId: 'p0', card: null, hidden: false },
            { playerId: 'p1', card: null, hidden: false },
            { playerId: 'p2', card: null, hidden: false },
            { playerId: 'p3', card: null, hidden: false },
        ],
        lastTrickWinnerPlayerId: null,
        consecutiveBowlingWins: 0,
        lastTrickWasAce: false,
        players: [
            { id: 'p0', playerIndex: 0, teamIndex: 0, hand: [] },
            { id: 'p1', playerIndex: 1, teamIndex: 1, hand: [] },
            { id: 'p2', playerIndex: 2, teamIndex: 0, hand: [] },
            { id: 'p3', playerIndex: 3, teamIndex: 1, hand: [] },
        ],
        currentPlayerIndex: 1,
    };
}

describe('turnEngine', () => {
    test('Player with the activeSuit in hand is rejected if they play a different suit', () => {
        const room = makeRoom();
        const p1 = room.players[1];
        p1.hand = [
            { suit: 'H', value: 9, id: 'H-9' },
            { suit: 'S', value: 14, id: 'S-14' },
        ];
        const res = validatePlay(room, 'p1', 'S-14');
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_SUIT');
    });

    test('Player without the activeSuit may play any card without error', () => {
        const room = makeRoom();
        const p1 = room.players[1];
        p1.hand = [{ suit: 'S', value: 14, id: 'S-14' }];
        const res = validatePlay(room, 'p1', 'S-14');
        expect(res.valid).toBe(true);
    });

    test('Trick winner: highest activeSuit card wins when no trump played', () => {
        const room = makeRoom();
        room.trickCards[0].card = { suit: 'H', value: 10, id: 'H-10' };
        room.trickCards[1].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[2].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[3].card = { suit: 'D', value: 2, id: 'D-2' };
        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Trick winner: trump card beats higher activeSuit card', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.trickCards[0].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[1].card = { suit: 'S', value: 2, id: 'S-2' };
        room.trickCards[2].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[3].card = { suit: 'H', value: 12, id: 'H-12' };
        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Trick winner: highest trump wins when multiple trump played', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.trickCards[0].card = { suit: 'S', value: 10, id: 'S-10' };
        room.trickCards[1].card = { suit: 'S', value: 14, id: 'S-14' };
        room.trickCards[2].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[3].card = { suit: 'S', value: 12, id: 'S-12' };
        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Consecutive win counter increments correctly', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.consecutiveBowlingWins = 0;
        const res = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });
        expect(res.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Same team but different player does not count as consecutive', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.consecutiveBowlingWins = 1;

        const res = checkConsecutiveWins(room, 'p3', { suit: 'D', value: 12, id: 'D-12' });

        expect(res.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Open mode ace-ace extension keeps the game alive until Trick 3', () => {
        const room = makeRoom();
        room.openMode = true;
        room.openDeclaredByTeam = 0;
        room.currentTurn = 2;
        room.lastTrickWinnerPlayerId = 'p1';
        room.lastTrickWasAce = true;
        room.consecutiveBowlingWins = 1;

        const second = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 14, id: 'D-14' });
        expect(second.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);

        room.currentTurn = 3;
        const third = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });
        expect(third.roundOver).toBe(true);
        expect(third.winnerTeam).toBe(1);
    });

    test('Normal mode still ends after two same-player bowling wins, even with aces', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.lastTrickWasAce = true;
        room.consecutiveBowlingWins = 1;

        const res = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 14, id: 'D-14' });
        expect(res.roundOver).toBe(true);
        expect(res.winnerTeam).toBe(1);
    });
});
