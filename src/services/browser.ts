import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Server } from 'socket.io';
import { config } from '../config';
import { NewPairEvent } from '../types';

chromium.use(StealthPlugin());

export async function launchBrowser(io: Server) {
    const browser = await chromium.launchPersistentContext(config.PROFILE_PATH, {
        headless: !config.VISIBLE_BROWSER,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
        executablePath: config.CHROMIUM_PATH
    });

    const page = browser.pages()[0] || (await browser.newPage());

    page.on('websocket', (ws) => {
        const isAxiomWS = config.AXIOM_WS_URL.some((url) => ws.url().startsWith(url));
        if (isAxiomWS) {
            console.log('Axiom WebSocket connected:', ws.url());

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
                            data: parsed?.content || {}
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
