import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import {
  ARC_MAINNET,
  ARC_USDC_CONTRACT,
  CIRCLE_GATEWAY_API_URL,
  CIRCLE_GATEWAY_WALLET,
  CIRCLE_GATEWAY_MINTER,
} from '@/lib/arcConfig';
import { getSellerAddress } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';

const arcRpcClient = createPublicClient({
  chain: ARC_MAINNET,
  transport: http(ARC_MAINNET.rpcUrls.default.http[0], { timeout: 6000 }),
});

const SOURCE_CHAINS: Record<string, { name: string; domain: number; chainId: number; rpcUrl: string; usdcAddress: string }> = {
  Arc: {
    name: 'Arc Mainnet',
    domain: 26,
    chainId: 5042,
    rpcUrl: ARC_MAINNET.rpcUrls.default.http[0],
    usdcAddress: ARC_USDC_CONTRACT,
  },
  Base: {
    name: 'Base',
    domain: 6,
    chainId: 8453,
    rpcUrl: 'https://base-rpc.publicnode.com',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  Polygon: {
    name: 'Polygon',
    domain: 7,
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  Ethereum: {
    name: 'Ethereum',
    domain: 0,
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  Arbitrum: {
    name: 'Arbitrum',
    domain: 3,
    chainId: 42161,
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  Avalanche: {
    name: 'Avalanche',
    domain: 1,
    chainId: 43114,
    rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
};

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Domain mapping to human readable chain names
const DOMAIN_MAP: Record<number, string> = {
  26: 'Arc',
  6: 'Base',
  0: 'Ethereum',
  1: 'Avalanche',
  3: 'Arbitrum',
  2: 'Optimism',
  7: 'Polygon',
  10: 'Unichain',
  13: 'Sonic',
  14: 'Worldchain',
  16: 'Sei',
  19: 'HyperEVM',
  5: 'Solana',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const isSellerQuery = searchParams.get('seller') === 'true';

    const targetAddress = isSellerQuery ? getSellerAddress() : address;

    if (!targetAddress || !targetAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid 0x wallet address is required.' },
        { status: 400 }
      );
    }

    const sellerAddress = getSellerAddress();

    // 1. Fetch live Unified Balance directly from Circle Gateway API
    let gatewayData: any = null;
    let gatewayBalanceSum = 0;
    let gatewayPendingSum = 0;
    const chainBreakdown: Array<{
      domain: number;
      chain: string;
      confirmedBalance: string;
      pendingBalance: string;
    }> = [];

    try {
      const supportedDomains = [26, 6, 0, 7, 3, 1];
      const circleRes = await fetch(`${CIRCLE_GATEWAY_API_URL}/v1/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'USDC',
          sources: supportedDomains.map((domain) => ({
            domain,
            depositor: targetAddress,
          })),
        }),
        cache: 'no-store',
      });

      if (circleRes.ok) {
        gatewayData = await circleRes.json();
        const balances = gatewayData.balances || [];

        for (const b of balances) {
          const conf = parseFloat(b.balance || '0');
          const pend = parseFloat(b.pendingBatch || '0');
          gatewayBalanceSum += conf;
          gatewayPendingSum += pend;

          chainBreakdown.push({
            domain: b.domain,
            chain: DOMAIN_MAP[b.domain] || `Domain ${b.domain}`,
            confirmedBalance: conf.toFixed(6),
            pendingBalance: pend.toFixed(6),
          });
        }
      }
    } catch (circleErr) {
      console.warn('[Unified Balance API] Circle Gateway API query warning:', circleErr);
    }

    // 2. Fetch live on-chain balances across all supported source chains
    let nativeGasBalance = '0.0000';
    const walletBalances: Record<string, { network: string; chainId: number; usdcTokenBalance: string; usdcContract: string }> = {};

    try {
      // Query Arc gas balance
      const rawGas = await arcRpcClient.getBalance({ address: targetAddress as `0x${string}` }).catch(() => 0n);
      nativeGasBalance = formatUnits(rawGas, 18);

      // Query on-chain USDC balances for all source chains in parallel
      await Promise.all(
        Object.entries(SOURCE_CHAINS).map(async ([key, conf]) => {
          try {
            const res = await fetch(conf.rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [
                  {
                    to: conf.usdcAddress,
                    data: `0x70a08231000000000000000000000000${targetAddress.slice(2)}`,
                  },
                  'latest',
                ],
              }),
              signal: AbortSignal.timeout(3500),
            });
            const json = await res.json();
            const rawVal = BigInt(json?.result || '0');
            const decimals = conf.chainId === 5042 ? 6 : 4;
            const formatted = (Number(rawVal) / 1_000_000).toFixed(decimals);
            walletBalances[key] = {
              network: conf.name,
              chainId: conf.chainId,
              usdcTokenBalance: formatted,
              usdcContract: conf.usdcAddress,
            };
          } catch {
            walletBalances[key] = {
              network: conf.name,
              chainId: conf.chainId,
              usdcTokenBalance: '0.0000',
              usdcContract: conf.usdcAddress,
            };
          }
        })
      );
    } catch (rpcErr) {
      console.warn('[Unified Balance API] RPC multi-chain read warning:', rpcErr);
    }

    const availableFormatted = gatewayBalanceSum.toFixed(6);
    const pendingFormatted = gatewayPendingSum.toFixed(6);

    const arcUsdc = walletBalances['Arc']?.usdcTokenBalance || '0.0000';

    return NextResponse.json({
      success: true,
      walletAddress: targetAddress,
      isSeller: targetAddress.toLowerCase() === sellerAddress.toLowerCase(),
      currency: 'USDC',
      // Real Circle Gateway Unified Balance (Deposited into Gateway)
      available: availableFormatted,
      pending: pendingFormatted,
      totalUnifiedBalance: (gatewayBalanceSum + gatewayPendingSum).toFixed(6),
      isGatewayFunded: gatewayBalanceSum > 0,
      breakdown: chainBreakdown,
      // Real on-chain Arc balances (backward compatibility)
      onChain: {
        network: 'Arc Mainnet',
        chainId: 5042,
        usdcTokenBalance: arcUsdc,
        nativeGasBalance: nativeGasBalance,
        usdcContract: ARC_USDC_CONTRACT,
      },
      // Multi-chain personal wallet balances across all supported source chains
      walletBalances,
      gatewayInfrastructure: {
        gatewayWallet: CIRCLE_GATEWAY_WALLET,
        gatewayMinter: CIRCLE_GATEWAY_MINTER,
        arcDomain: 26,
        baseDomain: 6,
        apiEndpoint: CIRCLE_GATEWAY_API_URL,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Unified Balance API] Route error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Circle Unified Balance', details: error.message },
      { status: 500 }
    );
  }
}
