import { NextRequest, NextResponse } from 'next/server';
import {
  ARC_CAIP2_NETWORK,
  ARC_USDC_CONTRACT,
  ARC_MAINNET,
  ARC_RPC_URL,
  CIRCLE_GATEWAY_API_URL,
  CIRCLE_GATEWAY_WALLET,
  CIRCLE_BATCHING_NAME,
  CIRCLE_BATCHING_VERSION,
  API_PRICING,
  EndpointPricing,
} from './arcConfig';
import {
  createPaymentRecord,
  updatePaymentRecord,
  isPaymentReplayed,
  getPaymentRecords,
  PaymentRecord,
} from './db';
import crypto from 'crypto';
import { createPublicClient, http } from 'viem';

export interface X402PaymentRequirement {
  scheme: 'exact' | 'direct-arc';
  network: string;
  asset: string;
  amount: string; // Atomic units (6 decimals)
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name?: string;
    version?: string;
    verifyingContract?: string;
    mode?: string;
  };
}

export interface X402PaymentResponse402 {
  x402Version: 2;
  error: string;
  accepts: X402PaymentRequirement[];
}

export interface X402VerificationSuccess {
  success: true;
  payer: string;
  amount: string;
  settlementId: string;
  transactionHash?: string | null;
  network: string;
  scheme?: 'exact' | 'direct-arc';
  record: PaymentRecord;
}

export interface X402VerificationFailure {
  success: false;
  response: NextResponse;
}

export type X402VerificationResult = X402VerificationSuccess | X402VerificationFailure;

/**
 * Returns the configured seller address.
 */
export function getSellerAddress(): string {
  const address = process.env.PAYMENT_RECEIVER_ADDRESS;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return '0xfd4960F33670f3477ebe817B184dd59fC4961437'; // Default gateway receiver
  }
  return address;
}

/**
 * Verifies a direct Arc on-chain USDC payment transaction via Arc Mainnet RPC.
 */
async function verifyOnChainArcPayment(
  txHash: string,
  payer: string,
  seller: string,
  requiredAmount: string
): Promise<{ success: boolean; error?: string; sender?: string; blockNumber?: number }> {
  try {
    const publicClient = createPublicClient({
      chain: ARC_MAINNET,
      transport: http(ARC_RPC_URL),
    });

    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== 'success') {
      return { success: false, error: 'Transaction failed or not confirmed on Arc Mainnet' };
    }

    // keccak256("Transfer(address,address,uint256)")
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    // Find transfer event on Arc USDC contract
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === ARC_USDC_CONTRACT.toLowerCase() &&
        log.topics[0]?.toLowerCase() === TRANSFER_TOPIC.toLowerCase()
    );

    if (!transferLog || !transferLog.topics[2]) {
      return { success: false, error: 'No Arc USDC Transfer event found in transaction receipt' };
    }

    const fromAddr = transferLog.topics[1] ? `0x${transferLog.topics[1].slice(26)}`.toLowerCase() : '';
    const toAddr = `0x${transferLog.topics[2].slice(26)}`.toLowerCase();
    const transferredValue = BigInt(transferLog.data);

    if (toAddr !== seller.toLowerCase()) {
      return {
        success: false,
        error: `Payment recipient mismatch: expected ${seller}, found ${toAddr}`,
      };
    }

    if (payer && fromAddr !== payer.toLowerCase()) {
      return {
        success: false,
        error: `Payment sender mismatch: expected ${payer}, found ${fromAddr}`,
      };
    }

    if (transferredValue < BigInt(requiredAmount)) {
      return {
        success: false,
        error: `Payment amount insufficient: required ${requiredAmount}, received ${transferredValue.toString()}`,
      };
    }

    return { success: true, sender: fromAddr, blockNumber: Number(receipt.blockNumber) };
  } catch (err: any) {
    return {
      success: false,
      error: `Arc RPC verification error: ${err.shortMessage || err.message || 'Unable to fetch receipt'}`,
    };
  }
}

/**
 * Builds the standard x402 V2 402 response for an endpoint offering Dual Payment Rails:
 * Rail 1: direct-arc (Direct Arc On-Chain Wallet Payment)
 * Rail 2: exact (Circle Gateway Unified Balance Nanopayment)
 */
