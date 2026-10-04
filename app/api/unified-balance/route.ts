import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia, sepolia } from 'viem/chains';
import { ARC_TESTNET } from '../../../lib/arcConfig';
import { fetchArcUnifiedBalance, getArcKitSupportedChains } from '../../../lib/unifiedBalanceKit';

export const dynamic = 'force-dynamic';

// Server-authoritative Circle Unified Balance Endpoint
// Powered by official @circle-fin/unified-balance-kit and Arc Testnet RPC.
// Aggregates real Circle Gateway Unified Balance breakdown and Arc on-chain balances.

const arcRpcClient = createPublicClient({
  chain: ARC_TESTNET as any,
  transport: http('https://rpc.testnet.arc.network'),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const ethSepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
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
        const [rawBalance, unifiedKitData, baseSepoliaUsdcRaw, ethSepoliaUsdcRaw] = await Promise.all([
          arcRpcClient.getBalance({
            address: walletAddress as `0x${string}`,
          }).catch(() => BigInt(0)),
          fetchArcUnifiedBalance(walletAddress),
          baseSepoliaClient.readContract({
            address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          ethSepoliaClient.readContract({
            address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }).catch(() => BigInt(0))
        ]);

        const arcDirectBalance = formatUnits(rawBalance, 18);
        const directNum = parseFloat(arcDirectBalance);
        
        // Inject Base Sepolia real on-chain balance
        const baseSepoliaUsdc = formatUnits(baseSepoliaUsdcRaw as bigint, 6);
        const baseSepoliaIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Base_Sepolia');
        if (baseSepoliaIndex >= 0) {
          unifiedKitData.chains[baseSepoliaIndex].confirmedBalance = baseSepoliaUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Base_Sepolia',
            confirmedBalance: baseSepoliaUsdc,
            hasPending: false
          });
        }
        
        // Inject Ethereum Sepolia real on-chain balance
        const ethSepoliaUsdc = formatUnits(ethSepoliaUsdcRaw as bigint, 6);
        const ethSepoliaIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Ethereum_Sepolia');
        if (ethSepoliaIndex >= 0) {
          unifiedKitData.chains[ethSepoliaIndex].confirmedBalance = ethSepoliaUsdc;
        } else {
          unifiedKitData.chains.push({
            chain: 'Ethereum_Sepolia',
            confirmedBalance: ethSepoliaUsdc,
            hasPending: false
          });
        }
        
        // Read Gateway Deposits
        const dbPath = path.join(process.cwd(), '.gateway_deposits.json');
        let gatewayDeposit = 0;
        try {
          if (fs.existsSync(dbPath)) {
            const deposits = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            gatewayDeposit = deposits[walletAddress.toLowerCase()] || 0;
          }
        } catch (e) {}

        // Inject native balance + gateway deposits as Arc_Testnet balance for UI proxy
        const arcAmount = directNum > 0 ? directNum : 0;
        const totalArc = arcAmount + gatewayDeposit;
        
        if (totalArc > 0) {
          const arcChainIndex = unifiedKitData.chains.findIndex(c => c.chain === 'Arc_Testnet');
          if (arcChainIndex >= 0) {
            unifiedKitData.chains[arcChainIndex].confirmedBalance = totalArc.toFixed(4);
          } else {
            unifiedKitData.chains.push({
              chain: 'Arc_Testnet',
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
          network: 'Arc Testnet',
          updatedAt: new Date().toISOString(),
        });
      } catch (rpcErr: any) {
        console.error('Arc Unified Balance query error:', rpcErr);
        return NextResponse.json(
          { error: 'Unable to query on-chain balance on Arc Testnet.' },
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
