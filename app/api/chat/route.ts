import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 402 Payment Required for $0.001 per message
  return NextResponse.json({
    error: 'Payment required for Agentic Chat',
    amount: '0.001',
    currency: 'USDC',
    accepts: [
      {
        network: 'base',
        token: 'USDC',
        payTo: '0xfd4960F33670f3477ebe817B184dd59fC4961437' // NanoAPI Treasury
      }
    ]
  }, { status: 402 });
}
