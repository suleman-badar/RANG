import { createDeck, shuffle } from '../gameLogic/deck.js';

describe('deck', () => {
    test('createDeck() returns exactly 52 cards with no duplicates', () => {
        const deck = createDeck();
        expect(deck).toHaveLength(52);
        const ids = deck.map((c) => c.id);
        expect(new Set(ids).size).toBe(52);
    });

    test('shuffle() returns all 52 cards in a different order', () => {
        const deck = createDeck();
        const before = deck.map((c) => c.id);
        shuffle(deck);
        const after = deck.map((c) => c.id);
        expect(after).toHaveLength(52);
        expect(new Set(after).size).toBe(52);
        // Extremely low probability of accidental equality; acceptable for MVP.
        expect(after.join(',')).not.toEqual(before.join(','));
    });
});
