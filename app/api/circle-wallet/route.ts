import { NextRequest, NextResponse } from 'next/server';
import { createWalletForUser, getWalletBalance } from '../../../lib/circleWallet';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const wallet = await createWalletForUser(userId || 'GuestUser_' + Date.now());
    if (!wallet) throw new Error("Failed to create wallet");
    
    return NextResponse.json({ wallet });
  } catch (error) {
    return NextResponse.json({ error: "Wallet creation failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletId = searchParams.get('walletId');
  if (!walletId) return NextResponse.json({ error: "Missing walletId" }, { status: 400 });

  const balances = await getWalletBalance(walletId);
  return NextResponse.json({ balances });
}
