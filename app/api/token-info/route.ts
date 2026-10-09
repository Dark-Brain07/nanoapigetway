import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';
import { ARC_RPC_URL, ARC_CHAIN_ID } from '@/lib/arcConfig';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const arcClient = createPublicClient({
  chain: defineChain({
    id: ARC_CHAIN_ID,
    name: 'Arc Mainnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC_URL] } },
  }),
  transport: http(ARC_RPC_URL),
});

const ERC20_ABI = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export async function GET(req: NextRequest) {
  const authResult = await protectWithX402(req, '/api/token-info');
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(req.url);
  const contractAddress = searchParams.get('contractAddress') || '0x3600000000000000000000000000000000000000';

  if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    return NextResponse.json(
      { error: 'Valid 0x contractAddress parameter is required' },
      { status: 400 }
    );
  }

  try {
    const address = contractAddress as `0x${string}`;

    // Read on-chain metadata via Arc Mainnet RPC
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      arcClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown Token'),
      arcClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => 'UNKNOWN'),
      arcClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
      arcClient.readContract({ address, abi: ERC20_ABI, functionName: 'totalSupply' }).catch(() => 0n),
    ]);

    const bytecode = await arcClient.getBytecode({ address }).catch(() => null);

    return NextResponse.json(
      {
        network: 'Arc Mainnet',
        chainId: ARC_CHAIN_ID,
        address,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        isContract: Boolean(bytecode && bytecode.length > 2),
        bytecodeSize: bytecode ? (bytecode.length - 2) / 2 : 0,
        _payment: {
          settlementId: authResult.settlementId,
          payer: authResult.payer,
          amount: authResult.amount,
          network: authResult.network,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'X-Payment-Settlement': authResult.settlementId,
          'X-Payment-Payer': authResult.payer,
        },
      }
    );
  } catch (error: any) {
    console.error('[Token Info API] On-chain RPC failure:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to inspect on-chain token' },
      { status: 502 }
    );
  }
}
