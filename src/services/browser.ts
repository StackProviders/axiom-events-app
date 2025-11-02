import { chromium } from 'playwright-extra';
import type { BrowserContext, Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Server } from 'socket.io';
import { config } from '../config';
import { NewPairEvent, PriceTrackerContent } from '../types';

chromium.use(StealthPlugin());

let browserContext: BrowserContext;
const priceTrackerPages = new Map<string, { page: Page; subscribers: Set<string> }>();
const newPairPages = new Map<string, { page: Page; subscribers: Set<string> }>();
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
}

function setupWebSocketListener(page: Page, pairAddress: string | null = null) {
    page.on('websocket', (ws) => {
        const isNewPairWS = config.AXIOM_WS_NEW_PAIRS_URL.some((url) => ws.url().startsWith(url));
        const isPriceTrackerWS = config.AXIOM_WS_PRICE_TRACKER_URL.some((url) => ws.url().startsWith(url));
        
        if (isNewPairWS || isPriceTrackerWS) {
            console.log('Axiom WebSocket connected:', ws.url(), pairAddress ? `[Pair: ${pairAddress}]` : '[New Pairs]');

            ws.on('framereceived', (event) => {
                try {
                    const payload = typeof event.payload === 'string' ? event.payload : event.payload.toString();
                    const parsed = JSON.parse(payload);
                    
                    if (pairAddress) {
                        console.log('WS Frame received for pair:', pairAddress, 'Room:', parsed.room);
                    }
                    
                    if (parsed.room === 'new_pairs') {
                        const data: NewPairEvent = {
                            type: 'newPair',
                            timeStamp: Date.now(),
                            data: parsed?.content || {}
                        };
                        if (emitCallback) {
                            emitCallback('axiom-new-pair', data);
                        }
                    }
                    if (pairAddress && parsed.room === `f:${pairAddress}`) {
                        const data: PriceTrackerContent = {
                            type: 'priceTracker',
                            timeStamp: Date.now(),
                            data: parsed?.content || {}
                        };
                        console.log('Price tracker data:', data);
                        if (emitCallback) {
                            emitCallback('axiom-price-tracker', data);
                        }
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            });
        }
    });
}

export async function subscribeNewPair(socketId: string, chainId: string) {
    if (newPairPages.has(chainId)) {
        newPairPages.get(chainId)!.subscribers.add(socketId);
        console.log(`Client ${socketId} subscribed to existing new pair page: ${chainId}`);
        return;
    }

    const page = await browserContext.newPage();
    setupWebSocketListener(page);
    const url = `${config.TARGET_NEW_PAIRS_URL}?chain=${chainId}`;
    await page.goto(url);
    
    newPairPages.set(chainId, { page, subscribers: new Set([socketId]) });
    console.log(`New pair page opened for chain: ${chainId}, subscriber: ${socketId}`);

    
}

export async function unsubscribeNewPair(socketId: string, chainId: string) {
    const tracker = newPairPages.get(chainId);
    if (!tracker) return;
    
    tracker.subscribers.delete(socketId);
    console.log(`Client ${socketId} unsubscribed from new pairs: ${chainId}`);
    
    if (tracker.subscribers.size === 0) {
        await tracker.page.close();
        newPairPages.delete(chainId);
        console.log(`New pair page closed for chain: ${chainId}`);
    }
}

export async function subscribePriceTracker(socketId: string, pairAddress: string, chainId: string) {
    const key = `${pairAddress}-${chainId}`;
    
    if (priceTrackerPages.has(key)) {
        priceTrackerPages.get(key)!.subscribers.add(socketId);
        console.log(`Client ${socketId} subscribed to existing price tracker: ${key}`);
        return;
    }

    const page = await browserContext.newPage();
    setupWebSocketListener(page, pairAddress);
    const url = `${config.TARGET_PRICE_TRACKER_URL}${pairAddress}?chain=${chainId}`;
    console.log('Opening price tracker URL:', url);
    await page.goto(url);
    
    priceTrackerPages.set(key, { page, subscribers: new Set([socketId]) });
    console.log(`Price tracker page opened: ${key}, subscriber: ${socketId}`);
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
                console.log(`Price tracker closed: ${key}`);
            }
        }
    }
    
    for (const [chainId, tracker] of newPairPages.entries()) {
        if (tracker.subscribers.has(socketId)) {
            tracker.subscribers.delete(socketId);
            if (tracker.subscribers.size === 0) {
                await tracker.page.close();
                newPairPages.delete(chainId);
                console.log(`New pair page closed: ${chainId}`);
            }
        }
    }
}
