import { NextRequest, NextResponse } from 'next/server';
import {
  ARC_CHAIN_ID,
  ARC_USDC_CONTRACT,
  CIRCLE_GATEWAY_WALLET,
  CIRCLE_GATEWAY_MINTER,
  CIRCLE_GATEWAY_DOMAIN,
  CIRCLE_GATEWAY_API_URL,
} from '@/lib/arcConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    gatewayFunding: {
      network: 'Arc Mainnet',
      chainId: ARC_CHAIN_ID,
      token: 'USDC',
      tokenAddress: ARC_USDC_CONTRACT,
      gatewayWalletContract: CIRCLE_GATEWAY_WALLET,
      gatewayMinterContract: CIRCLE_GATEWAY_MINTER,
      gatewayDomain: CIRCLE_GATEWAY_DOMAIN,
      instructions: [
        '1. Ensure you have USDC in your connected wallet on Arc Mainnet (or any Gateway source chain).',
        '2. Deposit USDC directly to the Circle Gateway Wallet contract (0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE).',
        '3. Circle Gateway indexes the deposit and updates your spendable Unified Balance.',
        '4. Your Unified Balance is automatically used to pay for high-frequency x402 nanopayments without gas.',
      ],
      supportedChains: [
        { chain: 'Arc', domain: 26, contract: CIRCLE_GATEWAY_WALLET },
        { chain: 'Base', domain: 6, contract: CIRCLE_GATEWAY_WALLET },
        { chain: 'Ethereum', domain: 0, contract: CIRCLE_GATEWAY_WALLET },
        { chain: 'Polygon', domain: 7, contract: CIRCLE_GATEWAY_WALLET },
        { chain: 'Arbitrum', domain: 3, contract: CIRCLE_GATEWAY_WALLET },
        { chain: 'Avalanche', domain: 1, contract: CIRCLE_GATEWAY_WALLET },
      ],
    },
  });
}

import { createPaymentRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, walletAddress, amount, sourceChain, txHash } = body;

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid 0x wallet address is required.' },
        { status: 400 }
      );
    }

    if (action === 'get_deposit_params') {
      const parsedAmount = parseFloat(amount || '1');
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid positive amount required.' },
          { status: 400 }
        );
      }

      const atomicAmount = BigInt(Math.floor(parsedAmount * 1_000_000)).toString();

      return NextResponse.json({
        success: true,
        depositTarget: {
          to: CIRCLE_GATEWAY_WALLET,
          tokenAddress: ARC_USDC_CONTRACT,
          amount: parsedAmount.toString(),
          atomicAmount,
          chainId: ARC_CHAIN_ID,
          network: 'Arc Mainnet',
          domain: CIRCLE_GATEWAY_DOMAIN,
        },
        message: 'Send USDC transfer to Gateway Wallet to fund Unified Balance.',
      });
    }

    if (action === 'unified_kit_deposit') {
      const parsedAmount = parseFloat(amount || '0');
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid positive amount required.' },
          { status: 400 }
        );
      }

      const depositRecord = await createPaymentRecord({
        requestId: `dep_${Date.now()}`,
        paymentId: txHash || `dep_${Date.now()}_${crypto.randomUUID()}`,
        payer: walletAddress,
        seller: CIRCLE_GATEWAY_WALLET,
        endpoint: '/deposit/unified-balance',
        amount: parsedAmount.toString(),
        amountUsd: `$${parsedAmount.toFixed(4)}`,
        asset: ARC_USDC_CONTRACT,
        network: sourceChain === 'Arc' ? 'eip155:5042' : `domain:${sourceChain}`,
        scheme: 'gateway_deposit',
        status: 'settled',
        transactionHash: txHash || null,
        metadata: {
          sourceChain: sourceChain || 'Arc',
          gatewayWallet: CIRCLE_GATEWAY_WALLET,
          gatewayDomain: CIRCLE_GATEWAY_DOMAIN,
        },
      });

      return NextResponse.json({
        status: 'SUCCESS',
        txHash,
        depositId: depositRecord.id,
        message: `Successfully registered deposit of ${parsedAmount} USDC into Circle Gateway Unified Balance.`,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: '${action}'. Supported: 'get_deposit_params', 'unified_kit_deposit'.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Add Funds API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process deposit request', details: error.message },
      { status: 500 }
    );
  }
}
