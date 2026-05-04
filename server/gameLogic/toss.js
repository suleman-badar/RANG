function runTossStep(room) {
    const dealtIndex = room.tossCards.length % 4;
    const recipient = room.players[dealtIndex];
    const card = room.tossDeck.shift();
    room.tossCards.push({ playerId: recipient.id, card });

    const isAce = card.value === 14;
    return { card, recipientPlayerId: recipient.id, isAce };
}

function resolveToss(room) {
    while (room.tossDeck.length > 0) {
        const step = runTossStep(room);
        if (step.isAce) {
            room.tossWinnerId = step.recipientPlayerId;
            return { winnerPlayerId: room.tossWinnerId, steps: [step] };
        }
    }
    return { winnerPlayerId: null, steps: [] };
}

export { runTossStep, resolveToss };
