const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const io = require('socket.io-client');
const path = require('path');

chromium.use(StealthPlugin());

const PROFILE_PATH = path.join(__dirname, 'chrome-profile');
const SOCKET_SERVER = 'http://localhost:3000';
const AXIOM_WS_URL = 'wss://cluster-global2.axiom.trade';

async function launchWithProfile() {
    const socket = io(SOCKET_SERVER);

    socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
    });

    const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();

    // Track WebSocket connections
    page.on('websocket', (ws) => {
        if (ws.url().startsWith(AXIOM_WS_URL)) {
            console.log(`Axiom WebSocket connected: ${ws.url()}`);

            // ws.on('framesent', (event) => {
            //     const data = { type: 'sent', url: ws.url(), payload: event.payload };
            //     socket.emit('axiom-event', data);
            //     console.log('Axiom WS sent:', data);
            // });

            ws.on('framereceived', (event) => {
                try {
                    const parsed = JSON.parse(event.payload);

                    if (parsed.room === 'new_pairs') {
                        const data = { type: 'newPair', data: JSON.parse(event.payload) };
                        socket.emit('axiom-event', data);
                        console.log('New pair detected:', data);
                    }
                } catch (e) {}
            });

            ws.on('close', () => {
                socket.emit('axiom-event', { type: 'closed', url: ws.url() });
            });
        }
    });

    await page.goto('https://axiom.trade/pulse?chain=sol'); // Change to your target URL

    return { browser, socket };
}

launchWithProfile().catch(console.error);
