import path from 'path';
import os from 'os';

export const config = {
    PORT: 5000,
    VISIBLE_BROWSER: true,
    PROFILE_PATH: path.join(process.cwd(), 'chrome-profile'),
    AXIOM_WS_URL: ['wss://cluster9.axiom.trade', 'wss://cluster-global2.axiom.trade'],
    TARGET_URL: 'https://axiom.trade/pulse?chain=sol',
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
