import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { ARC_MAINNET } from '../../../lib/arcConfig';

export const dynamic = 'force-dynamic';

const arcRpcClient = createPublicClient({
  chain: ARC_MAINNET as any,
  transport: http('https://rpc.mainnet.arc.io'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ balance: '0' });
    
    const rawBalance = await arcRpcClient.getBalance({
      address: address as `0x${string}`,
    }).catch(() => BigInt(0));
    
    const balance = formatUnits(rawBalance, 18);
    return NextResponse.json({ balance });
  } catch (error) {
    return NextResponse.json({ balance: '0' });
  }
}
