import path from 'path';
import os from 'os';

export const config = {
    PORT: 5000,
    VISIBLE_BROWSER: true,
    PROFILE_PATH: path.join(process.cwd(), 'chrome-profile'),
    AXIOM_WS_NEW_PAIRS_URL: ['wss://cluster9.axiom.trade', 'wss://cluster-global2.axiom.trade'],
    AXIOM_WS_PRICE_TRACKER_URL: ['wss://cluster9.axiom.trade/?', 'wss://cluster-global2.axiom.trade/?'],
    TARGET_NEW_PAIRS_URL: 'https://axiom.trade/pulse',
    TARGET_PRICE_TRACKER_URL: 'https://axiom.trade/meme/',
    CHROMIUM_PATH: path.join(
        os.homedir(),
        'AppData',
        'Local',
        'ms-playwright',
        'chromium-1194',
        'chrome-win',
        'chrome.exe'
    )
};
