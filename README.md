# NanoAPI Gateway 🚀

> "Pay only for what you use — sub-cent AI APIs on Arc Testnet"

## 🌟 Problem Statement
Traditional API monetization requires subscriptions ($50-$500/month) or payment processors ($0.30 + 2.9% per transaction). For sub-cent API calls, this makes business impossible.

## 💡 Solution
NanoAPI Gateway charges **$0.001-$0.005 USDC per API call** using the x402 protocol natively. By settling instantly on the **Arc blockchain testnet**, gas fees drop to ~$0.000001, making micropayment APIs economically viable for the first time.

---

## 🛠️ Circle Products Used
- **Arc Testnet**: Fast settlement layer for all USDC micropayments.
- **USDC**: Core native payment token.
- **Circle Wallets (Developer-Controlled)**: Enables friction-less onboarding without requiring MetaMask.
- **Circle Gateway / CCTP**: For bridging USDC from other chains.
- **x402 Protocol**: HTTP-native status code `402 Payment Required` wrapped into a seamless user experience.

---

## 📊 Margin Analysis: Why Traditional Payment Mechanisms Fail
*"On Ethereum, a $0.001 API call could cost $0.50 to $5.00 in gas. That's up to 5,000x the payment amount — economically impossible. On Arc, gas costs roughly a fraction of a cent, unlocking real micropayment commerce."*

| Method | Fee | Viable at $0.001? |
| - | - | - |
| Stripe/Credit | $0.30 + 2.9% | ❌ Fee > Payment |
| Ethereum L1 | ~$0.50-$5 | ❌ Fee > Payment |
| Arc + x402 | ~$0.000001 | ✅ Yes! 1000x cheaper |

---

## 🚦 Transaction Frequency Demo
The Demo Mode page generates **50+ on-chain transactions** autonomously and automatically for judges to evaluate Arc's throughput.

---

## 💻 Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env.local`. Add your Circle CDP and AI endpoints:
   ```bash
   cp .env.example .env.local
   ```

3. **Get Funds for Arc Testnet:**
   Get free USDC via [Circle Faucet](https://faucet.circle.com).

4. **Launch Application:**
   ```bash
   npm run dev
   ```

---

## 🔗 Links
- **Track**: Autonomous Payment Agent
