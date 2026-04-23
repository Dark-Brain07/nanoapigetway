import { withX402 } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids') || 'bitcoin,ethereum,usd-coin';
  
  const data = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
  return NextResponse.json(await data.json());
};

export const GET = withX402(
  handler,
  (process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  {
    price: '$0.001',
    network: 'base-sepolia',
    config: { description: 'Live crypto prices - 1 call' },
  }
);
