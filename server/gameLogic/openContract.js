function normalizeTeamIndex(teamIndex) {
    return teamIndex === 0 || teamIndex === 1 ? teamIndex : null;
}

function getOpenContractTeam(room) {
    if (room.doubleOpenMode) {
        const doubleOpenTeam = normalizeTeamIndex(room.doubleOpenDeclaredByTeam);
        if (doubleOpenTeam !== null) return doubleOpenTeam;
    }

    return normalizeTeamIndex(room.openDeclaredByTeam);
}

function getOpenStoppingTeam(room) {
    const contractTeam = getOpenContractTeam(room);
    return contractTeam === null ? null : 1 - contractTeam;
}

export { getOpenContractTeam, getOpenStoppingTeam };