export function create402Response(endpoint: string, errorMessage = 'Payment required'): NextResponse {
  const pricing: EndpointPricing = API_PRICING[endpoint] || {
    priceUsd: '$0.001',
    atomicAmount: '1000',
    description: 'API call',
  };

  const seller = getSellerAddress();

  const directRequirement: X402PaymentRequirement = {
    scheme: 'direct-arc',
    network: ARC_CAIP2_NETWORK,
    asset: ARC_USDC_CONTRACT,
    amount: pricing.atomicAmount,
    payTo: seller,
    maxTimeoutSeconds: 3600,
    extra: {
      name: 'USDC',
      version: '2',
      verifyingContract: ARC_USDC_CONTRACT,
      mode: 'direct-arc-transfer',
    },
  };

  const gatewayRequirements: X402PaymentRequirement[] = [
    // Base (Domain 6)
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: pricing.atomicAmount,
      payTo: seller,
      maxTimeoutSeconds: 2592000,
      extra: {
        name: CIRCLE_BATCHING_NAME,
        version: CIRCLE_BATCHING_VERSION,
        verifyingContract: CIRCLE_GATEWAY_WALLET,
        mode: 'circle-gateway-nanopayment',
      },
    },
    // Arc Mainnet (Domain 26)
    {
      scheme: 'exact',
      network: ARC_CAIP2_NETWORK,
      asset: ARC_USDC_CONTRACT,
      amount: pricing.atomicAmount,
      payTo: seller,
      maxTimeoutSeconds: 2592000,
      extra: {
        name: CIRCLE_BATCHING_NAME,
        version: CIRCLE_BATCHING_VERSION,
        verifyingContract: CIRCLE_GATEWAY_WALLET,
        mode: 'circle-gateway-nanopayment',
      },
    },
    // Polygon (Domain 7)
    {
      scheme: 'exact',
      network: 'eip155:137',
      asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      amount: pricing.atomicAmount,
      payTo: seller,
      maxTimeoutSeconds: 2592000,
      extra: {
        name: CIRCLE_BATCHING_NAME,
        version: CIRCLE_BATCHING_VERSION,
        verifyingContract: CIRCLE_GATEWAY_WALLET,
        mode: 'circle-gateway-nanopayment',
      },
    },
    // Arbitrum (Domain 3)
    {
      scheme: 'exact',
      network: 'eip155:42161',
      asset: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      amount: pricing.atomicAmount,
      payTo: seller,
      maxTimeoutSeconds: 2592000,
      extra: {
        name: CIRCLE_BATCHING_NAME,
        version: CIRCLE_BATCHING_VERSION,
        verifyingContract: CIRCLE_GATEWAY_WALLET,
        mode: 'circle-gateway-nanopayment',
      },
    },
    // Ethereum (Domain 0)
    {
      scheme: 'exact',
      network: 'eip155:1',
      asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: pricing.atomicAmount,
      payTo: seller,
      maxTimeoutSeconds: 2592000,
      extra: {
        name: CIRCLE_BATCHING_NAME,
        version: CIRCLE_BATCHING_VERSION,
        verifyingContract: CIRCLE_GATEWAY_WALLET,
        mode: 'circle-gateway-nanopayment',
      },
    },
  ];

  const body: X402PaymentResponse402 = {
    x402Version: 2,
    error: errorMessage,
    accepts: [directRequirement, ...gatewayRequirements],
  };

  const authHeader = `x402 scheme="direct-arc", network="${ARC_CAIP2_NETWORK}", asset="${ARC_USDC_CONTRACT}", amount="${pricing.atomicAmount}", payTo="${seller}"`;

  return NextResponse.json(body, {
    status: 402,
    headers: {
      'WWW-Authenticate': authHeader,
      'Content-Type': 'application/json',
      'X-402-Price': pricing.priceUsd,
      'X-402-Atomic-Amount': pricing.atomicAmount,
    },
  });
}

/**
 * Validates and settles an incoming request using Circle Gateway x402 Nanopayments.
 * If payment is missing or invalid, returns a NextResponse (402 or 400).
 * If payment is verified and settled, returns { success: true, payer, settlementId, ... }.
 */
