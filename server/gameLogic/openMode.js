import { getBatterTeamIndex, getBowlingTeamIndex } from '../rooms.js';
import { resetConsecutiveState } from './turnEngine.js';

function isValidSuit(s) {
    return s === 'H' || s === 'D' || s === 'C' || s === 'S';
}

function canDeclareOpen(room, playerId) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, errorCode: 'INVALID_ACTION' };

    if (room.openMode) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (room.doubleOpenMode) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (room.trumpRevealed) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (room.currentTurn !== 1) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (player.playerIndex !== room.currentPlayerIndex) return { valid: false, errorCode: 'WRONG_TURN' };
    if (room.openCountForBatter >= 3) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (player.playerIndex === room.currentBatterIndex) return { valid: false, errorCode: 'INVALID_ACTION' };

    // Only before they have thrown their Turn 1 card
    const slot = room.trickCards.find((t) => t.playerId === playerId);
    if (slot && slot.card) return { valid: false, errorCode: 'INVALID_ACTION' };

    return { valid: true };
}

function returnCurrentTrickCardsToHands(room) {
    for (const slot of room.trickCards) {
        if (slot.card) {
            const p = room.players.find((x) => x.id === slot.playerId);
            if (p) p.hand.push(slot.card);
            slot.card = null;
            slot.hidden = false;
        }
    }
}

function restartRoundFromAlpha(room, alphaPlayerId) {
    room.currentTurn = 1;
    room.activeSuit = null;
    resetConsecutiveState(room);

    const alpha = room.players.find((p) => p.id === alphaPlayerId);
    room.currentPlayerIndex = alpha ? alpha.playerIndex : room.currentPlayerIndex;
    room.phase = 'open_window';
}

function executeOpen(room, playerId, trumpSuit) {
    if (!isValidSuit(trumpSuit)) return { ok: false, errorCode: 'INVALID_ACTION' };

    returnCurrentTrickCardsToHands(room);

    // hidden trump card is deactivated and returned
    if (room.hiddenCard) {
        const batter = room.players[room.currentBatterIndex];
        batter.hand.push(room.hiddenCard);
        room.hiddenCard = null;
    }

    room.openMode = true;
    room.doubleOpenMode = false;
    room.trumpSuit = trumpSuit;
    room.trumpRevealed = true;

    room.openDeclaredByPlayerId = playerId;
    const decl = room.players.find((p) => p.id === playerId);
    room.openDeclaredByTeam = decl ? decl.teamIndex : null;
    room.doubleOpenDeclaredByPlayerId = null;
    room.doubleOpenDeclaredByTeam = null;

    if (decl && decl.teamIndex === getBowlingTeamIndex(room)) {
        ++room.openCountForBatter;
    }

    restartRoundFromAlpha(room, playerId);
    return { ok: true, alphaPlayerId: playerId };
}

function canDeclareDoubleOpen(room, playerId) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (!room.openMode) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (room.doubleOpenMode) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (room.currentTurn !== 1) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (player.playerIndex !== room.currentPlayerIndex) return { valid: false, errorCode: 'WRONG_TURN' };
    if (room.openDeclaredByTeam === null) return { valid: false, errorCode: 'INVALID_ACTION' };
    if (player.teamIndex === room.openDeclaredByTeam) return { valid: false, errorCode: 'INVALID_ACTION' };

    const slot = room.trickCards.find((t) => t.playerId === playerId);
    if (slot && slot.card) return { valid: false, errorCode: 'INVALID_ACTION' };

    return { valid: true };
}

function executeDoubleOpen(room, playerId, trumpSuit) {
    if (!isValidSuit(trumpSuit)) return { ok: false, errorCode: 'INVALID_ACTION' };

    returnCurrentTrickCardsToHands(room);

    room.doubleOpenMode = true;
    room.trumpSuit = trumpSuit;
    room.trumpRevealed = true;

    const decl = room.players.find((p) => p.id === playerId);
    room.doubleOpenDeclaredByPlayerId = playerId;
    room.doubleOpenDeclaredByTeam = decl ? decl.teamIndex : null;

    restartRoundFromAlpha(room, playerId);
    return { ok: true, alphaPlayerId: playerId };
}

export {
    canDeclareOpen,
    executeOpen,
    canDeclareDoubleOpen,
    executeDoubleOpen,
    returnCurrentTrickCardsToHands,
};
