import { getOpenContractTeam } from './openContract.js';

function calculatePoints(room, winnerTeam) {
    const team0 = 0;
    const team1 = 1;
    let team0Points = 0;
    let team1Points = 0;

    if (!room.openMode && !room.doubleOpenMode) {
        const battingTeam = room.currentBatterIndex % 2;
        const bowlingTeam = 1 - battingTeam;
        if (winnerTeam === battingTeam) {
            if (battingTeam === team0) team0Points += 13;
            else team1Points += 13;
        } else if (winnerTeam === bowlingTeam) {
            if (bowlingTeam === team0) team0Points += 26;
            else team1Points += 26;
        }
        return { team0Points, team1Points };
    }

    const declTeam = getOpenContractTeam(room);
    const oppTeam = declTeam === null ? null : 1 - declTeam;

    if (room.doubleOpenMode) {
        if (winnerTeam === declTeam) {
            if (declTeam === team0) team0Points += 48;
            else team1Points += 48;
        } else if (winnerTeam === oppTeam) {
            if (oppTeam === team0) team0Points += 96;
            else team1Points += 96;
        }
        return { team0Points, team1Points };
    }

    // Open mode (not double)
    if (winnerTeam === declTeam) {
        if (declTeam === team0) team0Points += 24;
        else team1Points += 24;
    } else if (winnerTeam === oppTeam) {
        if (oppTeam === team0) team0Points += 48;
        else team1Points += 48;
    }

    return { team0Points, team1Points };
}

export { calculatePoints };
