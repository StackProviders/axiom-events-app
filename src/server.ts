import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { launchBrowser } from './services/browser';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: false }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(config.PORT, async () => {
    console.log(`Socket.IO server running on http://localhost:${config.PORT}`);
    await launchBrowser(io);
});
