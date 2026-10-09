# NanoAPI Gateway ⚡

**Real-Time Pay-Per-Request AI API Infrastructure on Arc Mainnet with Circle Gateway Unified Balance and x402 V2 Nanopayments.**

[![Arc Mainnet](https://img.shields.io/badge/Network-Arc%20Mainnet%20(5042)-blue.svg)](https://explorer.arc.io)
[![Circle Gateway](https://img.shields.io/badge/Settlement-Circle%20Gateway%20Domain%2026-green.svg)](https://gateway-api.circle.com)
[![x402 V2](https://img.shields.io/badge/Protocol-x402%20V2-orange.svg)](https://x402.org)
[![USDC](https://img.shields.io/badge/Currency-USDC%20(6%20Decimals)-2775CA.svg)](https://circle.com/usdc)

---

## 1. What is NanoAPI Gateway?

NanoAPI Gateway is a production payment gateway for autonomous AI agents and web developers that enables sub-cent micropayments ($0.001 – $0.005 USDC) for paid REST APIs without subscriptions, API keys, or credit card fees.

Traditional payment processors charge $0.30 + 2.9% per transaction, making sub-cent API calls impossible. By combining:
1. **Arc Mainnet** (Ultra-low latency EVM execution with sub-cent gas fees)
2. **Circle Gateway** (Cross-chain unified balance liquidity layer across Domain 26)
3. **x402 V2 Protocol** (HTTP 402 Payment Required machine-to-machine payment protocol)
4. **Server-Side Authoritative Verification & Settlement**

NanoAPI Gateway delivers true pay-per-use APIs where clients pay only for the exact compute and data they consume.

---

## 2. Architecture & Payment Flow

```
+------------------+         HTTP GET /api/weather
|                  | -------------------------------------> +---------------------+
|  User / Agent    |                                         |                     |
|  Client          | <------------------------------------- |   NanoAPI Gateway   |
|                  |       HTTP 402 Payment Required         |   (Arc Mainnet)     |
+------------------+     (x402 V2 + Domain 26 Requirements)  +---------------------+
        |                                                              |
        | 1. Sign Typed Authorization                                  |
        |    (EIP-712 TransferWithAuthorization)                       |
        v                                                              v
+------------------+    HTTP GET with Authorization Header    +---------------------+
|  Signed Payload  | -------------------------------------> |  Server Middleware  |
+------------------+                                         |  - Nonce Check      |
                                                            |  - Amount Validate  |
                                                            +---------------------+
                                                                       |
                                                                       | 2. Settle Authorization
                                                                       v
                                                            +---------------------+
                                                            | Circle Gateway API  |
                                                            | /v1/x402/settle     |
                                                            | (Domain 26 / Batch) |
                                                            +---------------------+
                                                                       |
                                                                       | 3. Settlement ID Generated
                                                                       v
+------------------+         HTTP 200 OK + Live Data        +---------------------+
|  Client Receives | <------------------------------------- |  Execute API Route  |
|  API Payload     |                                         |  + Record to DB     |
+------------------+                                         +---------------------+
```

---

## 3. Core Network & Infrastructure Parameters

### Arc Mainnet
- **Chain ID**: `5042`
- **CAIP-2 Identifier**: `eip155:5042`
- **Public RPC**: `https://rpc.mainnet.arc.io`
- **Block Explorer**: `https://explorer.arc.io`
- **USDC Token Contract**: `0x3600000000000000000000000000000000000000`
- **USDC Decimals**: `6` (Atomic Units: $0.001 = `1000` units)
- **Native Gas Accounting**: `18` decimals

### Circle Gateway
- **Gateway REST API**: `https://gateway-api.circle.com`
- **Arc Gateway Domain**: `26`
- **Circle Gateway Wallet**: `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE`
- **Circle Gateway Minter**: `0x2222222d7164433c4C09B0b0D809a9b52C04C205`
- **Batching Name**: `GatewayWalletBatched`
- **Batching Version**: `1`

---

## 4. Circle Unified Balance Integration

Circle Gateway Unified Balance allows users to aggregate USDC liquidity across EVM networks (Arc, Base, Ethereum, Polygon, Arbitrum, Avalanche) into a single spendable balance.

### Funding Workflow
1. **User Wallet**: Connects Web3 wallet (MetaMask, Coinbase Wallet, etc.) to Arc Mainnet.
2. **Gateway Deposit**: User transfers USDC directly to the official Circle Gateway Wallet contract (`0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE`).
3. **Gateway Indexing**: Circle Gateway indexes the on-chain deposit event and updates the user's Unified Balance.
4. **Instant Spending**: The user's Unified Balance is immediately available to authorize gasless x402 V2 nanopayments.

---

## 5. Authoritative Server-Side Pricing

Pricing is defined and enforced strictly on the server in [`lib/arcConfig.ts`](file:///f:/ARC%20Ai%20Project%20x402/nanoapigateway/lib/arcConfig.ts). Clients cannot manipulate price, recipient, asset, network, or scheme.

| Endpoint | Price (USD) | USDC Atomic Units (6 Decimals) | Description |
| :--- | :--- | :--- | :--- |
| `/api/weather` | **$0.001** | `1000` | Real-time global meteorological satellite telemetry |
| `/api/crypto` | **$0.001** | `1000` | Live cryptocurrency market quotes & order books |
| `/api/news` | **$0.002** | `2000` | Breaking financial & technology news headlines |
| `/api/ai-summary` | **$0.005** | `5000` | Real-time neural LLM document & data synthesis |
| `/api/translate` | **$0.003** | `3000` | Real-time multi-lingual neural translation |
| `/api/token-info` | **$0.001** | `1000` | Live on-chain ERC-20 contract introspection on Arc |
| `/api/chat` | **$0.005** | `5000` | Autonomous conversational agent inference |

---

## 6. Settlement IDs vs. Blockchain Transaction Hashes

Understanding Circle Gateway settlement identifiers:

- **Settlement ID (`set_...`)**: Returned when payments are verified and settled through Circle Gateway's off-chain batching facilitator. These represent cryptographically finalized transfers within the Gateway Unified Balance ledger before or during on-chain batching.
- **Transaction Hash (`0x...`)**: Generated when an on-chain state transition occurs directly on Arc Mainnet (such as an initial Gateway deposit transfer, a direct on-chain EIP-3009 transfer, or a batch settlement checkpoint).

The NanoAPI Gateway transaction feed explicitly differentiates between `[GATEWAY BATCHED]` settlement IDs and `[ARC ON-CHAIN]` transaction hashes. It never fabricates fake transaction hashes.

---

## 7. Replay Protection & Persistent Database

Payment records and nonces are persisted in an ACID JSON database with concurrency locks ([`lib/db.ts`](file:///f:/ARC%20Ai%20Project%20x402/nanoapigateway/lib/db.ts)):

- **Nonce Replay Prevention**: Every EIP-712/EIP-3009 authorization nonce is verified against past processed transactions. If an authorization nonce has been used previously, the request is immediately rejected with HTTP 402/400.
- **Cold-Start Resilience**: Payment records survive serverless cold starts, container restarts, and deployments in `./data/gateway_db.json`.
- **Concurrency Safety**: In-flight requests lock the database mutex to ensure zero race conditions or double charges.

---

## 8. Environment Configuration

Copy `.env.example` to `.env.local` to configure the environment:

```bash
cp .env.example .env.local
```

### Key Environment Variables
```env
# Arc Mainnet (Public)
NEXT_PUBLIC_ARC_CHAIN_ID=5042
NEXT_PUBLIC_ARC_RPC=https://rpc.mainnet.arc.io
NEXT_PUBLIC_ARC_EXPLORER=https://explorer.arc.io
NEXT_PUBLIC_ARC_USDC_CONTRACT=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_GATEWAY_WALLET=0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE
NEXT_PUBLIC_GATEWAY_DOMAIN=26

# Server Privileged Settings
PAYMENT_RECEIVER_ADDRESS=0xYourArcMainnetAddress
CIRCLE_GATEWAY_API_URL=https://gateway-api.circle.com
MAX_SINGLE_PAYMENT_USDC=1.0
MAX_DAILY_SPEND_USDC=10.0

# External API Providers (honest upstream errors if omitted)
OPENWEATHER_API_KEY=
NEWS_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

---

## 9. Installation, Validation & Testing

### Installation
```bash
npm install
```

### Typecheck & Lint
```bash
npm run typecheck
npm run lint
```

### Production Build
```bash
npm run build
```

### Automated Test Suite
To execute the automated test suite testing live Arc RPC, Circle Gateway, x402 V2 challenges, rejection security, and persistent database:
```bash
# In terminal 1: Start production server
npm run start

# In terminal 2: Run automated test suite
npm test
```

---

## 10. Security & Credential Hygiene

- **No Secrets in Frontend**: `NEXT_PUBLIC_` variables are strictly restricted to public parameters (Chain ID 5042, RPC URL, Explorer URL, Token Contract, Gateway Wallet).
- **Compromised Credentials Rotated**: Legacy hackathon credentials committed to git history have been marked for revocation and rotated.
- **Fail-Honest External APIs**: If an upstream API provider key is missing, endpoints fail honestly with an upstream error (HTTP 502/503) rather than returning mock/fake responses.
- **Zero Mock Settlement**: All payment verifications execute through the official Circle Gateway Facilitator (`https://gateway-api.circle.com/v1/x402/settle`).
