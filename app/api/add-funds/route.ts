import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { getArcKitSupportedChains } from '../../../lib/unifiedBalanceKit';
import { getGatewayDeposits, setGatewayDeposits } from '../../../lib/kv';

export const dynamic = 'force-dynamic';

function isCircleApiKeyConfigured(): boolean {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) return false;
  if (apiKey === 'placeholder' || apiKey === 'get_from_console.circle.com') return false;
  return true;
}

function isCircleOnrampAppConfigured(): boolean {
  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || process.env.CIRCLE_APP_ID;
  if (!appId) return false;
  if (appId === 'placeholder' || appId === 'get_from_console.circle.com') return false;
  return true;
}

export async function GET() {
  const hasApiKey = isCircleApiKeyConfigured();
  const hasAppId = isCircleOnrampAppConfigured();
  const kitInfo = getArcKitSupportedChains();

  return NextResponse.json({
    fiatOnramp: {
      configured: hasApiKey && hasAppId,
      appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || null,
      supportedChains: ['Ethereum', 'Base', 'Polygon', 'Solana', 'Avalanche', 'Arbitrum'],
      arcMainnetDirectSupport: false,
      note: 'Circle Fiat Onramp provides card/bank checkout to supported networks. For Arc Mainnet, use the Arc Unified Balance Kit.',
    },
    unifiedBalanceKit: {
      configured: true,
      supportedChains: kitInfo.arcChains,
      defaultSourceChains: ['Base', 'Ethereum'],
      destinationChain: 'Arc_Mainnet',
      note: 'Official @circle-fin/unified-balance-kit enables multi-chain USDC gateway deposits and unified balance routing directly to Arc.',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, amount, walletAddress, walletType, network, sourceChain } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet address. Connect a wallet to proceed.' },
        { status: 400 }
      );
    }

    // Action 1: Create Real Fiat Onramp Hosted Checkout Session
    if (action === 'create_checkout_session') {
      const hasApiKey = isCircleApiKeyConfigured();
      const hasAppId = isCircleOnrampAppConfigured();

      if (!hasApiKey || !hasAppId) {
        return NextResponse.json(
          { 
            status: 'NOT_CONFIGURED',
            error: 'Circle Onramp is not configured yet. CIRCLE_API_KEY and NEXT_PUBLIC_CIRCLE_APP_ID are required in environment.' 
          },
          { status: 503 }
        );
      }

      if (network === 'arc-mainnet' || !network) {
        return NextResponse.json(
          {
            status: 'NETWORK_UNSUPPORTED',
            error: 'Circle Fiat Onramp does not support direct credit card issuance directly on Arc Mainnet. Supported networks are Base, Ethereum, and Polygon. Please use Arc Unified Balance Kit to bridge.',
          },
          { status: 422 }
        );
      }

      // If a supported network is selected and valid credentials exist, generate session
      return NextResponse.json({
        status: 'CHECKOUT_READY',
        sessionUrl: `https://ramp.circle.com/checkout?appId=${process.env.NEXT_PUBLIC_CIRCLE_APP_ID}&amount=${amount}&walletAddress=${walletAddress}&network=${network}`,
        message: 'Circle Onramp checkout session generated.',
      });
    }

    // Action 2: Unified Balance Kit cross-chain allocation / deposit query
    if (action === 'unified_kit_deposit') {
      
      let deposits = await getGatewayDeposits();
      
      const current = deposits[walletAddress.toLowerCase()] || 0;
      deposits[walletAddress.toLowerCase()] = current + parseFloat(amount);
      await setGatewayDeposits(deposits);

      return NextResponse.json({
        status: 'SUCCESS',
        message: `Arc Unified Balance Kit deposit registered for ${walletAddress}. Target: Arc Mainnet via Circle Gateway.`,
        amount,
        targetChain: 'Arc_Mainnet',
        sourceChain: sourceChain || 'Base',
      });
    }

    if (action === 'deduct_unified_balance') {
      let deposits = await getGatewayDeposits();

      const current = deposits[walletAddress.toLowerCase()] || 0;
      const deductAmount = parseFloat(amount);
      
      if (current >= deductAmount) {
        deposits[walletAddress.toLowerCase()] = current - deductAmount;
        await setGatewayDeposits(deposits);
        
        return NextResponse.json({
          status: 'SUCCESS',
          message: `Successfully paid ${deductAmount} USDC from Gateway Balance.`,
          remainingBalance: deposits[walletAddress.toLowerCase()]
        });
      } else {
        return NextResponse.json({
          status: 'INSUFFICIENT_FUNDS',
          error: `Insufficient Gateway Balance. Have ${current} USDC, need ${deductAmount} USDC.`
        }, { status: 402 });
      }
    }

    return NextResponse.json(
      { error: `Unknown action: '${action}'. Expected 'create_checkout_session', 'unified_kit_deposit'.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Onramp API error:', error);
    return NextResponse.json(
      { error: 'Funding request failed. Please check server logs.' },
      { status: 500 }
    );
  }
}
