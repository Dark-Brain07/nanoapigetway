import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, addTransaction } from '../../../lib/txTracker';

export async function GET() {
  const txs = getTransactions();
  return NextResponse.json({ transactions: txs, count: txs.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newTx = addTransaction({
      txHash: body.txHash,
      amount: body.amount,
      endpoint: body.endpoint,
      timestamp: new Date().toISOString(),
      walletAddress: body.walletAddress,
      status: 'confirmed'
    });
    return NextResponse.json(newTx);
  } catch (error) {
    return NextResponse.json({ error: "Failed to log transaction" }, { status: 500 });
  }
}
