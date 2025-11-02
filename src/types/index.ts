export interface ProtocolDetails {
    global: string;
    feeRecipient: string;
    associatedBondingCurve: string;
    eventAuthority: string;
    creator: string;
    isOffchain: boolean;
}

export interface Extra {
    migratedFrom: string | null;
    pumpDeployerAddress: string | null;
    altDeployerAddress: string | null;
}

export interface NewPairContent {
    pair_address: string;
    signature: string;
    token_address: string;
    token_name: string;
    token_ticker: string;
    token_image: string | null;
    token_uri: string | null;
    token_decimals: number;
    pair_sol_account: string;
    pair_token_account: string;
    protocol: string;
    protocol_details: ProtocolDetails;
    created_at: string;
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
    mint_authority: string | null;
    open_trading: string;
    deployer_address: string;
    supply: number;
    initial_liquidity_sol: number;
    initial_liquidity_token: number;
    top_10_holders: number;
    lp_burned: number;
    updated_at: string;
    dev_holds_percent: number;
    snipers_hold_percent: number;
    freeze_authority: string | null;
    extra: Extra | null;
    slot: number;
}

export interface NewPairEvent {
    type: 'newPair';
    timeStamp: number;
    data: {
        room: 'new_pairs';
        content: NewPairContent;
    };
}
