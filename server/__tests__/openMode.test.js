import { canDeclareOpen, executeOpen, canDeclareDoubleOpen, executeDoubleOpen } from '../gameLogic/openMode.js';
import { revealTrump, shouldRevealTrump } from '../gameLogic/trumpEngine.js';

function makeRoom() {
    return {
        phase: 'open_window',
        currentBatterIndex: 0,
        currentTurn: 1,
        currentPlayerIndex: 1,
        openCountForBatter: 0,
        openMode: false,
        doubleOpenMode: false,
        trumpSuit: null,
        trumpRevealed: false,
        hiddenCard: { suit: 'H', value: 7, id: 'H-7' },
        activeSuit: null,
        trickCards: [
            { playerId: 'p0', card: null, hidden: false },
            { playerId: 'p1', card: null, hidden: false },
            { playerId: 'p2', card: null, hidden: false },
            { playerId: 'p3', card: null, hidden: false },
        ],
        lastTrickWinnerPlayerId: null,
        consecutiveBowlingWins: 0,
        lastTrickWasAce: false,
        openDeclaredByPlayerId: null,
        openDeclaredByTeam: null,
        players: [
            { id: 'p0', playerIndex: 0, teamIndex: 0, hand: [] },
            { id: 'p1', playerIndex: 1, teamIndex: 1, hand: [] },
            { id: 'p2', playerIndex: 2, teamIndex: 0, hand: [] },
            { id: 'p3', playerIndex: 3, teamIndex: 1, hand: [] },
        ],
    };
}

describe('openMode', () => {
    test('declare_open rejected if player is the Batter', () => {
        const room = makeRoom();
        room.currentPlayerIndex = 0;
        const res = canDeclareOpen(room, 'p0');
        expect(res.valid).toBe(false);
    });

    test('declare_open rejected after Turn 1 is complete', () => {
        const room = makeRoom();
        room.currentTurn = 2;
        const res = canDeclareOpen(room, 'p1');
        expect(res.valid).toBe(false);
    });

    test('declare_open rejected if hidden trump was already revealed', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'H';

        const res = canDeclareOpen(room, 'p1');

        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_ACTION');
    });

    test('declare_open rejected when trump is revealed during the first trick', () => {
        const room = makeRoom();
        room.currentPlayerIndex = 0;
        room.players[3].hand = [{ suit: 'D', value: 4, id: 'D-4' }];

        room.activeSuit = 'S';
        room.trickCards[0].card = { suit: 'S', value: 9, id: 'S-9' };
        room.currentPlayerIndex = 3;

        expect(shouldRevealTrump(room, 'p3')).toBe(true);
        expect(revealTrump(room)).toEqual({ suit: 'H', value: 7, id: 'H-7' });

        const res = canDeclareOpen(room, 'p3');

        expect(room.currentTurn).toBe(1);
        expect(room.trumpRevealed).toBe(true);
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_ACTION');
    });

    test('declare_open rejected if openCountForBatter >= 3', () => {
        const room = makeRoom();
        room.openCountForBatter = 3;
        const res = canDeclareOpen(room, 'p1');
        expect(res.valid).toBe(false);
    });

    test('declare_double_open rejected if openMode is not active', () => {
        const room = makeRoom();
        const res = canDeclareDoubleOpen(room, 'p2');
        expect(res.valid).toBe(false);
    });

    test('declare_double_open rejected from the same team that declared open', () => {
        const room = makeRoom();
        room.openMode = true;
        room.openDeclaredByTeam = 1;
        room.currentPlayerIndex = 3;
        const res = canDeclareDoubleOpen(room, 'p3');
        expect(res.valid).toBe(false);
    });

    test('After executeOpen, trumpSuit matches declared suit, hiddenCard is in Batter hand, alphaPlayerId is set', () => {
        const room = makeRoom();
        room.players[0].hand = [{ suit: 'D', value: 2, id: 'D-2' }];
        const result = executeOpen(room, 'p1', 'S');
        expect(result.ok).toBe(true);
        expect(result.alphaPlayerId).toBe('p1');
        expect(room.trumpSuit).toBe('S');
        expect(room.trumpRevealed).toBe(true);
        expect(room.hiddenCard).toBe(null);
        expect(room.players[0].hand.find((c) => c.id === 'H-7')).toBeTruthy();
        expect(room.currentPlayerIndex).toBe(1);
    });

    test('Open declared by the bowling team increments openCountForBatter', () => {
        const room = makeRoom();
        room.players[0].hand = [{ suit: 'D', value: 2, id: 'D-2' }];
        const result = executeOpen(room, 'p1', 'S');

        expect(result.ok).toBe(true);
        expect(room.openCountForBatter).toBe(1);
    });

    test('Open declared by the batting team does not increment openCountForBatter, even after Double-Open', () => {
        const room = makeRoom();
        room.currentPlayerIndex = 2;
        room.players[0].hand = [{ suit: 'D', value: 2, id: 'D-2' }];

        const openResult = executeOpen(room, 'p2', 'S');
        expect(openResult.ok).toBe(true);
        expect(room.openCountForBatter).toBe(0);
        expect(room.openDeclaredByTeam).toBe(0);
        expect(room.openDeclaredByPlayerId).toBe('p2');

        room.currentPlayerIndex = 1;
        const doubleOpenResult = executeDoubleOpen(room, 'p1', 'H');
        expect(doubleOpenResult.ok).toBe(true);
        expect(room.openCountForBatter).toBe(0);
        expect(room.openDeclaredByTeam).toBe(0);
        expect(room.openDeclaredByPlayerId).toBe('p2');
    });

    test('Double-Open does not change open ownership when bowling team declared Open', () => {
        const room = makeRoom();
        room.players[0].hand = [{ suit: 'D', value: 2, id: 'D-2' }];

        const openResult = executeOpen(room, 'p1', 'S');
        expect(openResult.ok).toBe(true);
        expect(room.openCountForBatter).toBe(1);
        expect(room.openDeclaredByTeam).toBe(1);
        expect(room.openDeclaredByPlayerId).toBe('p1');

        room.currentPlayerIndex = 2;
        const canDoubleOpen = canDeclareDoubleOpen(room, 'p2');
        expect(canDoubleOpen.valid).toBe(true);

        const doubleOpenResult = executeDoubleOpen(room, 'p2', 'H');
        expect(doubleOpenResult.ok).toBe(true);
        expect(room.openCountForBatter).toBe(1);
        expect(room.openDeclaredByTeam).toBe(1);
        expect(room.openDeclaredByPlayerId).toBe('p1');
    });
});
