function createDeck() {
    const suits = ['H', 'D', 'C', 'S'];
    const deck = [];
    for (const suit of suits) {
        for (let value = 2; value <= 14; value += 1) {
            deck.push({ suit, value, id: `${suit}-${value}` });
        }
    }
    return deck;
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function deal(deck, numPlayers, cardsEach) {
    const hands = Array.from({ length: numPlayers }, () => []);
    for (let c = 0; c < cardsEach; c += 1) {
        for (let p = 0; p < numPlayers; p += 1) {
            hands[p].push(deck.shift());
        }
    }
    return hands;
}

module.exports = { createDeck, shuffle, deal };
