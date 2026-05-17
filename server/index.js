import http from 'http';

import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';

import { registerSocketHandlers } from './socketHandlers.js';
import { getRoomsDebugSnapshot } from './rooms.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const HEALTH_LOG_INTERVAL_MS = Number(process.env.SERVER_HEALTH_LOG_INTERVAL_MS || 60_000);
const startedAt = new Date();
let healthLogTimer = null;

function logLifecycle(event, extra = {}) {
    const payload = {
        event,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: startedAt.toISOString(),
        ...extra,
    };
    console.log(`Server lifecycle ${JSON.stringify(payload)}`);
}

function buildServerHealth(io) {
    const memory = process.memoryUsage();
    return {
        sockets: io?.engine?.clientsCount || 0,
        rooms: getRoomsDebugSnapshot(),
        memory: {
            rssMb: Math.round(memory.rss / 1024 / 1024),
            heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        },
    };
}

function clearHealthLogging() {
    if (healthLogTimer) {
        clearInterval(healthLogTimer);
        healthLogTimer = null;
    }
}

process.on('uncaughtException', (err) => {
    logLifecycle('uncaughtException', {
        message: err?.message,
        stack: err?.stack,
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logLifecycle('unhandledRejection', {
        reason: reason instanceof Error
            ? { message: reason.message, stack: reason.stack }
            : reason,
    });
});

process.on('SIGTERM', () => {
    logLifecycle('SIGTERM');
    clearHealthLogging();
    httpServer.close(() => {
        logLifecycle('httpServerClosed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logLifecycle('SIGINT');
    clearHealthLogging();
    httpServer.close(() => {
        logLifecycle('httpServerClosed');
        process.exit(0);
    });
});

process.on('exit', (code) => {
    logLifecycle('exit', { code });
});

const app = express();

const httpServer = http.createServer(app);

const CLIENT_URL =
    process.env.CLIENT_URL ||
    'http://localhost:5173';

app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
}));

app.get('/healthz', (_req, res) => {
    res.json({
        ok: true,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: startedAt.toISOString(),
        ...buildServerHealth(io),
    });
});

const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 1e7, // 10 MB
    pingTimeout: 60000

});

io.on('connection', (socket) => {
    console.log(`Socket lifecycle ${JSON.stringify({
        event: 'connection',
        socketId: socket.id,
        transport: socket.conn?.transport?.name || null,
        address: socket.handshake?.address || null,
        userAgent: socket.handshake?.headers?.['user-agent'] || null,
        sockets: io.engine?.clientsCount || 0,
    })}`);
    registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
    const address = httpServer.address();
    const actualPort = address && typeof address === 'object' ? address.port : PORT;
    console.log(`Rang Advance server listening on ${actualPort}`);
    logLifecycle('listening', { port: actualPort });

    if (HEALTH_LOG_INTERVAL_MS > 0) {
        healthLogTimer = setInterval(() => {
            logLifecycle('health', buildServerHealth(io));
        }, HEALTH_LOG_INTERVAL_MS);
        healthLogTimer.unref?.();
    }
});
