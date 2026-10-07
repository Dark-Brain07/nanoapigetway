import {
  createUnifiedBalanceKitContext,
  getBalances,
  getSupportedChains,
  estimateDeposit,
  deposit,
  depositFor,
  spend,
  estimateSpend,
  UnifiedBalanceKitContext,
  GetBalancesResult,
  ChainBalanceBreakdown,
  Blockchain,
} from '@circle-fin/unified-balance-kit';

let kitContextInstance: UnifiedBalanceKitContext | null = null;

/**
 * Returns a shared instance of the UnifiedBalanceKitContext.
 */
export function getUnifiedBalanceKitContext(): UnifiedBalanceKitContext {
  if (!kitContextInstance) {
    kitContextInstance = createUnifiedBalanceKitContext();
  }
  return kitContextInstance;
}

export interface ArcUnifiedBalanceDetails {
  totalConfirmedBalance: string;
  totalPendingBalance: string;
  token: string;
  chains: {
    chain: string;
    confirmedBalance: string;
    pendingBalance?: string;
    hasPending: boolean;
  }[];
  depositor: string;
  raw: GetBalancesResult | null;
}

/**
 * Queries official Circle Unified Balance across Arc Testnet and cross-chain sources.
 * Validates real gateway balances directly against Circle Gateway endpoints.
 */
export async function fetchArcUnifiedBalance(
  address: string,
  chains: Blockchain[] = ['Arc_Mainnet', 'Base', 'Ethereum'] as any
): Promise<ArcUnifiedBalanceDetails> {
  const context = getUnifiedBalanceKitContext();

  try {
    const result: GetBalancesResult = await getBalances(context, {
      token: 'USDC',
      sources: {
        address,
        chains: chains as any,
      },
      includePending: true,
    });

    console.log(`[UnifiedBalanceKit] getBalances result for ${address}:`, JSON.stringify(result, null, 2));

    const depositorEntry = result.breakdown.find(
      (b) => b.depositor.toLowerCase() === address.toLowerCase()
    ) || result.breakdown[0];

    const chainList = (depositorEntry?.breakdown || []).map((c: ChainBalanceBreakdown) => ({
      chain: c.chain,
      confirmedBalance: c.confirmedBalance || '0.000000',
      pendingBalance: c.pendingBalance || '0.000000',
      hasPending: Boolean(c.pendingTransactions && c.pendingTransactions.length > 0),
    }));

    return {
      totalConfirmedBalance: result.totalConfirmedBalance || '0.000000',
      totalPendingBalance: result.totalPendingBalance || '0.000000',
      token: result.token || 'USDC',
      chains: chainList,
      depositor: address,
      raw: result,
    };
  } catch (error: any) {
    console.warn('UnifiedBalanceKit getBalances error:', error?.message || error);
    return {
      totalConfirmedBalance: '0.000000',
      totalPendingBalance: '0.000000',
      token: 'USDC',
      chains: chains.map((c) => ({
        chain: c,
        confirmedBalance: '0.000000',
        pendingBalance: '0.000000',
        hasPending: false,
      })),
      depositor: address,
      raw: null,
    };
  }
}

/**
 * Returns metadata for all supported chains in the Unified Balance Kit,
 * explicitly highlighting Arc Testnet.
 */
export function getArcKitSupportedChains() {
  const context = getUnifiedBalanceKitContext();
  const allChains = getSupportedChains(context);
  const arcChains = allChains.filter(
    (c) => c.chain.toLowerCase().includes('arc') || c.chain.toLowerCase().includes('base')
  );

  return {
    allCount: allChains.length,
    arcChains: arcChains.map((c) => ({
      chain: c.chain,
      name: c.name,
      chainId: 'chainId' in c ? c.chainId : undefined,
      isTestnet: c.isTestnet,
      usdcAddress: c.usdcAddress,
      explorerUrl: c.explorerUrl,
    })),
  };
}

export {
  createUnifiedBalanceKitContext,
  getBalances,
  getSupportedChains,
  estimateDeposit,
  deposit,
  depositFor,
  spend,
  estimateSpend,
};
