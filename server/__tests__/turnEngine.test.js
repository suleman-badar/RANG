import { validatePlay, resolveTrick, checkConsecutiveWins, getTargetConsecutiveTeam, resetConsecutiveState } from '../gameLogic/turnEngine.js';

function makeRoom() {
    return {
        currentBatterIndex: 0,
        activeSuit: 'H',
        trumpSuit: null,
        trumpRevealed: false,
        currentTurn: 2,
        openMode: false,
        doubleOpenMode: false,
        openDeclaredByTeam: null,
        doubleOpenDeclaredByTeam: null,
        trickCards: [
            { playerId: 'p0', card: null, hidden: false },
            { playerId: 'p1', card: null, hidden: false },
            { playerId: 'p2', card: null, hidden: false },
            { playerId: 'p3', card: null, hidden: false },
        ],
        lastTrickWinnerPlayerId: null,
        consecutiveBowlingWins: 0,
        consecutiveWinBanked: false,
        lastTrickWasAce: false,
        lastTrickWasTrumpCutAce: false,
        players: [
            { id: 'p0', playerIndex: 0, teamIndex: 0, hand: [] },
            { id: 'p1', playerIndex: 1, teamIndex: 1, hand: [] },
            { id: 'p2', playerIndex: 2, teamIndex: 0, hand: [] },
            { id: 'p3', playerIndex: 3, teamIndex: 1, hand: [] },
        ],
        currentPlayerIndex: 1,
    };
}

