/* eslint-disable no-console */

const { spawn } = require('child_process');
const path = require('path');

const { io } = require('socket.io-client');

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

async function main() {
    const cwd = path.resolve(__dirname);
    const server = spawn(process.execPath, ['index.js'], {
        cwd,
        env: { ...process.env, PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let done = false;

    const clients = [];

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

        if (message) {
            // eslint-disable-next-line no-console
            (code === 0 ? console.log : console.error)(message);
        }

        process.exit(code);
    }

    const overallTimeout = setTimeout(() => {
        cleanupAndExit(1, 'SMOKE_FAIL: overall timeout');
    }, 15000);

    server.on('exit', (code) => {
        if (!done) cleanupAndExit(1, `SMOKE_FAIL: server exited (${code})`);
    });

    let stdoutBuffer = '';
    let port = null;

    server.stdout.on('data', (d) => {
        stdoutBuffer += d.toString('utf8');
        const match = stdoutBuffer.match(/listening on (\d+)/);
        if (!match || port) return;

        port = Number(match[1]);

        // Kick off the smoke flow once the port is known.
        runFlow(port)
            .then(() => {
                clearTimeout(overallTimeout);
                cleanupAndExit(0, 'SMOKE_OK');
            })
            .catch((err) => {
                clearTimeout(overallTimeout);
                cleanupAndExit(1, `SMOKE_FAIL: ${err && err.message ? err.message : String(err)}`);
            });
    });

    server.stderr.on('data', (d) => {
        const s = d.toString('utf8').trim();
        if (s) console.error(s);
    });

    async function runFlow(actualPort) {
        const url = `http://localhost:${actualPort}`;
        const names = ['Host', 'P2', 'P3', 'P4'];

        const sockets = names.map(() =>
            io(url, {
                transports: ['websocket'],
                timeout: 5000,
                forceNew: true,
                reconnection: false,
            })
        );

        clients.push(...sockets);

        await Promise.all(sockets.map((s) => waitFor(s, 'connect', 5000)));

        const idsByName = Object.create(null);

        // Non-hosts learn their playerId via room_update.
        for (let i = 1; i < sockets.length; i++) {
            sockets[i].on('room_update', (payload) => {
                for (const p of payload.players || []) {
                    if (p && p.name && p.id) idsByName[p.name] = p.id;
                }
            });
        }

        const host = sockets[0];
        host.emit('create_room', { playerName: names[0] });

        const [created] = await waitFor(host, 'room_created', 5000);
        if (!created || !created.roomCode || !created.playerId) {
            throw new Error('missing room_created payload');
        }

        const roomCode = created.roomCode;
        idsByName[names[0]] = created.playerId;

        for (let i = 1; i < sockets.length; i++) {
            sockets[i].emit('join_room', { roomCode, playerName: names[i] });
        }

        // Give room_update a moment to propagate so we can map toss winner -> socket.
        await wait(300);

        let tossWinnerId = null;
        for (const s of sockets) {
            s.on('toss_result', (payload) => {
                if (payload && payload.winnerPlayerId) tossWinnerId = payload.winnerPlayerId;
            });
        }

        host.emit('start_game', { roomCode });

        const tossDeadline = Date.now() + 5000;
        while (!tossWinnerId && Date.now() < tossDeadline) {
            await wait(50);
        }
        if (!tossWinnerId) throw new Error('did not receive toss_result');

        // Map toss winner id to a socket.
        let winnerSocket = null;
        for (let i = 0; i < sockets.length; i++) {
            if (idsByName[names[i]] === tossWinnerId) winnerSocket = sockets[i];
        }

        // In case a room_update arrived late.
        if (!winnerSocket) {
            await wait(200);
            for (let i = 0; i < sockets.length; i++) {
                if (idsByName[names[i]] === tossWinnerId) winnerSocket = sockets[i];
            }
        }

        if (!winnerSocket) throw new Error('could not map toss winner to socket');

        let handsReceived = 0;
        for (const s of sockets) {
            s.once('deal_hand', () => {
                handsReceived += 1;
            });
        }

        winnerSocket.emit('select_batter', { roomCode, targetPlayerId: tossWinnerId });

        const handsDeadline = Date.now() + 2000;
        while (handsReceived < 4 && Date.now() < handsDeadline) {
            await wait(25);
        }

        if (handsReceived < 4) throw new Error('did not receive all deal_hand events');
    }
}

main().catch((err) => {
    console.error(`SMOKE_FAIL: ${err && err.message ? err.message : String(err)}`);
    process.exit(1);
});
