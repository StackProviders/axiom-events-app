import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { launchBrowser, subscribePriceTracker, unsubscribePriceTracker, cleanupClientSubscriptions } from './services/browser';
import { PriceTrackerSubscription } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: false }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('axiom-price-tracker', async (data: PriceTrackerSubscription) => {
        await subscribePriceTracker(socket.id, data.pairAddress, data.chainId);
    });

    socket.on('axiom-price-tracker-unsubscribe', async (data: PriceTrackerSubscription) => {
        await unsubscribePriceTracker(socket.id, data.pairAddress, data.chainId);
    });

    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);
        await cleanupClientSubscriptions(socket.id);
    });
});

server.listen(config.PORT, async () => {
    console.log(`Socket.IO server running on http://localhost:${config.PORT}`);
    await launchBrowser(io);
});}
