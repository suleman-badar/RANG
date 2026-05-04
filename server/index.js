import http from 'http';

import express from 'express';
import { Server } from 'socket.io';

import { registerSocketHandlers } from './socketHandlers.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
    // Intentionally minimal log for deployment environments.
    const address = httpServer.address();
    const actualPort = address && typeof address === 'object' ? address.port : PORT;
    console.log(`Rang Advance server listening on ${actualPort}`);
});
