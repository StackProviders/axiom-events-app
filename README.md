# Axiom Events WebSocket Server

Real-time cryptocurrency pair tracking and price monitoring via WebSocket.

## Server Setup

```bash
# Install dependencies
pnpm install

# Start server
pnpm start
```

Server runs on `http://localhost:5000`

## Client Usage

### 1. Install Socket.IO Client

**Browser (CDN):**
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

**Node.js:**
```bash
npm install socket.io-client
```

### 2. Connect to Server

**Browser:**
```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
```

**Node.js (ESM):**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
```

### 3. Subscribe to New Pairs

Listen for newly created trading pairs on a blockchain.

**Subscribe:**
```javascript
socket.emit('axiom-new-pair-subscribe', { 
    chainId: 'sol'  // 'sol', 'eth', 'bsc', etc.
});
```

**Receive Events:**
```javascript
socket.on('axiom-new-pair', (data) => {
    console.log('New pair detected:', data);
    // Handle new pair data
});
```

**Unsubscribe:**
```javascript
socket.emit('axiom-new-pair-unsubscribe', { 
    chainId: 'sol' 
});
```

### 4. Track Token Prices

Monitor real-time price updates for specific trading pairs.

**Subscribe:**
```javascript
socket.emit('axiom-price-tracker', {
    pairAddress: '0x123...abc',  // Trading pair contract address
    chainId: 'sol'
});
```

**Receive Updates:**
```javascript
socket.on('axiom-price-tracker', (data) => {
    console.log(`${data.tokenTicker}: $${data.price}`);
    console.log(`Supply: ${data.supply}`);
    console.log(`Top 10 Holders: ${data.top10Holders}%`);
    console.log(`LP Burned: ${data.lpBurned}%`);
});
```

**Unsubscribe:**
```javascript
socket.emit('axiom-price-tracker-unsubscribe', {
    pairAddress: '0x123...abc',
    chainId: 'sol'
});
```

## Complete Examples

### Node.js Client (ESM)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected:', socket.id);
    
    // Subscribe to new pairs on Solana
    socket.emit('axiom-new-pair-subscribe', { chainId: 'sol' });
    
    // Subscribe to price tracker
    socket.emit('axiom-price-tracker', {
        pairAddress: 'YOUR_PAIR_ADDRESS',
        chainId: 'sol'
    });
});

// Listen for new pairs
socket.on('axiom-new-pair', (data) => {
    console.log('New Pair Event:', data.type);
    console.log('Timestamp:', new Date(data.timeStamp));
    console.log('Token:', data.data.token_name, `(${data.data.token_ticker})`);
    console.log('Pair Address:', data.data.pair_address);
    console.log('Supply:', data.data.supply);
    console.log('Top 10 Holders:', data.data.top_10_holders + '%');
    console.log('LP Burned:', data.data.lp_burned + '%');
});

// Listen for price updates
socket.on('axiom-price-tracker', (data) => {
    console.log('Price Update:', data.type);
    console.log('Timestamp:', new Date(data.timeStamp));
    console.log(`${data.data.tokenTicker}: $${data.data.price}`);
    console.log(`Supply: ${data.data.supply?.toLocaleString()}`);
    console.log(`Top 10 Holders: ${data.data.top10Holders}%`);
    console.log(`LP Burned: ${data.data.lpBurned}%`);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});

// Graceful shutdown
process.on('SIGINT', () => {
    socket.disconnect();
    process.exit();
});
```

### Node.js Client (CommonJS)

```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected:', socket.id);
    
    socket.emit('axiom-new-pair-subscribe', { chainId: 'sol' });
    socket.emit('axiom-price-tracker', {
        pairAddress: 'YOUR_PAIR_ADDRESS',
        chainId: 'sol'
    });
});

socket.on('axiom-new-pair', (data) => {
    console.log('New pair:', data);
});

socket.on('axiom-price-tracker', (data) => {
    console.log('Price update:', data);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
```

### Browser Example

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
    <script>
        const socket = io('http://localhost:5000');
        
        // Connection events
        socket.on('connect', () => {
            console.log('Connected');
            
            // Subscribe to new pairs
            socket.emit('axiom-new-pair-subscribe', { chainId: 'sol' });
            
            // Subscribe to price tracker
            socket.emit('axiom-price-tracker', {
                pairAddress: 'YOUR_PAIR_ADDRESS',
                chainId: 'sol'
            });
        });
        
        // Listen for new pairs
        socket.on('axiom-new-pair', (data) => {
            console.log('New pair:', data);
        });
        
        // Listen for price updates
        socket.on('axiom-price-tracker', (data) => {
            console.log('Price update:', data);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected');
        });
    </script>
</body>
</html>
```

## Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `axiom-new-pair-subscribe` | `{ chainId: string }` | Subscribe to new pair events |
| `axiom-new-pair-unsubscribe` | `{ chainId: string }` | Unsubscribe from new pair events |
| `axiom-price-tracker` | `{ pairAddress: string, chainId: string }` | Subscribe to price updates |
| `axiom-price-tracker-unsubscribe` | `{ pairAddress: string, chainId: string }` | Unsubscribe from price updates |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `axiom-new-pair` | `{ type, timeStamp, data: NewPairContent }` | Emitted when new pair detected |
| `axiom-price-tracker` | `{ type, timeStamp, data: { pairAddress, price, tokenName, tokenTicker, supply, top10Holders, lpBurned } }` | Real-time price data |

### Data Structures

**NewPairContent:**
```typescript
{
    pair_address: string;
    token_address: string;
    token_name: string;
    token_ticker: string;
    token_decimals: number;
    protocol: string;
    supply: number;
    top_10_holders: number;
    lp_burned: number;
    initial_liquidity_sol: number;
    deployer_address: string;
    created_at: string;
    // ... additional fields
}
```

**PriceTrackerData:**
```typescript
{
    pairAddress: string;
    price: number;
    tokenName?: string;
    tokenTicker?: string;
    supply?: number;
    top10Holders?: number;
    lpBurned?: number;
}
```

## Testing

**Browser:** Open `client-test.html` in your browser to test all features with a UI.

**Node.js:** Create a test script using the examples above and run with `node client.js`

## Node.js Setup Instructions

### 1. Create Project

```bash
mkdir axiom-client
cd axiom-client
npm init -y
npm install socket.io-client
```

### 2. For ESM (Recommended)

Add to `package.json`:
```json
{
  "type": "module"
}
```

Create `client.js`:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected');
    socket.emit('axiom-new-pair-subscribe', { chainId: 'sol' });
});

socket.on('axiom-new-pair', (data) => {
    console.log('New pair:', data.data.token_name);
});
```

Run:
```bash
node client.js
```

### 3. For CommonJS

Create `client.js`:
```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected');
    socket.emit('axiom-new-pair-subscribe', { chainId: 'sol' });
});

socket.on('axiom-new-pair', (data) => {
    console.log('New pair:', data.data.token_name);
});
```

Run:
```bash
node client.js
```

## Notes

- Subscriptions are automatically cleaned up on disconnect
- Multiple clients can subscribe simultaneously
- Chain IDs: `sol` (Solana), `eth` (Ethereum), `bsc` (Binance Smart Chain), etc.
- Server must be running before connecting clients
- Events include timestamps in milliseconds (use `new Date(data.timeStamp)`)
