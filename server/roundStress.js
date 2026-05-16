/* eslint-disable no-console */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ROUNDS = Number(process.env.ROUNDS || 12);
const OVERALL_TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 60000);

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(emitter, event, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`timeout waiting for ${event}`));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timeout);
            emitter.off(event, handler);
        }

        function handler(...args) {
            cleanup();
            resolve(args);
        }

        emitter.on(event, handler);
    });
}

function chooseLegalCard(hand, activeSuit) {
    if (!hand.length) return null;
    if (!activeSuit) return hand[0];
    return hand.find((card) => card.suit === activeSuit) || hand[0];
}

async function main() {
    const server = spawn(process.execPath, ['index.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let done = false;
    let flowStarted = false;
    const clients = [];
    const handsByPlayerId = new Map();
    const playerIdsByIndex = new Map();
    const socketsByPlayerId = new Map();
    const names = ['Host', 'P2', 'P3', 'P4'];
    let roomCode = null;
    let roundsCompleted = 0;
    const attemptedPlayKeys = new Set();
    let currentPhase = 'lobby';
    let lastAttemptedPlayKey = null;
    let lastState = null;
    let roundTransitioning = false;

    function cleanupAndExit(code, message) {
        if (done) return;
        done = true;

        for (const c of clients) {
            try {
                c.disconnect();
            } catch {
                // ignore
            }
        }

        try {
            server.kill('SIGTERM');
        } catch {
            // ignore
        }

        if (message) (code === 0 ? console.log : console.error)(message);
        process.exit(code);
    }

    const overallTimeout = setTimeout(() => {
        cleanupAndExit(1, `ROUND_STRESS_FAIL: timeout after ${roundsCompleted} rounds`);
    }, OVERALL_TIMEOUT_MS);

    server.on('exit', (code, signal) => {
        if (!done) cleanupAndExit(1, `ROUND_STRESS_FAIL: server exited after ${roundsCompleted} rounds (code=${code}, signal=${signal})`);
    });

    server.stderr.on('data', (d) => {
        const s = d.toString('utf8').trim();
        if (s) console.error(`[server stderr] ${s}`);
    });

    let stdoutBuffer = '';
    server.stdout.on('data', (d) => {
        const s = d.toString('utf8');
        stdoutBuffer += s;
        process.stdout.write(`[server] ${s}`);

        const match = stdoutBuffer.match(/listening on (\d+)/);
        if (!match || flowStarted) return;
        flowStarted = true;

        const port = Number(match[1]);
        runFlow(port)
            .then(() => {
                clearTimeout(overallTimeout);
                cleanupAndExit(0, `ROUND_STRESS_OK: completed ${roundsCompleted} rounds without disconnect`);
            })
            .catch((err) => {
                clearTimeout(overallTimeout);
                cleanupAndExit(1, `ROUND_STRESS_FAIL: ${err && err.message ? err.message : String(err)}`);
            });
    });

    async function runFlow(port) {
        const url = `http://localhost:${port}`;
        const sockets = names.map(() =>
            io(url, {
                transports: ['websocket'],
                timeout: 5000,
                forceNew: true,
                reconnection: false,
            })
        );

        clients.push(...sockets);

        for (const socket of sockets) {
            socket.on('disconnect', (reason) => {
                if (!done) cleanupAndExit(1, `ROUND_STRESS_FAIL: socket disconnected after ${roundsCompleted} rounds (${reason})`);
            });
            socket.on('error', (payload) => {
                if (payload?.code === 'INVALID_CARD') {
                    if (lastAttemptedPlayKey) attemptedPlayKeys.delete(lastAttemptedPlayKey);
                    if (lastState) setTimeout(() => maybePlay(lastState.state, lastState.socket), 0);
                    return;
                }
                if (payload?.code === 'WRONG_TURN') return;
                if (!done) cleanupAndExit(1, `ROUND_STRESS_FAIL: socket error ${JSON.stringify(payload)}`);
            });
        }

        await Promise.all(sockets.map((s) => waitFor(s, 'connect', 5000)));

        sockets.forEach((socket, socketIndex) => {
            socket.on('room_update', (payload) => {
                for (const player of payload.players || []) {
                    playerIdsByIndex.set(player.playerIndex, player.id);
                    if (player.name === names[socketIndex]) {
                        socketsByPlayerId.set(player.id, socket);
                    }
                }
            });

            socket.on('deal_hand', (payload) => {
                roundTransitioning = false;
                const myId = [...socketsByPlayerId.entries()].find(([, s]) => s === socket)?.[0];
                if (myId) handsByPlayerId.set(myId, payload.hand || []);
                if (payload.batterNewHand && myId) handsByPlayerId.set(myId, payload.batterNewHand);
            });

            socket.on('trump_revealed', (payload) => {
                const myId = [...socketsByPlayerId.entries()].find(([, s]) => s === socket)?.[0];
                if (payload.batterNewHand && myId) handsByPlayerId.set(myId, payload.batterNewHand);
            });

            socket.on('round_result', (payload) => {
                roundTransitioning = true;
                if (socketIndex !== 0) return;
                roundsCompleted += 1;
                console.log(`round ${roundsCompleted}: winnerTeam=${payload.winnerTeam}, reason=${payload.reason || '?'}`);
                for (const s of sockets) s.emit('ready_next_round', { roomCode });
            });

            socket.on('game_state', (state) => {
                currentPhase = state.phase || currentPhase;
                maybePlay(state, socket);
            });
        });

        const host = sockets[0];
        host.emit('create_room', { playerName: names[0] });
        const [created] = await waitFor(host, 'room_created', 5000);
        roomCode = created.roomCode;
        socketsByPlayerId.set(created.playerId, host);

        for (let i = 1; i < sockets.length; i += 1) {
            sockets[i].emit('join_room', { roomCode, playerName: names[i] });
        }

        await wait(300);

        let tossWinnerId = null;
        for (const socket of sockets) {
            socket.on('toss_result', (payload) => {
                tossWinnerId = payload.winnerPlayerId;
            });
        }

        host.emit('start_game', { roomCode });

        const tossDeadline = Date.now() + 5000;
        while (!tossWinnerId && Date.now() < tossDeadline) await wait(25);
        if (!tossWinnerId) throw new Error('did not receive toss_result');

        const winnerSocket = socketsByPlayerId.get(tossWinnerId);
        if (!winnerSocket) throw new Error('could not map toss winner socket');

        winnerSocket.emit('select_batter', { roomCode, targetPlayerId: tossWinnerId });

        const doneDeadline = Date.now() + OVERALL_TIMEOUT_MS - 2000;
        while (roundsCompleted < TARGET_ROUNDS && Date.now() < doneDeadline) {
            await wait(25);
        }

        if (roundsCompleted < TARGET_ROUNDS) {
            throw new Error(`only completed ${roundsCompleted}/${TARGET_ROUNDS} rounds`);
        }
    }

    function maybePlay(state, sourceSocket) {
        lastState = { state, socket: sourceSocket };
        if (!roomCode) return;
        if (roundTransitioning) return;
        if (state.phase !== 'playing' && state.phase !== 'open_window') return;

        const playerId = playerIdsByIndex.get(state.currentPlayerIndex);
        if (!playerId) return;

        const socket = socketsByPlayerId.get(playerId);
        const hand = handsByPlayerId.get(playerId) || [];
        if (!socket || !hand.length) return;
        if (sourceSocket && sourceSocket !== socket) return;

        const alreadyPlayed = (state.trickCards || []).some((slot) => slot.playerId === playerId && slot.card);
        if (alreadyPlayed) return;

        const playedCount = (state.trickCards || []).filter((slot) => slot.card).length;
        const playKey = `${state.currentBatterIndex}:${state.currentRound}:${state.currentTurn}:${state.currentPlayerIndex}:${playedCount}`;
        if (attemptedPlayKeys.has(playKey)) return;
        attemptedPlayKeys.add(playKey);
        lastAttemptedPlayKey = playKey;

        const card = chooseLegalCard(hand, state.activeSuit);
        if (!card) return;

        handsByPlayerId.set(playerId, hand.filter((c) => c.id !== card.id));
        socket.emit('play_card', { roomCode, cardId: card.id });
    }
}

main().catch((err) => {
    console.error(`ROUND_STRESS_FAIL: ${err && err.message ? err.message : String(err)}`);
    process.exit(1);
});
