const { chromium } = require('playwright');
const io = require('socket.io-client');
const path = require('path');

const PROFILE_PATH = path.join(__dirname, 'chrome-profile');
const SOCKET_SERVER = 'http://localhost:3000'; // Change to your Socket.IO server

async function launchWithProfile() {
    const socket = io(SOCKET_SERVER);

    socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
    });

    const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
        headless: false,
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    // Track WebSocket connections
    page.on('websocket', (ws) => {
        console.log(`WebSocket opened: ${ws.url()}`);

        if (ws.url().includes('axiom')) {
            ws.on('framesent', (event) => {
                const data = { type: 'sent', url: ws.url(), payload: event.payload };
                socket.emit('axiom-event', data);
                console.log('Axiom WS sent:', data);
            });

            ws.on('framereceived', (event) => {
                const data = { type: 'received', url: ws.url(), payload: event.payload };
                socket.emit('axiom-event', data);
                console.log('Axiom WS received:', data);
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
