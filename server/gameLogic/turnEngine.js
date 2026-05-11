import { getBatterTeamIndex, getBowlingTeamIndex } from '../rooms.js';

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
            // Shouldn't happen
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

function checkConsecutiveWins(room, trickWinnerPlayerId, winningCard) {
    const targetTeam = getTargetConsecutiveTeam(room);
    if (targetTeam === null) return { roundOver: false };

    const winner = room.players.find((p) => p.id === trickWinnerPlayerId);
    if (!winner) return { roundOver: false };

    const isAceWin = winningCard && winningCard.value === 14;
    const winnerTeam = winner.teamIndex;
    const isOpenOrDoubleOpen = room.openMode || room.doubleOpenMode;

    // In open/double-open: Turn 1 is excluded from consecutive tracking,
    // but we still remember whether that trick was won with an Ace.
    if (isOpenOrDoubleOpen && room.currentTurn === 1) {
        room.consecutiveBowlingWins = 0;
        room.lastTrickWinnerPlayerId = null;
        room.lastTrickWasAce = isAceWin;
        return { roundOver: false };
    }

    if (winnerTeam !== targetTeam) {
        room.consecutiveBowlingWins = 0;
        room.lastTrickWinnerPlayerId = trickWinnerPlayerId;
        room.lastTrickWasAce = isAceWin;
        return { roundOver: false };
    }

    const samePlayerAsPrevious = room.lastTrickWinnerPlayerId === trickWinnerPlayerId;
    const aceAcePair = isOpenOrDoubleOpen && room.currentTurn <= 3 && samePlayerAsPrevious && room.lastTrickWasAce && isAceWin;

    if (samePlayerAsPrevious) {
        if (aceAcePair) {
            room.consecutiveBowlingWins = 1;
        } else {
            room.consecutiveBowlingWins += 1;
        }
    } else {
        room.consecutiveBowlingWins = 1;
    }

    room.lastTrickWinnerPlayerId = trickWinnerPlayerId;
    room.lastTrickWasAce = isAceWin;

    if (room.consecutiveBowlingWins >= 2) {
        if (!room.trumpRevealed) {
            room.consecutiveWinBanked = true;
            return { roundOver: false };
        }
        return { roundOver: true, winnerTeam: targetTeam, reason: 'two_consecutive_non_ace_same_player_wins' };
    }
    return { roundOver: false };
}

export {
    validatePlay,
    resolveTrick,
    isTrumpCard,
    checkConsecutiveWins,
    getTargetConsecutiveTeam,
};
