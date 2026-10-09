import { defineChain } from 'viem';

export const ARC_CHAIN_ID = 5042;
export const ARC_CAIP2_NETWORK = 'eip155:5042';
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.mainnet.arc.io';
export const ARC_EXPLORER_URL = process.env.NEXT_PUBLIC_ARC_EXPLORER || 'https://explorer.arc.io';
export const ARC_USDC_CONTRACT = '0x3600000000000000000000000000000000000000';
export const ARC_USDC_DECIMALS = 6;
export const ARC_GAS_DECIMALS = 18;

// Circle Gateway Mainnet Configuration
export const CIRCLE_GATEWAY_API_URL = 'https://gateway-api.circle.com';
export const CIRCLE_GATEWAY_WALLET = '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE';
export const CIRCLE_GATEWAY_MINTER = '0x2222222d7164433c4C09B0b0D809a9b52C04C205';
export const CIRCLE_GATEWAY_DOMAIN = 26; // Arc Mainnet domain in Circle Gateway
export const CIRCLE_BATCHING_NAME = 'GatewayWalletBatched';
export const CIRCLE_BATCHING_VERSION = '1';

// Viem Chain Definition for Arc Mainnet
export const ARC_MAINNET = defineChain({
  id: ARC_CHAIN_ID,
  name: 'Arc Mainnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: ARC_GAS_DECIMALS,
  },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public: { http: [ARC_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: ARC_EXPLORER_URL,
    },
  },
  contracts: {
    circleGatewayWallet: {
      address: CIRCLE_GATEWAY_WALLET,
    },
    circleGatewayMinter: {
      address: CIRCLE_GATEWAY_MINTER,
    },
  },
  testnet: false,
});

/**
 * Authoritative Server-Side Pricing Definition.
 * Prices in USD string and exact atomic USDC units (6 decimals).
 */
export interface EndpointPricing {
  priceUsd: string;
  atomicAmount: string; // 6 decimals
  description: string;
}

export const API_PRICING: Record<string, EndpointPricing> = {
  '/api/weather': {
    priceUsd: '$0.001',
    atomicAmount: '1000',
    description: 'Real-time weather data query (1 call)',
  },
  '/api/crypto': {
    priceUsd: '$0.001',
    atomicAmount: '1000',
    description: 'Live crypto asset market quote (1 call)',
  },
  '/api/crypto-price': {
    priceUsd: '$0.001',
    atomicAmount: '1000',
    description: 'Live cryptocurrency prices (1 call)',
  },
  '/api/news': {
    priceUsd: '$0.002',
    atomicAmount: '2000',
    description: 'Breaking global financial headlines (1 call)',
  },
  '/api/ai-summary': {
    priceUsd: '$0.005',
    atomicAmount: '5000',
    description: 'AI-powered document and data synthesis (1 call)',
  },
  '/api/translate': {
    priceUsd: '$0.003',
    atomicAmount: '3000',
    description: 'Real-time multi-lingual neural translation (1 call)',
  },
  '/api/token-info': {
    priceUsd: '$0.001',
    atomicAmount: '1000',
    description: 'On-chain token metadata & contract statistics (1 call)',
  },
  '/api/chat': {
    priceUsd: '$0.0001',
    atomicAmount: '100',
    description: 'AI Assistant inference per message (1 call)',
  },
};

/**
 * Safety Limits
 */
export const SAFETY_LIMITS = {
  MAX_SINGLE_PAYMENT_USDC: Number(process.env.MAX_SINGLE_PAYMENT_USDC || '1.0'),
  MAX_DAILY_SPEND_USDC: Number(process.env.MAX_DAILY_SPEND_USDC || '10.0'),
};
