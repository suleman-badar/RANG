const { getBatterTeamIndex, getBowlingTeamIndex } = require('../rooms');

function isTrumpCard(card, trumpSuit) {
    if (!trumpSuit) return false;
    return card.suit === trumpSuit;
}

function validatePlay(room, playerId, cardId) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, errorCode: 'INVALID_ACTION' };

    const isTurn = player.playerIndex === room.currentPlayerIndex;
    if (!isTurn) return { valid: false, errorCode: 'WRONG_TURN' };

    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return { valid: false, errorCode: 'INVALID_CARD' };

    const card = player.hand[idx];
    if (!room.activeSuit) return { valid: true };

    const hasActiveSuit = player.hand.some((c) => c.suit === room.activeSuit);
    if (hasActiveSuit && card.suit !== room.activeSuit) {
        return { valid: false, errorCode: 'INVALID_SUIT' };
    }

    return { valid: true };
}

function resolveTrick(room) {
    const played = room.trickCards
        .map((t) => ({ playerId: t.playerId, card: t.card }))
        .filter((x) => x.card);
    if (played.length !== 4) return null;

    const activeSuit = room.activeSuit;
    const trumpSuit = room.trumpRevealed ? room.trumpSuit : null;

    let best = null;
    for (const entry of played) {
        const c = entry.card;
        const cIsTrump = isTrumpCard(c, trumpSuit);
        const bestIsTrump = best ? isTrumpCard(best.card, trumpSuit) : false;

        if (!best) {
            best = entry;
            continue;
        }

        if (cIsTrump && !bestIsTrump) {
            best = entry;
            continue;
        }
        if (!cIsTrump && bestIsTrump) continue;

        // Same category (both trump or both not trump)
        if (!cIsTrump && c.suit !== activeSuit) continue;
        if (!bestIsTrump && best.card.suit !== activeSuit) {
            // Shouldn't happen; safety.
            best = entry;
            continue;
        }

        if (c.value > best.card.value) best = entry;
    }

    const winnerPlayerId = best.playerId;
    const winner = room.players.find((p) => p.id === winnerPlayerId);
    return {
        winnerPlayerId,
        winnerPlayerIndex: winner ? winner.playerIndex : null,
        winningCard: best.card,
    };
}

function getTargetConsecutiveTeam(room) {
    if (room.openMode || room.doubleOpenMode) {
        if (room.openDeclaredByTeam === null) return null;
        return 1 - room.openDeclaredByTeam;
    }
    return getBowlingTeamIndex(room);
}

function checkConsecutiveWins(room, trickWinnerTeam, winningCard) {
    const targetTeam = getTargetConsecutiveTeam(room);
    if (targetTeam === null) return { roundOver: false };

    const isAceWin = winningCard && winningCard.value === 14;

    // In open/double-open: Turn 1 is excluded from consecutive tracking.
    if ((room.openMode || room.doubleOpenMode) && room.currentTurn === 1) {
        room.consecutiveBowlingWins = 0;
        room.lastTrickWinnerIndex = null;
        room.lastTrickWasAce = false;
        return { roundOver: false };
    }

    if (trickWinnerTeam !== targetTeam) {
        room.consecutiveBowlingWins = 0;
        room.lastTrickWasAce = isAceWin;
        return { roundOver: false };
    }

    // Winner is the target team.
    const lastWinnerTeam = room.lastTrickWinnerIndex === null ? null : room.lastTrickWinnerIndex % 2;
    const lastWasTarget = lastWinnerTeam === targetTeam;
    const aceAcePair = lastWasTarget && room.lastTrickWasAce && isAceWin;

    if (!aceAcePair) room.consecutiveBowlingWins += 1;
    room.lastTrickWasAce = isAceWin;

    if (room.consecutiveBowlingWins >= 2) {
        return { roundOver: true, winnerTeam: targetTeam, reason: 'two_consecutive_non_ace_wins' };
    }
    return { roundOver: false };
}

module.exports = {
    validatePlay,
    resolveTrick,
    isTrumpCard,
    checkConsecutiveWins,
    getTargetConsecutiveTeam,
};
