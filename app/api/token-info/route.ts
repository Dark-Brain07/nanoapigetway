import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractAddress = searchParams.get('contractAddress');
  
  if (!contractAddress) {
    return NextResponse.json({ error: 'contractAddress parameter is required' }, { status: 400 });
  }

  // 402 Payment Required
  return NextResponse.json({
    error: 'Payment required for Token Information API',
    amount: '0.001',
    currency: 'USDC',
    accepts: [
      {
        network: 'arc-mainnet',
        token: 'USDC',
        payTo: '0xfd4960F33670f3477ebe817B184dd59fC4961437' // NanoAPI Treasury
      }
    ]
  }, { status: 402 });
}
