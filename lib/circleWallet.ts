import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

export const circleSDK = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY || 'placeholder',
  entitySecret: process.env.CIRCLE_ENTITY_SECRET || 'placeholder',
});

export async function createWalletForUser(userId: string) {
  try {
    const walletSet = await circleSDK.createWalletSet({ name: userId });
    const walletSetId = walletSet?.data?.walletSet?.id;
    if (!walletSetId) throw new Error("Could not create wallet set");

    const wallet = await circleSDK.createWallets({
      blockchains: ['ARC-TESTNET'],
      count: 1,
      accountType: 'EOA',
      walletSetId,
    });
    return wallet?.data?.wallets?.[0];
  } catch (error) {
    console.error("Circle Wallet Error:", error);
    return null;
  }
}

export async function getWalletBalance(walletId: string) {
  try {
    const balance = await circleSDK.getWalletTokenBalance({ id: walletId });
    return balance?.data?.tokenBalances;
  } catch (error) {
    console.error("Circle Balance Error:", error);
    return [];
  }
}

export async function transferUsdc(walletId: string, destinationAddress: string, amount: string) {
  try {
    const response = await circleSDK.createTransaction({
      walletId,
      tokenAddress: '',  // empty string = native token (USDC on Arc)
      blockchain: 'ARC-TESTNET' as any,
      destinationAddress,
      amount: [amount],
      fee: {
        type: 'level',
        config: {
          feeLevel: 'HIGH' as any,
        },
      },
    });

    const resData = response?.data as any;
    const txId = resData?.id || resData?.transaction?.id;
    const txState = resData?.state || resData?.transaction?.state;
    console.log('Circle TX created:', txId, 'state:', txState);

    // Poll for completion (up to 30 seconds)
    if (txId) {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const check = await circleSDK.getTransaction({ id: txId });
        const checkData = check?.data as any;
        const state = checkData?.transaction?.state || checkData?.state;
        const txHash = checkData?.transaction?.txHash || checkData?.txHash;
        console.log(`Circle TX poll #${i + 1}: state=${state}, txHash=${txHash}`);

        if (state === 'COMPLETE' && txHash) {
          return { txHash, txId, state: 'COMPLETE' };
        }
        if (state === 'FAILED' || state === 'CANCELLED' || state === 'DENIED') {
          return { txHash: null, txId, state, error: `Transaction ${state}` };
        }
      }
      // If still pending after polling
      return { txHash: null, txId, state: 'PENDING', error: 'Transaction still pending after 30s' };
    }

    return { txHash: null, txId: null, state: 'FAILED', error: 'No transaction ID returned' };
  } catch (error: any) {
    console.error("Circle Transfer Error:", error?.message || error);
    return { txHash: null, txId: null, state: 'FAILED', error: error?.message || 'Transfer failed' };
  }
}
