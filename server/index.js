import http from 'http';

import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';

import { registerSocketHandlers } from './socketHandlers.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const startedAt = new Date();

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
    httpServer.close(() => {
        logLifecycle('httpServerClosed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logLifecycle('SIGINT');
    httpServer.close(() => {
        logLifecycle('httpServerClosed');
        process.exit(0);
    });
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

const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
    const address = httpServer.address();
    const actualPort = address && typeof address === 'object' ? address.port : PORT;
    console.log(`Rang Advance server listening on ${actualPort}`);
    logLifecycle('listening', { port: actualPort });
});
