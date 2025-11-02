import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { launchBrowser, subscribePriceTracker, unsubscribePriceTracker, subscribeNewPair, unsubscribeNewPair, cleanupClientSubscriptions, setEmitCallback } from './services/browser';
import { PriceTrackerSubscription, NewPairSubscription } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: false }
});

const newPairSubscribers = new Set<string>();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('axiom-new-pair-subscribe', async (data: NewPairSubscription) => {
        newPairSubscribers.add(socket.id);
        await subscribeNewPair(socket.id, data.chainId);
    });

    socket.on('axiom-new-pair-unsubscribe', async (data: NewPairSubscription) => {
        newPairSubscribers.delete(socket.id);
        await unsubscribeNewPair(socket.id, data.chainId);
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