export async function protectWithX402(
  req: NextRequest,
  endpoint: string
): Promise<X402VerificationResult> {
  const pricing: EndpointPricing = API_PRICING[endpoint] || {
    priceUsd: '$0.001',
    atomicAmount: '1000',
    description: 'API call',
  };

  // Check headers for payment payload
  const rawHeader =
    req.headers.get('payment-signature') ||
    req.headers.get('x-payment') ||
    req.headers.get('authorization');

  if (!rawHeader) {
    return {
      success: false,
      response: create402Response(endpoint, 'No payment payload provided'),
    };
  }

  let paymentPayload: any = null;
  try {
    if (rawHeader.startsWith('Bearer ') || rawHeader.startsWith('x402 ')) {
      const token = rawHeader.split(' ')[1];
      // Decode base64 or JSON
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      paymentPayload = JSON.parse(decoded);
    } else {
      paymentPayload = JSON.parse(rawHeader);
    }
  } catch (err) {
    try {
      paymentPayload = JSON.parse(rawHeader);
    } catch {
      return {
        success: false,
        response: create402Response(endpoint, 'Malformed payment header format'),
      };
    }
  }

  const seller = getSellerAddress();

  // ---------------------------------------------------------
  // RAIL 1: DIRECT ARC ON-CHAIN WALLET PAYMENT
  // ---------------------------------------------------------
  const isDirectArc =
    paymentPayload?.scheme === 'direct-arc' ||
    paymentPayload?.payload?.scheme === 'direct-arc' ||
    Boolean(paymentPayload?.txHash) ||
    Boolean(paymentPayload?.payload?.txHash);

  if (isDirectArc) {
    const txHash = (paymentPayload?.txHash || paymentPayload?.payload?.txHash || '').trim();
    const rawPayer = (paymentPayload?.payer || paymentPayload?.from || paymentPayload?.payload?.payer || paymentPayload?.payload?.from || '').trim();

    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Invalid or missing Arc on-chain transaction hash. Expected 66-character hex (0x...).',
            code: 'INVALID_TX_HASH',
          },
          { status: 400 }
        ),
      };
    }

    // Replay Protection & Idempotent Verification: ensure transaction hash cannot be double-spent across different requests
    const nonce = `direct_arc_${txHash.toLowerCase()}`;
    const isReplayed = await isPaymentReplayed(nonce);
    if (isReplayed) {
      // Check for idempotent retry on the same endpoint
      const records = await getPaymentRecords({ endpoint, limit: 100 });
      const existing = records.find(
        (r) =>
          r.transactionHash?.toLowerCase() === txHash.toLowerCase() &&
          r.status === 'settled' &&
          r.endpoint === endpoint
      );

      if (existing) {
        return {
          success: true,
          payer: existing.payer,
          amount: existing.amount,
          settlementId: existing.settlementId || txHash,
          transactionHash: txHash,
          network: ARC_CAIP2_NETWORK,
          scheme: 'direct-arc',
          record: existing,
        };
      }

      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Payment replay detected: Transaction hash has already been settled for a different API call',
            code: 'PAYMENT_REPLAY_REJECTED',
          },
          { status: 409 }
        ),
      };
    }

    const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // Pre-record pending transaction in database
    const record = await createPaymentRecord({
      requestId,
      paymentId,
      nonce,
      payer: rawPayer || 'unknown',
      seller,
      endpoint,
      amount: pricing.atomicAmount,
      amountUsd: pricing.priceUsd,
      asset: ARC_USDC_CONTRACT,
      network: ARC_CAIP2_NETWORK,
      scheme: 'direct-arc',
      status: 'pending',
      transactionHash: txHash,
    });

    // Verify on Arc Mainnet RPC
    const verifyResult = await verifyOnChainArcPayment(
      txHash,
      rawPayer,
      seller,
      pricing.atomicAmount
    );

    if (!verifyResult.success) {
      await updatePaymentRecord(record.id, {
        status: 'failed',
        error: verifyResult.error,
      });

      return {
        success: false,
        response: NextResponse.json(
          {
            error: `Arc on-chain payment verification failed: ${verifyResult.error}`,
            code: 'ON_CHAIN_VERIFICATION_FAILED',
          },
          { status: 402 }
        ),
      };
    }

    const verifiedPayer = verifyResult.sender || rawPayer;
    const updatedRecord = await updatePaymentRecord(record.id, {
      status: 'settled',
      settlementId: txHash,
      transactionHash: txHash,
      payer: verifiedPayer,
    });

    return {
      success: true,
      payer: verifiedPayer,
      amount: pricing.atomicAmount,
      settlementId: txHash,
      transactionHash: txHash,
      network: ARC_CAIP2_NETWORK,
      scheme: 'direct-arc',
      record: updatedRecord || record,
    };
  }

  // ---------------------------------------------------------
  // RAIL 2: CIRCLE GATEWAY UNIFIED BALANCE NANOPAYMENT (EIP-712)
  // ---------------------------------------------------------
  if (!paymentPayload || !paymentPayload.payload) {
    return {
      success: false,
      response: create402Response(endpoint, 'Invalid x402 payment structure'),
    };
  }

  const payloadData = paymentPayload.payload;
  const authorization = payloadData.authorization;
  const signature = payloadData.signature;

  if (!authorization || !authorization.from || !authorization.to || !authorization.value) {
    return {
      success: false,
      response: create402Response(endpoint, 'Incomplete payment authorization fields'),
    };
  }

  // Validate recipient matches seller
  if (authorization.to.toLowerCase() !== seller.toLowerCase()) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: `Invalid recipient: expected ${seller}, received ${authorization.to}`,
          code: 'INVALID_RECIPIENT',
        },
        { status: 400 }
      ),
    };
  }

  // Validate payer is not seller (Circle Gateway rejects self_transfer)
  if (authorization.from.toLowerCase() === seller.toLowerCase()) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: `Self-transfer rejected: Payer wallet (${authorization.from}) cannot be the same as the seller revenue wallet (${seller}). Please connect a different caller wallet in your browser, or configure a different PAYMENT_RECEIVER_ADDRESS in .env.local.`,
          code: 'SELF_TRANSFER_NOT_ALLOWED',
        },
        { status: 400 }
      ),
    };
  }

  // Validate amount satisfies price (authoritative server pricing)
  const paidAtomic = BigInt(authorization.value);
  const requiredAtomic = BigInt(pricing.atomicAmount);
  if (paidAtomic < requiredAtomic) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: `Insufficient payment: required ${pricing.atomicAmount} atomic units ($${pricing.priceUsd}), provided ${authorization.value}`,
          code: 'INSUFFICIENT_AMOUNT',
        },
        { status: 402 }
      ),
    };
  }

  // Replay Protection & Idempotency check
  const nonce = authorization.nonce || crypto.randomBytes(32).toString('hex');
  const isReplayed = await isPaymentReplayed(nonce);
  if (isReplayed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Payment replay detected: nonce has already been settled',
          code: 'PAYMENT_REPLAY_REJECTED',
        },
        { status: 409 }
      ),
    };
  }

  const targetNetwork =
    paymentPayload?.accepted?.network ||
    paymentPayload?.network ||
    paymentPayload?.payload?.authorization?.network ||
    ARC_CAIP2_NETWORK;

  const targetAsset =
    paymentPayload?.accepted?.asset ||
    paymentPayload?.asset ||
    paymentPayload?.payload?.authorization?.asset ||
    ARC_USDC_CONTRACT;

  const paymentRequirements: X402PaymentRequirement = {
    scheme: 'exact',
    network: targetNetwork,
    asset: targetAsset,
    amount: pricing.atomicAmount,
    payTo: seller,
    maxTimeoutSeconds: 2592000,
    extra: {
      name: CIRCLE_BATCHING_NAME,
      version: CIRCLE_BATCHING_VERSION,
      verifyingContract: CIRCLE_GATEWAY_WALLET,
    },
  };

  const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const paymentId = `pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  // Pre-record pending transaction in database
  const record = await createPaymentRecord({
    requestId,
    paymentId,
    nonce,
    payer: authorization.from,
    seller,
    endpoint,
    amount: authorization.value,
    amountUsd: pricing.priceUsd,
    asset: targetAsset,
    network: targetNetwork,
    scheme: 'exact',
    status: 'pending',
  });

  // Call Circle Gateway official x402 settlement endpoint
  try {
    const normalizedAuthorization = {
      ...authorization,
      from: authorization.from,
      to: authorization.to,
      value: String(authorization.value),
      validAfter: String(authorization.validAfter),
      validBefore: String(authorization.validBefore),
      nonce: authorization.nonce,
    };

    const settlePayload = {
      paymentPayload: {
        x402Version: 2,
        resource: {
          url: req.url,
          description: pricing.description,
          mimeType: 'application/json',
        },
        accepted: paymentRequirements,
        payload: {
          ...payloadData,
          authorization: normalizedAuthorization,
        },
      },
      paymentRequirements,
    };

    const circleRes = await fetch(`${CIRCLE_GATEWAY_API_URL}/v1/x402/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settlePayload),
    });

    const circleData = await circleRes.json().catch(() => null);

    if (!circleRes.ok || !circleData || circleData.success === false) {
      const errorMsg = circleData?.message || circleData?.errorReason || `Gateway settlement failed (${circleRes.status})`;
      await updatePaymentRecord(record.id, {
        status: 'failed',
        error: errorMsg,
      });

      return {
        success: false,
        response: NextResponse.json(
          {
            error: errorMsg,
            code: 'GATEWAY_SETTLEMENT_FAILED',
            details: circleData,
          },
          { status: 402 }
        ),
      };
    }

    // Settlement succeeded
    const settlementId = circleData.transaction || `gw_settle_${Date.now()}`;
    const updatedRecord = await updatePaymentRecord(record.id, {
      status: 'settled',
      settlementId,
      transactionHash: circleData.transactionHash || null,
    });

    return {
      success: true,
      payer: authorization.from,
      amount: authorization.value,
      settlementId,
      network: targetNetwork,
      record: updatedRecord || record,
    };
  } catch (networkErr: any) {
    console.error('[x402] Error communicating with Circle Gateway:', networkErr);
    await updatePaymentRecord(record.id, {
      status: 'failed',
      error: networkErr.message || 'Gateway connectivity failure',
    });

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Circle Gateway facilitator unreachable. Please try again.',
          code: 'GATEWAY_UNAVAILABLE',
        },
        { status: 503 }
      ),
    };
  }
}
