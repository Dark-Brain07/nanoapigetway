export interface ExplorerResult {
  name: string;
  url: string;
  badgeLabel: string;
  badgeClass: string;
}

/**
 * Maps any transaction hash to its authentic blockchain explorer based on
 * network identifier, chain name, or domain ID.
 */
export function getExplorerForTx(
  txHash: string,
  network?: string | null,
  sourceChain?: string | null
): ExplorerResult {
  if (!txHash) {
    return {
      name: 'Explorer',
      url: '#',
      badgeLabel: '[ON-CHAIN]',
      badgeClass: 'text-slate-400 bg-slate-900 border-slate-800',
    };
  }

  const net = (network || '').toLowerCase().trim();
  const src = (sourceChain || '').toLowerCase().trim();
  const str = `${net} ${src}`;

  // 1. Base (Chain ID 8453, Circle Gateway Domain 6)
  if (
    str.includes('8453') ||
    str.includes('base') ||
    net.includes('domain:6')
  ) {
    return {
      name: 'BaseScan',
      url: `https://basescan.org/tx/${txHash}`,
      badgeLabel: '[BASE ON-CHAIN]',
      badgeClass: 'text-blue-400 hover:text-blue-200 bg-blue-950/60 border-blue-800/60',
    };
  }

  // 2. Polygon (Chain ID 137, Circle Gateway Domain 7)
  if (
    str.includes('137') ||
    str.includes('polygon') ||
    str.includes('matic') ||
    net.includes('domain:7')
  ) {
    return {
      name: 'PolygonScan',
      url: `https://polygonscan.com/tx/${txHash}`,
      badgeLabel: '[POLYGON ON-CHAIN]',
      badgeClass: 'text-purple-400 hover:text-purple-200 bg-purple-950/60 border-purple-800/60',
    };
  }

  // 3. Ethereum Mainnet (Chain ID 1, Circle Gateway Domain 0)
  if (
    net === 'eip155:1' ||
    net === 'ethereum' ||
    net === 'domain:0' ||
    src === 'ethereum' ||
    src === 'eth' ||
    net.includes('domain:ethereum')
  ) {
    return {
      name: 'Etherscan',
      url: `https://etherscan.io/tx/${txHash}`,
      badgeLabel: '[ETH ON-CHAIN]',
      badgeClass: 'text-slate-300 hover:text-white bg-slate-900/70 border-slate-700/70',
    };
  }

  // 4. Arbitrum One (Chain ID 42161, Circle Gateway Domain 3)
  if (
    str.includes('42161') ||
    str.includes('arbitrum') ||
    str.includes('arb') ||
    net.includes('domain:3')
  ) {
    return {
      name: 'Arbiscan',
      url: `https://arbiscan.io/tx/${txHash}`,
      badgeLabel: '[ARB ON-CHAIN]',
      badgeClass: 'text-sky-400 hover:text-sky-200 bg-sky-950/60 border-sky-800/60',
    };
  }

  // 5. Avalanche C-Chain (Chain ID 43114, Circle Gateway Domain 1)
  if (
    str.includes('43114') ||
    str.includes('avalanche') ||
    str.includes('avax') ||
    net.includes('domain:1')
  ) {
    return {
      name: 'Snowtrace',
      url: `https://snowtrace.io/tx/${txHash}`,
      badgeLabel: '[AVAX ON-CHAIN]',
      badgeClass: 'text-red-400 hover:text-red-200 bg-red-950/60 border-red-800/60',
    };
  }

  // 6. Optimism (Chain ID 10, Circle Gateway Domain 2)
  if (
    str.includes('optimism') ||
    str.includes('op') ||
    net === 'eip155:10' ||
    net.includes('domain:2')
  ) {
    return {
      name: 'Optimism Etherscan',
      url: `https://optimistic.etherscan.io/tx/${txHash}`,
      badgeLabel: '[OP ON-CHAIN]',
      badgeClass: 'text-rose-400 hover:text-rose-200 bg-rose-950/60 border-rose-800/60',
    };
  }

  // 7. Solana (Circle Gateway Domain 5)
  if (
    str.includes('solana') ||
    str.includes('sol') ||
    net.includes('domain:5')
  ) {
    return {
      name: 'Solscan',
      url: `https://solscan.io/tx/${txHash}`,
      badgeLabel: '[SOL ON-CHAIN]',
      badgeClass: 'text-teal-400 hover:text-teal-200 bg-teal-950/60 border-teal-800/60',
    };
  }

  // Default: Arc Mainnet (Chain ID 5042, Circle Gateway Domain 26)
  return {
    name: 'Arc Explorer',
    url: `https://explorer.arc.io/tx/${txHash}`,
    badgeLabel: '[ARC ON-CHAIN]',
    badgeClass: 'text-cyan-400 hover:text-cyan-200 bg-cyan-950/50 border-cyan-800/50',
  };
}
