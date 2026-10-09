import fetch from 'node-fetch';

async function runDualRailsVerification() {
  console.log('=============================================================');
  console.log('   DUAL PAYMENT RAILS VERIFICATION SUITE');
  console.log('=============================================================\n');

  const BASE_URL = 'http://localhost:3000';

  // Test 1: Verify 402 challenge returns dual rails
  console.log('--- TEST 1: Challenge Format & Dual Rails ---');
  const res = await fetch(`${BASE_URL}/api/crypto-price`);
  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('x402Version:', data.x402Version);
  console.log('Accepts count:', data.accepts?.length);
  
  const directRail = data.accepts?.find(a => a.scheme === 'direct-arc');
  const gatewayRail = data.accepts?.find(a => a.scheme === 'exact');

  if (directRail && gatewayRail) {
    console.log('✅ PASS: Dual rails offered in 402 challenge:');
    console.log('   - Rail 1 (direct-arc): payTo =', directRail.payTo, 'amount =', directRail.amount);
    console.log('   - Rail 2 (exact): payTo =', gatewayRail.payTo, 'amount =', gatewayRail.amount);
  } else {
    console.error('❌ FAIL: Missing rail in accepts array', data.accepts);
    process.exit(1);
  }

  // Test 2: Verify Rail 1 rejects invalid txHash
  console.log('\n--- TEST 2: Rail 1 Invalid txHash Rejection ---');
  const invalidTxRes = await fetch(`${BASE_URL}/api/crypto-price`, {
    headers: {
      'payment-signature': JSON.stringify({
        x402Version: 2,
        scheme: 'direct-arc',
        txHash: '0xinvalid_hash',
        payer: '0x6ea99501b46040e9c99c6ffccd7d64ea8f726476',
      }),
    },
  });
  const invalidTxData = await invalidTxRes.json();
  console.log('HTTP Status:', invalidTxRes.status, 'Code:', invalidTxData.code);
  if (invalidTxRes.status === 400 && invalidTxData.code === 'INVALID_TX_HASH') {
    console.log('✅ PASS: Malformed txHash correctly rejected with 400 INVALID_TX_HASH');
  } else {
    console.error('❌ FAIL: Unexpected response for invalid txHash', invalidTxData);
    process.exit(1);
  }

  // Test 3: Check live unified-balance API for user wallet
  console.log('\n--- TEST 3: User Wallet Live Balances ---');
  const USER_WALLET = '0x6ea99501b46040e9c99c6ffccd7d64ea8f726476';
  const balRes = await fetch(`${BASE_URL}/api/unified-balance?address=${USER_WALLET}`);
  const balData = await balRes.json();
  console.log('User wallet:', USER_WALLET);
  console.log('Circle Gateway Unified Balance (Rail 2):', '$' + balData.available, 'USDC');
  console.log('Arc On-Chain USDC Balance (Rail 1):', balData.onChain?.usdcTokenBalance, 'USDC');
  console.log('Arc Native Gas Balance:', balData.onChain?.nativeGasBalance, 'ARC');

  const onChainUsdc = parseFloat(balData.onChain?.usdcTokenBalance || '0');
  if (onChainUsdc > 0.001) {
    console.log(`✅ CONFIRMED: User has ${onChainUsdc} USDC in Arc wallet — Rail 1 is READY and spendable!`);
  } else {
    console.log(`⚠️ User wallet has ${onChainUsdc} USDC`);
  }

  console.log('\n=============================================================');
  console.log('✅ DUAL PAYMENT RAILS VERIFIED SUCCESSFULLY!');
  console.log('=============================================================');
}

runDualRailsVerification().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
