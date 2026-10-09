import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const authResult = await protectWithX402(req, '/api/crypto');
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids') || 'bitcoin,ethereum,usd-coin';

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API returned HTTP ${res.status}`);
    }

    const priceData = await res.json();
    return NextResponse.json(
      {
        ...priceData,
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[Crypto API] Error fetching crypto prices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cryptocurrency price feed' },
      { status: 502 }
    );
  }
}
