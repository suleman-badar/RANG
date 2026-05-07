function createDeck() {
    const suits = ['H', 'D', 'C', 'S'];
    const deck = [];
    for (const suit of suits) {
        for (let value = 2; value <= 14; ++value) {
            deck.push({ suit, value, id: `${suit}-${value}` });
        }
    }
    return deck;
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function deal(deck, numPlayers, cardsEach) {
    const hands = Array.from({ length: numPlayers }, () => []);
    for (let c = 0; c < cardsEach; ++c) {
        for (let p = 0; p < numPlayers; ++p) {
            hands[p].push(deck.shift());
        }
    }
    return hands;
}

export { createDeck, shuffle, deal };
