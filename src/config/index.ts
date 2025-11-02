import path from 'path';

export const config = {
    PORT: 5000,
    PROFILE_PATH: path.join(process.cwd(), 'chrome-profile'),
    AXIOM_WS_URL: 'wss://cluster-global2.axiom.trade',
    TARGET_URL: 'https://axiom.trade/pulse?chain=sol'
};
