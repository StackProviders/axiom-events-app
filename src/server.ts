import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { launchBrowser, subscribePriceTracker, unsubscribePriceTracker, subscribeNewPair, unsubscribeNewPair, cleanupClientSubscriptions, setEmitCallback } from './services/browser.js';
import { PriceTrackerSubscription, NewPairSubscription } from './types/index.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: false },
    transports: ['websocket', 'polling']
});

const newPairSubscribers = new Set<string>();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('axiom-new-pair-subscribe', async (data: NewPairSubscription) => {
        const chainId = data?.chainId || 'sol';
        newPairSubscribers.add(socket.id);
        await subscribeNewPair(socket.id, chainId);
    });

    socket.on('axiom-new-pair-unsubscribe', async (data: NewPairSubscription) => {
        const chainId = data?.chainId || 'sol';
        newPairSubscribers.delete(socket.id);
        await unsubscribeNewPair(socket.id, chainId);
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
