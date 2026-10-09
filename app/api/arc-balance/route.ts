import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { ARC_MAINNET, ARC_USDC_CONTRACT, ARC_RPC_URL } from '@/lib/arcConfig';

export const dynamic = 'force-dynamic';

const arcRpcClient = createPublicClient({
  chain: ARC_MAINNET,
  transport: http(ARC_RPC_URL),
});

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ balance: '0', usdcBalance: '0' });
    }

    const [rawGas, rawUsdc] = await Promise.all([
      arcRpcClient.getBalance({ address: address as `0x${string}` }).catch(() => 0n),
      arcRpcClient.readContract({
        address: ARC_USDC_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }).catch(() => 0n),
    ]);

    const gasBalance = formatUnits(rawGas, 18);
    const usdcBalance = formatUnits(rawUsdc, 6);

    return NextResponse.json({
      network: 'Arc Mainnet',
      chainId: 5042,
      gasBalance,
      usdcBalance,
      balance: usdcBalance, // default USDC balance
    });
  } catch (error) {
    return NextResponse.json({ balance: '0', usdcBalance: '0' });
  }
}
