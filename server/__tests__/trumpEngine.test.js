import { shouldRevealTrump, revealTrump } from '../gameLogic/trumpEngine.js';

function makeRoom() {
    return {
        currentBatterIndex: 0,
        activeSuit: 'H',
        trumpRevealed: false,
        trumpSuit: null,
        hiddenCard: { suit: 'S', value: 9, id: 'S-9' },
        trickCards: [
            { playerId: 'p0', card: null, hidden: false },
            { playerId: 'p1', card: null, hidden: true },
            { playerId: 'p2', card: null, hidden: false },
            { playerId: 'p3', card: null, hidden: false },
        ],
        players: [
            { id: 'p0', playerIndex: 0, teamIndex: 0, hand: [] },
            { id: 'p1', playerIndex: 1, teamIndex: 1, hand: [] },
            { id: 'p2', playerIndex: 2, teamIndex: 0, hand: [] },
            { id: 'p3', playerIndex: 3, teamIndex: 1, hand: [] },
        ],
    };
}

describe('trumpEngine', () => {
    test('shouldRevealTrump() true only when bowling player has no activeSuit', () => {
        const room = makeRoom();
        const bowler = room.players[1];
        bowler.hand = [{ suit: 'D', value: 2, id: 'D-2' }];
        expect(shouldRevealTrump(room, bowler.id)).toBe(true);
        bowler.hand = [{ suit: 'H', value: 2, id: 'H-2' }];
        expect(shouldRevealTrump(room, bowler.id)).toBe(false);
    });

    test('revealTrump() sets trumpSuit, marks revealed, returns hidden card, and adds it to batter hand', () => {
        const room = makeRoom();
        const batter = room.players[0];
        batter.hand = [{ suit: 'H', value: 2, id: 'H-2' }];
        const hidden = revealTrump(room);
        expect(hidden).toEqual({ suit: 'S', value: 9, id: 'S-9' });
        expect(room.trumpRevealed).toBe(true);
        expect(room.trumpSuit).toBe('S');
        expect(room.hiddenCard).toBe(null);
        expect(batter.hand.find((c) => c.id === 'S-9')).toBeTruthy();
        expect(room.trickCards.every((t) => t.hidden === false)).toBe(true);
    });
});
