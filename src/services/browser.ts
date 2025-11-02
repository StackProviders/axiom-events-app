import { chromium } from 'playwright-extra';
import type { BrowserContext, Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Server } from 'socket.io';
import { config } from '../config';
import { NewPairEvent } from '../types';

chromium.use(StealthPlugin());

let browserContext: BrowserContext;
const priceTrackerPages = new Map<string, { page: Page; subscribers: Set<string> }>();
let emitCallback: (event: string, data: any) => void;

export function setEmitCallback(callback: (event: string, data: any) => void) {
    emitCallback = callback;
}

export async function launchBrowser(io: Server) {
    browserContext = await chromium.launchPersistentContext(config.PROFILE_PATH, {
        headless: !config.VISIBLE_BROWSER,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
        executablePath: config.CHROMIUM_PATH
    });

    const page = browserContext.pages()[0] || (await browserContext.newPage());

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
                        if (emitCallback) {
                            emitCallback('axiom-new-pair', data);
                        }
                        // console.log('New pair detected:', data);
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

export async function subscribePriceTracker(socketId: string, pairAddress: string, chainId: string) {
    const key = `${pairAddress}-${chainId}`;
    
    if (priceTrackerPages.has(key)) {
        priceTrackerPages.get(key)!.subscribers.add(socketId);
        console.log(`Client ${socketId} subscribed to existing page: ${key}`);
        return;
    }

    const page = await browserContext.newPage();
    const url = `https://axiom.trade/meme/${pairAddress}?chain=${chainId}`;
    await page.goto(url);
    
    priceTrackerPages.set(key, { page, subscribers: new Set([socketId]) });
    console.log(`New page opened for ${key}, subscriber: ${socketId}`);
}

export async function unsubscribePriceTracker(socketId: string, pairAddress: string, chainId: string) {
    const key = `${pairAddress}-${chainId}`;
    const tracker = priceTrackerPages.get(key);
    
    if (!tracker) return;
    
    tracker.subscribers.delete(socketId);
    console.log(`Client ${socketId} unsubscribed from ${key}`);
    
    if (tracker.subscribers.size === 0) {
        await tracker.page.close();
        priceTrackerPages.delete(key);
        console.log(`Page closed for ${key} (no subscribers)`);
    }
}

export async function cleanupClientSubscriptions(socketId: string) {
    for (const [key, tracker] of priceTrackerPages.entries()) {
        if (tracker.subscribers.has(socketId)) {
            tracker.subscribers.delete(socketId);
            if (tracker.subscribers.size === 0) {
                await tracker.page.close();
                priceTrackerPages.delete(key);
                console.log(`Page closed for ${key} (client disconnected)`);
            }
        }
    }
}
