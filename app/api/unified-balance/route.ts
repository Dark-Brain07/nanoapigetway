import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { createPublicClient, http, formatUnits } from 'viem';
import { base, mainnet, polygon, arbitrum, avalanche } from 'viem/chains';
import { getGatewayDeposits } from '../../../lib/kv';
import { ARC_MAINNET } from '../../../lib/arcConfig';
import { fetchArcUnifiedBalance, getArcKitSupportedChains } from '../../../lib/unifiedBalanceKit';

export const dynamic = 'force-dynamic';

// Server-authoritative Circle Unified Balance Endpoint
// Powered by official @circle-fin/unified-balance-kit and Arc Mainnet RPC.
// Aggregates real Circle Gateway Unified Balance breakdown and Arc on-chain balances.

const arcRpcClient = createPublicClient({
  chain: ARC_MAINNET as any,
  transport: http('https://rpc.mainnet.arc.io'),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

const ethClient = createPublicClient({
  chain: mainnet,
  transport: http('https://cloudflare-eth.com'),
});

const polygonClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-rpc.com'),
});

const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http('https://arb1.arbitrum.io/rpc'),
});

const avalancheClient = createPublicClient({
  chain: avalanche,
  transport: http('https://api.avax.network/ext/bc/C/rpc'),
});

const USDC_ABI = [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const;

function isCircleConfigured(): boolean {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey === 'get_from_console.circle.com') {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get('walletId');
    const walletAddress = searchParams.get('address');

    if (!walletId && !walletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet identification. Provide walletId or address.' },
        { status: 400 }
      );
    }

    let targetAddress = walletAddress || '';

    // If External EVM Wallet is used:
    if (walletAddress) {
      try {
        const [rawBalance, unifiedKitData, baseUsdcRaw, ethUsdcRaw, polygonUsdcRaw, arbUsdcRaw, avaxUsdcRaw] = await Promise.all([
          arcRpcClient.getBalance({
            address: walletAddress as `0x${string}`,
          }).catch(() => BigInt(0)),
          fetchArcUnifiedBalance(walletAddress, ['Arc_Mainnet', 'Base', 'Ethereum', 'Polygon', 'Arbitrum', 'Avalanche'] as any),
          baseClient.readContract({
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          ethClient.readContract({
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          polygonClient.readContract({
            address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          arbitrumClient.readContract({
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          avalancheClient.readContract({
            address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0))
        ]);

        const arcDirectBalance = formatUnits(rawBalance, 18);
        const directNum = parseFloat(arcDirectBalance);
        
        // Inject Base real on-chain balance
        const baseUsdc = formatUnits(baseUsdcRaw as bigint, 6);
        const baseIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Base');
        if (baseIndex >= 0) {
          unifiedKitData.chains[baseIndex].confirmedBalance = baseUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Base',
            confirmedBalance: baseUsdc,
            hasPending: false
          });
        }
        
        // Inject Ethereum real on-chain balance
        const ethUsdc = formatUnits(ethUsdcRaw as bigint, 6);
        const ethIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Ethereum');
        if (ethIndex >= 0) {
          unifiedKitData.chains[ethIndex].confirmedBalance = ethUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Ethereum',
            confirmedBalance: ethUsdc,
            hasPending: false
          });
        }
        
        // Inject Polygon real on-chain balance
        const polygonUsdc = formatUnits(polygonUsdcRaw as bigint, 6);
        const polygonIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Polygon');
        if (polygonIndex >= 0) {
          unifiedKitData.chains[polygonIndex].confirmedBalance = polygonUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Polygon',
            confirmedBalance: polygonUsdc,
            hasPending: false
          });
        }

        // Inject Arbitrum real on-chain balance
        const arbUsdc = formatUnits(arbUsdcRaw as bigint, 6);
        const arbIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Arbitrum');
        if (arbIndex >= 0) {
          unifiedKitData.chains[arbIndex].confirmedBalance = arbUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Arbitrum',
            confirmedBalance: arbUsdc,
            hasPending: false
          });
        }

        // Inject Avalanche real on-chain balance
        const avaxUsdc = formatUnits(avaxUsdcRaw as bigint, 6);
        const avaxIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Avalanche');
        if (avaxIndex >= 0) {
          unifiedKitData.chains[avaxIndex].confirmedBalance = avaxUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Avalanche',
            confirmedBalance: avaxUsdc,
            hasPending: false
          });
        }
        
        // Read Gateway Deposits
        const deposits = await getGatewayDeposits();
        let gatewayDeposit = deposits[walletAddress.toLowerCase()] || 0;

        // Inject native balance + gateway deposits as Arc_Mainnet balance for UI proxy
        const arcAmount = directNum > 0 ? directNum : 0;
        const totalArc = arcAmount + gatewayDeposit;
        
        if (totalArc > 0) {
          const arcChainIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Arc_Mainnet');
          if (arcChainIndex >= 0) {
            unifiedKitData.chains[arcChainIndex].confirmedBalance = totalArc.toFixed(4);
          } else {
            unifiedKitData.chains.push({
              chain: 'Arc_Mainnet',
              confirmedBalance: totalArc.toFixed(4),
              hasPending: false
            });
          }
        }
        
        // Sum up the real balances across all chains for total
        const totalAvailable = unifiedKitData.chains.reduce((acc, curr) => acc + parseFloat(curr.confirmedBalance || '0'), 0).toFixed(4);

        return NextResponse.json({
          configured: true,
          walletType: 'metamask',
          walletAddress,
          currency: 'USDC',
          available: totalAvailable,
          pending: unifiedKitData?.totalPendingBalance || '0.0000',
          arcDirectBalance: '0',
          unifiedKit: {
            totalConfirmed: unifiedKitData.totalConfirmedBalance,
            totalPending: unifiedKitData.totalPendingBalance,
            chains: unifiedKitData.chains,
          },
          network: 'Arc Mainnet',
          updatedAt: new Date().toISOString(),
        });
      } catch (rpcErr: any) {
        console.error('Arc Unified Balance query error:', rpcErr);
        return NextResponse.json(
          { error: 'Unable to query on-chain balance on Arc Mainnet.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid wallet parameters.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Unified Balance route error:', error);
    return NextResponse.json(
      { error: 'Server error retrieving Unified Balance.' },
      { status: 500 }
    );
  }
}
