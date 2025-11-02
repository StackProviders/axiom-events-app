import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Server } from 'socket.io';
import { config } from '../config';
import { NewPairEvent } from '../types';

chromium.use(StealthPlugin());

export async function launchBrowser(io: Server) {
    const browser = await chromium.launchPersistentContext(config.PROFILE_PATH, {
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = browser.pages()[0] || (await browser.newPage());

    page.on('websocket', (ws) => {
        console.log('WebSocket detected:', ws.url());
        if (ws.url().startsWith(config.AXIOM_WS_URL)) {
            console.log('Axiom WebSocket connected');

            ws.on('framereceived', (event) => {
                try {
                    const payload =
                        typeof event.payload === 'string'
                            ? event.payload
                            : event.payload.toString();
                    const parsed = JSON.parse(payload);
                    if (parsed.room === 'new_pairs') {
                        const data: NewPairEvent = {
                            type: 'newPair',
                            timeStamp: Date.now(),
                            data: parsed
                        };
                        io.emit('axiom-event', data);
                        console.log('New pair detected:', data);
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            });
        }
    });

    console.log('Navigating to:', config.TARGET_URL);
    await page.goto(config.TARGET_URL);
    console.log('Page loaded successfully');
}
