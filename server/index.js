import http from 'http';

import express from 'express';
import { Server } from 'socket.io';

import { registerSocketHandlers } from './socketHandlers.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

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
});
