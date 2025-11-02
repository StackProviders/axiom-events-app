const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

chromium.use(StealthPlugin());

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PROFILE_PATH = path.join(__dirname, 'chrome-profile');
const AXIOM_WS_URL = 'wss://cluster-global2.axiom.trade';

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = 5000;
server.listen(PORT, async () => {
    console.log(`Socket.IO server running on http://localhost:${PORT}`);

    const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();

    page.on('websocket', (ws) => {
        if (ws.url().startsWith(AXIOM_WS_URL)) {
            console.log(`Axiom WebSocket connected: ${ws.url()}`);

            ws.on('framereceived', (event) => {
                try {
                    const parsed = JSON.parse(event.payload);
                    if (parsed.room === 'new_pairs') {
                        const data = { type: 'newPair', timeStamp: Date.now(), data: parsed };
                        io.emit('axiom-event', data);
                        console.log('New pair detected:', parsed);
                    }
                } catch (e) {}
            });

            ws.on('close', () => {
                console.log('Axiom WebSocket closed');
            });
        }
    });

    await page.goto('https://axiom.trade/pulse?chain=sol');
});
