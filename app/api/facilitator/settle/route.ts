import { NextRequest, NextResponse } from 'next/server';
import { CIRCLE_GATEWAY_API_URL } from '@/lib/arcConfig';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Transparent proxy to official Circle Gateway Facilitator settle endpoint
    const circleRes = await fetch(`${CIRCLE_GATEWAY_API_URL}/v1/x402/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await circleRes.json();
    return NextResponse.json(data, { status: circleRes.status });
  } catch (err: any) {
    console.error('[Facilitator Settle Proxy] Error contacting Circle Gateway:', err);
    return NextResponse.json(
      { error: 'Circle Gateway facilitator settle endpoint error', details: err.message },
      { status: 502 }
    );
  }
}
