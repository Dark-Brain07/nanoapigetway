import { NextRequest, NextResponse } from 'next/server';
import { transferUsdc } from '../../../../lib/circleWallet';

export async function POST(req: NextRequest) {
  try {
    const { walletId, destination, amount } = await req.json();

    if (!walletId || !destination || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: walletId, destination, amount' },
        { status: 400 }
      );
    }

    console.log(`[Circle Transfer] walletId=${walletId}, to=${destination}, amount=${amount}`);
    const result = await transferUsdc(walletId, destination, amount);

    if (result.txHash) {
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        txId: result.txId,
        state: result.state,
      });
    } else {
      return NextResponse.json({
        success: false,
        txId: result.txId,
        state: result.state,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Circle Transfer] Error:', error);
    return NextResponse.json({ error: error?.message || 'Transfer failed' }, { status: 500 });
  }
}