describe('turnEngine', () => {
    test('Player with the activeSuit in hand is rejected if they play a different suit', () => {
        const room = makeRoom();
        const p1 = room.players[1];
        p1.hand = [
            { suit: 'H', value: 9, id: 'H-9' },
            { suit: 'S', value: 14, id: 'S-14' },
        ];
        const res = validatePlay(room, 'p1', 'S-14');
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_SUIT');
    });

    test('Player without the activeSuit may play any card without error', () => {
        const room = makeRoom();
        const p1 = room.players[1];
        p1.hand = [{ suit: 'S', value: 14, id: 'S-14' }];
        const res = validatePlay(room, 'p1', 'S-14');
        expect(res.valid).toBe(true);
    });

    test('Trick winner: highest activeSuit card wins when no trump played', () => {
        const room = makeRoom();
        room.trickCards[0].card = { suit: 'H', value: 10, id: 'H-10' };
        room.trickCards[1].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[2].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[3].card = { suit: 'D', value: 2, id: 'D-2' };
        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Trick winner: trump card beats higher activeSuit card', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.trickCards[0].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[1].card = { suit: 'S', value: 2, id: 'S-2' };
        room.trickCards[2].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[3].card = { suit: 'H', value: 12, id: 'H-12' };
        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Trick winner: highest trump wins when multiple trump played', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.trickCards[0].card = { suit: 'S', value: 10, id: 'S-10' };
        room.trickCards[1].card = { suit: 'S', value: 14, id: 'S-14' };
        room.trickCards[2].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[3].card = { suit: 'S', value: 12, id: 'S-12' };
        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Trump reveal trick: pre-reveal off-suit card matching trump is dead and cannot win', () => {
        const room = makeRoom();
        room.activeSuit = 'S';
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.trickCards[0].card = { suit: 'S', value: 10, id: 'S-10' };
        room.trickCards[0].playedAfterTrumpReveal = false;
        room.trickCards[1].card = { suit: 'S', value: 11, id: 'S-11' };
        room.trickCards[1].playedAfterTrumpReveal = false;
        room.trickCards[2].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[2].playedAfterTrumpReveal = false;
        room.trickCards[2].dead = true;
        room.trickCards[3].card = { suit: 'D', value: 2, id: 'D-2' };
        room.trickCards[3].playedAfterTrumpReveal = true;
        room.trickCards[3].dead = true;

        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p1');
    });

    test('Trump reveal trick: post-reveal trump cuts the original suit', () => {
        const room = makeRoom();
        room.activeSuit = 'S';
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.trickCards[0].card = { suit: 'S', value: 14, id: 'S-14' };
        room.trickCards[0].playedAfterTrumpReveal = false;
        room.trickCards[1].card = { suit: 'D', value: 3, id: 'D-3' };
        room.trickCards[1].playedAfterTrumpReveal = false;
        room.trickCards[1].dead = true;
        room.trickCards[2].card = { suit: 'S', value: 13, id: 'S-13' };
        room.trickCards[2].playedAfterTrumpReveal = false;
        room.trickCards[3].card = { suit: 'H', value: 2, id: 'H-2' };
        room.trickCards[3].playedAfterTrumpReveal = true;

        const r = resolveTrick(room);
        expect(r.winnerPlayerId).toBe('p3');
    });

    test('Trick winner metadata: trump Ace cut is marked when it cuts a different active suit', () => {
        const room = makeRoom();
        room.activeSuit = 'S';
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.trickCards[0].card = { suit: 'S', value: 13, id: 'S-13' };
        room.trickCards[0].playedAfterTrumpReveal = true;
        room.trickCards[1].card = { suit: 'S', value: 12, id: 'S-12' };
        room.trickCards[1].playedAfterTrumpReveal = true;
        room.trickCards[2].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[2].playedAfterTrumpReveal = true;
        room.trickCards[3].card = { suit: 'S', value: 11, id: 'S-11' };
        room.trickCards[3].playedAfterTrumpReveal = true;

        const r = resolveTrick(room);

        expect(r.winnerPlayerId).toBe('p2');
        expect(r.winningCardWasTrumpCut).toBe(true);
    });

    test('Trick winner metadata: trump Ace led as active suit is not marked as a cut', () => {
        const room = makeRoom();
        room.activeSuit = 'H';
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.trickCards[0].card = { suit: 'H', value: 14, id: 'H-14' };
        room.trickCards[0].playedAfterTrumpReveal = true;
        room.trickCards[1].card = { suit: 'H', value: 13, id: 'H-13' };
        room.trickCards[1].playedAfterTrumpReveal = true;
        room.trickCards[2].card = { suit: 'H', value: 12, id: 'H-12' };
        room.trickCards[2].playedAfterTrumpReveal = true;
        room.trickCards[3].card = { suit: 'H', value: 11, id: 'H-11' };
        room.trickCards[3].playedAfterTrumpReveal = true;

        const r = resolveTrick(room);

        expect(r.winnerPlayerId).toBe('p0');
        expect(r.winningCardWasTrumpCut).toBe(false);
    });

    test('Consecutive win counter increments correctly', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.consecutiveBowlingWins = 0;
        const res = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });
        expect(res.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Same team but different player does not count as consecutive', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.consecutiveBowlingWins = 1;

        const res = checkConsecutiveWins(room, 'p3', { suit: 'D', value: 12, id: 'D-12' });

        expect(res.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Open mode ace-ace extension keeps the game alive until Trick 3', () => {
        const room = makeRoom();
        room.openMode = true;
        room.openDeclaredByTeam = 0;
        room.currentTurn = 2;
        room.lastTrickWinnerPlayerId = 'p1';
        room.lastTrickWasAce = true;
        room.consecutiveBowlingWins = 1;

        const second = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 14, id: 'D-14' });
        expect(second.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);

        room.currentTurn = 3;
        const third = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });
        expect(third.roundOver).toBe(true);
        expect(third.winnerTeam).toBe(1);
    });

    test('Double-open uses the double-open declarer as the defending team', () => {
        const room = makeRoom();
        room.openMode = true;
        room.doubleOpenMode = true;
        room.openDeclaredByTeam = 1;
        room.doubleOpenDeclaredByTeam = 0;

        expect(getTargetConsecutiveTeam(room)).toBe(1);

        room.currentTurn = 2;
        room.lastTrickWinnerPlayerId = 'p2';
        room.consecutiveBowlingWins = 1;
        const doubleOpenDeclarerWin = checkConsecutiveWins(room, 'p2', { suit: 'D', value: 13, id: 'D-13' });

        expect(doubleOpenDeclarerWin.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(0);

        const firstOpponentWin = checkConsecutiveWins(room, 'p1', { suit: 'C', value: 12, id: 'C-12' });
        expect(firstOpponentWin.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);

        room.currentTurn = 3;
        const secondOpponentWin = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });

        expect(secondOpponentWin.roundOver).toBe(true);
        expect(secondOpponentWin.winnerTeam).toBe(1);
    });

    test('Normal hidden mode does not end on two plain Ace wins by the same bowler', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.lastTrickWinnerPlayerId = 'p1';
        room.lastTrickWasAce = true;
        room.lastTrickWasTrumpCutAce = false;
        room.consecutiveBowlingWins = 1;

        const res = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 14, id: 'D-14' }, { winningCardWasTrumpCut: false });

        expect(res.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Normal hidden mode allows two Ace wins only when the first Ace was a trump cut', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'H';
        room.lastTrickWinnerPlayerId = 'p1';
        room.lastTrickWasAce = true;
        room.lastTrickWasTrumpCutAce = true;
        room.consecutiveBowlingWins = 1;

        const res = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 14, id: 'D-14' }, { winningCardWasTrumpCut: false });

        expect(res.roundOver).toBe(true);
        expect(res.winnerTeam).toBe(1);
    });

    test.each([
        ['open', { openMode: true, openDeclaredByTeam: 0 }],
        ['double-open', { openMode: true, doubleOpenMode: true, openDeclaredByTeam: 1, doubleOpenDeclaredByTeam: 0 }],
    ])('%s mode does not end on two plain Ace wins by the non-declaring team', (_mode, contractState) => {
        const room = makeRoom();
        Object.assign(room, contractState);
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.activeSuit = 'H';
        room.currentTurn = 5;
        room.currentPlayerIndex = 1;
        room.players[1].hand = [
            { suit: 'H', value: 14, id: 'H-14' },
            { suit: 'S', value: 14, id: 'S-14' },
        ];
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'H', value: 10, id: 'H-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: null, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: 'p2', card: { suit: 'H', value: 12, id: 'H-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'H', value: 13, id: 'H-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const firstPlay = validatePlay(room, 'p1', 'H-14');
        expect(firstPlay.valid).toBe(true);
        room.trickCards[1].card = room.players[1].hand.find((card) => card.id === 'H-14');
        room.trickCards[1].playedAfterTrumpReveal = true;

        const firstTrick = resolveTrick(room);
        expect(firstTrick.winnerPlayerId).toBe('p1');
        expect(firstTrick.winningCardWasTrumpCut).toBe(false);

        const firstCheck = checkConsecutiveWins(room, firstTrick.winnerPlayerId, firstTrick.winningCard, {
            winningCardWasTrumpCut: firstTrick.winningCardWasTrumpCut,
        });
        expect(firstCheck.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(false);

        room.currentTurn = 6;
        room.currentPlayerIndex = 1;
        room.activeSuit = 'S';
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'S', value: 10, id: 'S-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: { suit: 'S', value: 14, id: 'S-14' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p2', card: { suit: 'S', value: 12, id: 'S-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'S', value: 13, id: 'S-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const secondTrick = resolveTrick(room);
        expect(secondTrick.winnerPlayerId).toBe('p1');
        expect(secondTrick.winningCardWasTrumpCut).toBe(false);

        const secondCheck = checkConsecutiveWins(room, secondTrick.winnerPlayerId, secondTrick.winningCard, {
            winningCardWasTrumpCut: secondTrick.winningCardWasTrumpCut,
        });
        expect(secondCheck.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(false);
    });

    test.each([
        ['open', { openMode: true, openDeclaredByTeam: 0 }],
        ['double-open', { openMode: true, doubleOpenMode: true, openDeclaredByTeam: 1, doubleOpenDeclaredByTeam: 0 }],
    ])('%s mode ends when the first Ace was a trump cut and the same player wins next trick with any Ace', (_mode, contractState) => {
        const room = makeRoom();
        Object.assign(room, contractState);
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.activeSuit = 'H';
        room.currentTurn = 5;
        room.currentPlayerIndex = 1;
        room.lastTrickWinnerPlayerId = 'p0';
        room.consecutiveBowlingWins = 0;
        room.players[1].hand = [
            { suit: 'S', value: 14, id: 'S-14' },
            { suit: 'D', value: 14, id: 'D-14' },
        ];
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'H', value: 10, id: 'H-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: null, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: 'p2', card: { suit: 'H', value: 12, id: 'H-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'H', value: 13, id: 'H-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const firstPlay = validatePlay(room, 'p1', 'S-14');
        expect(firstPlay.valid).toBe(true);
        room.trickCards[1].card = room.players[1].hand.find((card) => card.id === 'S-14');
        room.trickCards[1].playedAfterTrumpReveal = true;

        const firstTrick = resolveTrick(room);
        expect(firstTrick.winnerPlayerId).toBe('p1');
        expect(firstTrick.winningCardWasTrumpCut).toBe(true);

        const firstCheck = checkConsecutiveWins(room, firstTrick.winnerPlayerId, firstTrick.winningCard, {
            winningCardWasTrumpCut: firstTrick.winningCardWasTrumpCut,
        });
        expect(firstCheck.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(true);

        room.currentTurn = 6;
        room.currentPlayerIndex = 1;
        room.activeSuit = 'D';
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'D', value: 10, id: 'D-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: { suit: 'D', value: 14, id: 'D-14' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p2', card: { suit: 'D', value: 12, id: 'D-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'D', value: 13, id: 'D-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const secondTrick = resolveTrick(room);
        expect(secondTrick.winnerPlayerId).toBe('p1');
        expect(secondTrick.winningCardWasTrumpCut).toBe(false);

        const secondCheck = checkConsecutiveWins(room, secondTrick.winnerPlayerId, secondTrick.winningCard, {
            winningCardWasTrumpCut: secondTrick.winningCardWasTrumpCut,
        });
        expect(secondCheck.roundOver).toBe(true);
        expect(secondCheck.winnerTeam).toBe(1);
        expect(room.consecutiveBowlingWins).toBe(2);
    });

    test('Normal hidden mode ends when a bowler wins with a trump-cut Ace and then wins the next trick with any Ace', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.activeSuit = 'H';
        room.currentTurn = 5;
        room.currentPlayerIndex = 1;
        room.lastTrickWinnerPlayerId = 'p0';
        room.consecutiveBowlingWins = 0;
        room.lastTrickWasAce = false;
        room.lastTrickWasTrumpCutAce = false;
        room.players[1].hand = [
            { suit: 'S', value: 14, id: 'S-14' },
            { suit: 'D', value: 14, id: 'D-14' },
        ];
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'H', value: 10, id: 'H-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: null, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: 'p2', card: { suit: 'H', value: 12, id: 'H-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'H', value: 13, id: 'H-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const firstPlay = validatePlay(room, 'p1', 'S-14');
        expect(firstPlay.valid).toBe(true);
        room.trickCards[1].card = room.players[1].hand.find((card) => card.id === 'S-14');
        room.trickCards[1].playedAfterTrumpReveal = true;

        const firstTrick = resolveTrick(room);
        expect(firstTrick.winnerPlayerId).toBe('p1');
        expect(firstTrick.winningCard).toEqual({ suit: 'S', value: 14, id: 'S-14' });
        expect(firstTrick.winningCardWasTrumpCut).toBe(true);

        const firstCheck = checkConsecutiveWins(room, firstTrick.winnerPlayerId, firstTrick.winningCard, {
            winningCardWasTrumpCut: firstTrick.winningCardWasTrumpCut,
        });
        expect(firstCheck.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(true);

        room.currentTurn = 6;
        room.currentPlayerIndex = 1;
        room.activeSuit = 'D';
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'D', value: 10, id: 'D-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: { suit: 'D', value: 14, id: 'D-14' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p2', card: { suit: 'D', value: 12, id: 'D-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'D', value: 13, id: 'D-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const secondTrick = resolveTrick(room);
        expect(secondTrick.winnerPlayerId).toBe('p1');
        expect(secondTrick.winningCard).toEqual({ suit: 'D', value: 14, id: 'D-14' });
        expect(secondTrick.winningCardWasTrumpCut).toBe(false);

        const secondCheck = checkConsecutiveWins(room, secondTrick.winnerPlayerId, secondTrick.winningCard, {
            winningCardWasTrumpCut: secondTrick.winningCardWasTrumpCut,
        });
        expect(secondCheck.roundOver).toBe(true);
        expect(secondCheck.winnerTeam).toBe(1);
        expect(room.consecutiveBowlingWins).toBe(2);
    });

    test('Normal hidden mode does not end when the first Ace followed suit instead of cutting with trump', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.activeSuit = 'H';
        room.currentTurn = 5;
        room.currentPlayerIndex = 1;
        room.lastTrickWinnerPlayerId = 'p0';
        room.consecutiveBowlingWins = 0;
        room.lastTrickWasAce = false;
        room.lastTrickWasTrumpCutAce = false;
        room.players[1].hand = [
            { suit: 'H', value: 14, id: 'H-14' },
            { suit: 'S', value: 14, id: 'S-14' },
        ];
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'H', value: 10, id: 'H-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: null, hidden: false, dead: false, playedAfterTrumpReveal: false },
            { playerId: 'p2', card: { suit: 'H', value: 12, id: 'H-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'H', value: 13, id: 'H-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const firstPlay = validatePlay(room, 'p1', 'H-14');
        expect(firstPlay.valid).toBe(true);
        room.trickCards[1].card = room.players[1].hand.find((card) => card.id === 'H-14');
        room.trickCards[1].playedAfterTrumpReveal = true;

        const firstTrick = resolveTrick(room);
        expect(firstTrick.winnerPlayerId).toBe('p1');
        expect(firstTrick.winningCard).toEqual({ suit: 'H', value: 14, id: 'H-14' });
        expect(firstTrick.winningCardWasTrumpCut).toBe(false);

        const firstCheck = checkConsecutiveWins(room, firstTrick.winnerPlayerId, firstTrick.winningCard, {
            winningCardWasTrumpCut: firstTrick.winningCardWasTrumpCut,
        });
        expect(firstCheck.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(false);

        room.currentTurn = 6;
        room.currentPlayerIndex = 1;
        room.activeSuit = 'S';
        room.trickCards = [
            { playerId: 'p0', card: { suit: 'S', value: 10, id: 'S-10' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p1', card: { suit: 'S', value: 14, id: 'S-14' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p2', card: { suit: 'S', value: 12, id: 'S-12' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
            { playerId: 'p3', card: { suit: 'S', value: 13, id: 'S-13' }, hidden: false, dead: false, playedAfterTrumpReveal: true },
        ];

        const secondTrick = resolveTrick(room);
        expect(secondTrick.winnerPlayerId).toBe('p1');
        expect(secondTrick.winningCard).toEqual({ suit: 'S', value: 14, id: 'S-14' });
        expect(secondTrick.winningCardWasTrumpCut).toBe(false);

        const secondCheck = checkConsecutiveWins(room, secondTrick.winnerPlayerId, secondTrick.winningCard, {
            winningCardWasTrumpCut: secondTrick.winningCardWasTrumpCut,
        });
        expect(secondCheck.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.lastTrickWasAce).toBe(true);
        expect(room.lastTrickWasTrumpCutAce).toBe(false);
    });

    test('Hidden-trump consecutive wins remember only the latest same-player win until trump is known', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.consecutiveBowlingWins = 1;
        room.trumpRevealed = false;

        const res = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 13, id: 'D-13' });
        expect(res.roundOver).toBe(false);
        expect(room.consecutiveWinBanked).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('First post-reveal bowling win does not end the round without a previous same-player win', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';

        const res = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 12, id: 'D-12' });

        expect(res.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('First post-reveal bowling win does not end the round if previous bowling win was a different player', () => {
        const room = makeRoom();
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        room.lastTrickWinnerPlayerId = 'p3';
        room.consecutiveBowlingWins = 1;

        const res = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 12, id: 'D-12' });

        expect(res.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('First post-reveal bowling win does not combine with a pre-reveal same-player streak', () => {
        const room = makeRoom();
        room.lastTrickWinnerPlayerId = 'p1';
        room.consecutiveBowlingWins = 1;
        room.trumpRevealed = false;

        const hiddenSecond = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 13, id: 'D-13' });
        expect(hiddenSecond.roundOver).toBe(false);
        expect(room.consecutiveBowlingWins).toBe(1);

        resetConsecutiveState(room);
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        const postReveal = checkConsecutiveWins(room, 'p1', { suit: 'C', value: 12, id: 'C-12' });

        expect(postReveal.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Older same-player win before reveal does not count if another bowler won the immediately previous counted trick', () => {
        const room = makeRoom();
        room.trumpRevealed = false;

        room.currentTurn = 1;
        const first = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });
        expect(first.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);

        room.currentTurn = 2;
        const second = checkConsecutiveWins(room, 'p3', { suit: 'D', value: 12, id: 'D-12' });
        expect(second.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p3');
        expect(room.consecutiveBowlingWins).toBe(1);

        // Trick 3 is the trump-reveal trick and is ignored by socketHandlers,
        // even if p1 wins it. The previous counted trick remains p3's Trick 2 win.
        room.currentTurn = 3;
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        expect(room.lastTrickWinnerPlayerId).toBe('p3');
        expect(room.consecutiveBowlingWins).toBe(1);

        room.currentTurn = 4;
        const fourth = checkConsecutiveWins(room, 'p1', { suit: 'C', value: 11, id: 'C-11' });
        expect(fourth.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);
    });

    test('Trump reveal trick resets the same-player bowling win streak', () => {
        const room = makeRoom();
        room.currentTurn = 1;
        room.trumpRevealed = false;

        const first = checkConsecutiveWins(room, 'p1', { suit: 'H', value: 13, id: 'H-13' });
        expect(first.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);

        // The reveal trick is skipped and the streak is reset by socketHandlers.
        room.currentTurn = 2;
        room.trumpRevealed = true;
        room.trumpSuit = 'S';
        resetConsecutiveState(room);
        expect(room.lastTrickWinnerPlayerId).toBe(null);
        expect(room.consecutiveBowlingWins).toBe(0);

        room.currentTurn = 3;
        const third = checkConsecutiveWins(room, 'p1', { suit: 'D', value: 12, id: 'D-12' });
        expect(third.roundOver).toBe(false);
        expect(room.lastTrickWinnerPlayerId).toBe('p1');
        expect(room.consecutiveBowlingWins).toBe(1);
    });
});
