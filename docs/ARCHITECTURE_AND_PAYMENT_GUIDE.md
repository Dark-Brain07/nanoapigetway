# NanoAPI Gateway — Architecture & Payment Protocol Guide

This document specifies the technical architecture, on-chain mechanics, cross-chain finality guarantees, and verification pipeline powering **NanoAPI Gateway** on Arc Mainnet.

---

## 1. Core System Architecture

NanoAPI Gateway provides a production payment gateway for autonomous AI agents and web developers that enables sub-cent micropayments ($0.0001 – $0.005 USDC) for paid REST APIs without subscriptions, API keys, or credit card fees.

```
+--------------------+        1. HTTP GET /api/weather          +----------------------+
|                    | ---------------------------------------> |                      |
|  AI Agent / Client |                                          |   NanoAPI Gateway    |
|                    | <--------------------------------------- |    (Arc Mainnet)     |
+--------------------+      2. HTTP 402 Payment Required        +----------------------+
          |                   (Dual Rails / EIP-712 Spec)                  |
          |                                                                |
          | 3. Client signs EIP-712 authorization                          |
          |    or executes direct Arc on-chain transfer                    |
          v                                                                v
+--------------------+    4. HTTP GET with x-payment header     +----------------------+
|   Payment Signed   | ---------------------------------------> |  Verification Engine |
+--------------------+                                          |  - Nonce Replay Check|
                                                                |  - Signature Verify  |
                                                                +----------------------+
                                                                           |
                                                                5. Settle Payment
                                                                           v
                                                                +----------------------+
                                                                | Circle Gateway / RPC |
                                                                | (Domain 26 / Batch)  |
                                                                +----------------------+
                                                                           |
                                                                6. Settlement Confirmed
                                                                           v
+--------------------+        7. HTTP 200 OK + Live Data        +----------------------+
|    Live Payload    | <--------------------------------------- |  Execute API Route   |
|      Received      |          + X-Payment-Settlement          |  + Record to DB      |
+--------------------+                                          +----------------------+
```

---

## 2. Dual Payment Rails Architecture

NanoAPI Gateway implements a **fail-safe dual payment architecture**:

### Rail 1: Circle Gateway Unified Balance (Default & Gasless)
* **Target Scheme:** `exact` (EIP-712 `TransferWithAuthorization`)
* **Gas Overhead:** **Zero Gas for User** (gasless off-chain authorization signed by client).
* **Cross-Chain Liquidity:** Aggregates deposits from Arc (`Domain 26`), Base (`Domain 6`), Ethereum (`Domain 0`), Polygon (`Domain 7`), Arbitrum (`Domain 3`), and Avalanche (`Domain 1`).
* **Settlement Identifier:** Generates an authoritative Circle Gateway settlement ID (`[GATEWAY SETTLED]`) tracked in real time.

### Rail 2: Direct Arc Mainnet On-Chain USDC (Fallback Rail)
* **Target Scheme:** `direct-arc` (Native Arc ERC-20 transfer)
* **Network:** Arc Mainnet (`eip155:5042`)
* **Token Contract:** `0x3600000000000000000000000000000000000000`
* **Gas Cost:** Negligible (~$0.000001 USDC on Arc).
* **On-Chain Verification:** Verified via Arc Mainnet JSON-RPC (`publicClient.getTransactionReceipt`) inspecting the `Transfer` event on Arc USDC.

---

## 3. Cross-Chain Finality & Block Confirmations

When funding Circle Gateway Unified Balance across source chains, Circle's attestation protocol requires the following confirmation thresholds:

| Chain | Gateway Domain | Required Blocks | Confirmation Time | Consensus & Finality Reason |
| :--- | :---: | :---: | :---: | :--- |
| **Arc Mainnet** | `Domain 26` | **1 Block** | **~1–2s (Instant)** | **Native network.** Zero rollup or bridge batching delays. |
| **Avalanche** | `Domain 1` | **1 Block** | **~1–2s (Instant)** | **Snowman consensus.** Instant sub-second finality with zero reorg risk. |
| **Polygon PoS** | `Domain 7` | **~128–256 Blocks**| **~5–8m** | Bor produces blocks in 2s; Gateway awaits **Heimdall checkpoint milestones**. |
| **Base** | `Domain 6` | **~200 Blocks** | **~7–10m** | OP Stack L2 requires batch posting to Ethereum L1 before attestation. |
| **Arbitrum One** | `Domain 3` | **~1000 Blocks** | **~10–12m** | Nitro sequencer confirms in 0.25s; Gateway awaits **L1 batch posting finality**. |
| **Ethereum L1** | `Domain 0` | **64 Blocks** | **~12–15m** | Ethereum PoS requires **2 Casper FFG epochs** (64 slots) for irreversible finality. |

---

## 4. Replay Protection & Concurrency Controls

Payment security is strictly enforced on the server in [`lib/x402Server.ts`](file:///f:/ARC%20Ai%20Project%20x402/nanoapigateway/lib/x402Server.ts) and [`lib/db.ts`](file:///f:/ARC%20Ai%20Project%20x402/nanoapigateway/lib/db.ts):

1. **Cryptographic Nonce Tracking**: Every EIP-712 signature authorization nonce is hashed and committed to persistent storage. Any replayed nonce is rejected immediately with HTTP 400 (`NONCE_ALREADY_USED`).
2. **Transaction Hash Single-Use**: Direct Arc transaction hashes cannot be reused across API invocations.
3. **Atomic File Storage & Mutex**: Transaction logging uses an in-memory synchronized store backed by atomic file replacements (`fs.renameSync`) to eliminate race conditions.
4. **Authoritative Server Pricing**: Prices are defined in [`lib/arcConfig.ts`](file:///f:/ARC%20Ai%20Project%20x402/nanoapigateway/lib/arcConfig.ts); client headers requesting lower amounts are automatically rejected.
