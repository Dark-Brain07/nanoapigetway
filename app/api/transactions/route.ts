import { NextRequest, NextResponse } from 'next/server';
import { getPaymentRecords, createPaymentRecord, PaymentStatus, PaymentRecord } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const payer = searchParams.get('payer') || undefined;
    const seller = searchParams.get('seller') || undefined;
    const endpoint = searchParams.get('endpoint') || undefined;
    const status = (searchParams.get('status') as PaymentStatus) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const records = await getPaymentRecords({
      payer,
      seller,
      endpoint,
      status,
      limit,
    });

    const formatted = records.map((r: PaymentRecord) => ({
      id: r.id,
      requestId: r.requestId,
      paymentId: r.paymentId,
      txHash: r.transactionHash || r.settlementId || r.paymentId,
      settlementId: r.settlementId || null,
      transactionHash: r.transactionHash || null,
      amount: r.amountUsd || `$${(Number(r.amount) / 1000000).toFixed(4)}`,
      atomicAmount: r.amount,
      endpoint: r.endpoint,
      timestamp: r.createdAt,
      walletAddress: r.payer,
      payer: r.payer,
      seller: r.seller,
      network: r.network,
      scheme: r.scheme,
      status: r.status,
      error: r.error || null,
    }));

    return NextResponse.json({
      transactions: formatted,
      count: formatted.length,
    });
  } catch (error: any) {
    console.error('[Transactions API] Error reading records:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve transaction records', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.walletAddress || !body.endpoint || !body.amount) {
      return NextResponse.json(
        { error: 'Fields walletAddress, endpoint, and amount are required' },
        { status: 400 }
      );
    }

    let record;
    try {
      record = await createPaymentRecord({
        requestId: body.requestId || `manual_${Date.now()}`,
        paymentId: body.paymentId || body.txHash || `manual_tx_${Date.now()}`,
        nonce: body.nonce,
        payer: body.walletAddress,
        seller: body.seller || process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000',
        endpoint: body.endpoint,
        amount: body.atomicAmount || '1000',
        amountUsd: body.amount,
        asset: '0x3600000000000000000000000000000000000000',
        network: body.network || 'eip155:5042',
        scheme: body.scheme || (body.txHash?.startsWith('0x') ? 'direct-arc' : 'exact'),
        status: (body.status as PaymentStatus) || 'settled',
        settlementId: body.settlementId || null,
        transactionHash: body.txHash?.startsWith('0x') ? body.txHash : null,
      });
    } catch {
      // Record may have already been created and settled by protectWithX402
      record = { success: true, message: 'Transaction already recorded' };
    }

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('[Transactions API] Error logging transaction:', error);
    return NextResponse.json(
      { error: 'Failed to record transaction', details: error.message },
      { status: 500 }
    );
  }
}
