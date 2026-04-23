import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    transaction: '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0'),
    network: 'base-sepolia',
  });
}
