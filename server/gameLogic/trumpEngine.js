import { getBowlingTeamIndex } from '../rooms.js';

function shouldRevealTrump(room, playerId) {
    if (room.trumpRevealed) return false;
    if (!room.activeSuit) return false;
    if (!room.hiddenCard) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    const bowlingTeam = getBowlingTeamIndex(room);
    if (player.teamIndex !== bowlingTeam) return false;

    const hasActiveSuit = player.hand.some((c) => c.suit === room.activeSuit);
    return !hasActiveSuit;
}

function revealTrump(room) {
    if (room.trumpRevealed) return null;
    if (!room.hiddenCard) return null;

    const hiddenCard = room.hiddenCard;
    room.trumpRevealed = true;
    room.trumpSuit = hiddenCard.suit;

    const batter = room.players[room.currentBatterIndex];
    batter.hand.push(hiddenCard);
    room.hiddenCard = null;

    // Previously hidden off-suit batting discards are now visible.
    for (const slot of room.trickCards) {
        if (slot) slot.hidden = false;
    }

    return hiddenCard;
}

export { shouldRevealTrump, revealTrump };
