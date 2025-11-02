import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { launchBrowser, subscribePriceTracker, unsubscribePriceTracker, cleanupClientSubscriptions, setEmitCallback } from './services/browser';
import { PriceTrackerSubscription } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: false }
});

const newPairSubscribers = new Set<string>();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('axiom-new-pair-subscribe', () => {
        newPairSubscribers.add(socket.id);
        console.log(`Client ${socket.id} subscribed to new pairs`);
    });

    socket.on('axiom-new-pair-unsubscribe', () => {
        newPairSubscribers.delete(socket.id);
        console.log(`Client ${socket.id} unsubscribed from new pairs`);
    });

    socket.on('axiom-price-tracker', async (data: PriceTrackerSubscription) => {
        await subscribePriceTracker(socket.id, data.pairAddress, data.chainId);
    });

    socket.on('axiom-price-tracker-unsubscribe', async (data: PriceTrackerSubscription) => {
        await unsubscribePriceTracker(socket.id, data.pairAddress, data.chainId);
    });

    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);
        newPairSubscribers.delete(socket.id);
        await cleanupClientSubscriptions(socket.id);
    });
});

export function emitToNewPairSubscribers(event: string, data: any) {
    newPairSubscribers.forEach(socketId => {
        io.to(socketId).emit(event, data);
    });
}

server.listen(config.PORT, async () => {
    console.log(`Socket.IO server running on http://localhost:${config.PORT}`);
    setEmitCallback(emitToNewPairSubscribers);
    await launchBrowser(io);
});
