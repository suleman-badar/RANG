const { calculatePoints } = require('../gameLogic/scoring');

describe('scoring', () => {
    test('Batting team wins the round (Normal) => +13', () => {
        const room = { openMode: false, doubleOpenMode: false, currentBatterIndex: 0 };
        const pts = calculatePoints(room, 0);
        expect(pts).toEqual({ team0Points: 13, team1Points: 0 });
    });

    test('Bowling team wins the round (Normal) => +26', () => {
        const room = { openMode: false, doubleOpenMode: false, currentBatterIndex: 0 };
        const pts = calculatePoints(room, 1);
        expect(pts).toEqual({ team0Points: 0, team1Points: 26 });
    });

    test('Open declarer team wins => +24', () => {
        const room = { openMode: true, doubleOpenMode: false, openDeclaredByTeam: 0, currentBatterIndex: 0 };
        const pts = calculatePoints(room, 0);
        expect(pts).toEqual({ team0Points: 24, team1Points: 0 });
    });

    test('Open declarer team loses => opponent +48', () => {
        const room = { openMode: true, doubleOpenMode: false, openDeclaredByTeam: 0, currentBatterIndex: 0 };
        const pts = calculatePoints(room, 1);
        expect(pts).toEqual({ team0Points: 0, team1Points: 48 });
    });

    test('Double-Open declarer team wins => +48', () => {
        const room = { openMode: true, doubleOpenMode: true, openDeclaredByTeam: 1, currentBatterIndex: 0 };
        const pts = calculatePoints(room, 1);
        expect(pts).toEqual({ team0Points: 0, team1Points: 48 });
    });

    test('Double-Open declarer team loses => opponent +96', () => {
        const room = { openMode: true, doubleOpenMode: true, openDeclaredByTeam: 1, currentBatterIndex: 0 };
        const pts = calculatePoints(room, 0);
        expect(pts).toEqual({ team0Points: 96, team1Points: 0 });
    });
});
