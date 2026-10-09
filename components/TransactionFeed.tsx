'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';
import { getExplorerForTx } from '@/lib/chainExplorers';

interface TransactionItem {
  id: string;
  txHash: string;
  settlementId?: string | null;
  transactionHash?: string | null;
  amount: string;
  endpoint: string;
  timestamp: string;
  walletAddress: string;
  payer?: string;
  status: string;
  network?: string;
  error?: string | null;
  sourceChain?: string;
  metadata?: Record<string, any> | null;
}

export default function TransactionFeed() {
  const [txs, setTxs] = useState<TransactionItem[]>([]);
  const [count, setCount] = useState(0);

  const fetchTxs = async () => {
    try {
      const res = await fetch('/api/transactions?limit=50');
      const data = await res.json();
      setTxs(data.transactions || []);
      setCount(data.count || 0);
    } catch (e) {
      console.error('Failed to load transaction feed:', e);
    }
  };

  useEffect(() => {
    fetchTxs();
    const interval = setInterval(fetchTxs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/95 p-4 sm:p-6 rounded-2xl border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col h-[380px] sm:h-[420px] font-mono">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 border-b border-emerald-500/30 pb-3 sm:pb-4 gap-2">
        <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          root@arc-mainnet:~$ nanopayment_feed --live
        </h3>
        <div className="border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 rounded text-xs font-semibold flex items-center gap-2">
          <span className="text-emerald-300 font-bold">{txs.filter(t => t.status === 'settled').length}</span>
          <span className="text-emerald-600">SETTLED_EVENTS</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-emerald-900 space-y-1.5">
        {txs.map((tx, i) => {
          const isSettled = tx.status === 'settled';
          const isFailed = tx.status === 'failed';
          const isGateway = Boolean(tx.settlementId) || !tx.transactionHash;
          const displayId = tx.transactionHash || tx.settlementId || tx.txHash || '';
          const truncatedId = displayId.length > 14 ? `${displayId.slice(0, 8)}...${displayId.slice(-6)}` : displayId;

          return (
            <div
              key={tx.id || i}
              className={`p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                isFailed
                  ? 'bg-red-950/20 border-red-900/50 hover:border-red-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-emerald-500/40 hover:bg-emerald-950/20'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className={`font-semibold tracking-tight flex items-center gap-1.5 ${isFailed ? 'text-red-400' : 'text-emerald-400'}`}>
                  <span className={isFailed ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{'>'}</span>
                  <span>{tx.endpoint.replace('/api/', '').toUpperCase()}_CALL</span>
                </div>
                <div className="text-slate-400 text-[11px] ml-3.5">
                  FEE: <span className={isFailed ? 'text-red-300 font-semibold line-through' : 'text-emerald-300 font-semibold'}>{tx.amount}</span>
                  <span className="text-slate-600 mx-1.5">•</span>
                  PAYER: {tx.walletAddress?.slice(0, 6)}...{tx.walletAddress?.slice(-4)}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {isFailed ? (
                  <span
                    className="text-red-300 text-[10px] flex items-center gap-1 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40"
                    title={`Settlement Failed: ${tx.error || 'Payment rejected by Gateway'}`}
                  >
                    [FAILED] {tx.error ? tx.error.slice(0, 16) : truncatedId}
                  </span>
                ) : isGateway ? (
                  <span
                    className="text-emerald-300 text-[10px] flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40"
                    title={`Circle Gateway Settlement: ${displayId}`}
                  >
                    <Zap size={10} className="text-cyan-400" />
                    [GATEWAY SETTLED] {truncatedId}
                  </span>
                ) : (
                  (() => {
                    const explorer = getExplorerForTx(
                      tx.transactionHash || '',
                      tx.network,
                      tx.sourceChain || tx.metadata?.sourceChain
                    );
                    return (
                      <a
                        href={explorer.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`${explorer.badgeClass} text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border transition-colors`}
                        title={`View on ${explorer.name}`}
                      >
                        {explorer.badgeLabel} {truncatedId} <ArrowUpRight size={10} />
                      </a>
                    );
                  })()
                )}
                <div className="text-slate-500 text-[10px]">
                  {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'Just now'}
                </div>
              </div>
            </div>
          );
        })}

        {txs.length === 0 && (
          <div className="text-center text-slate-500 mt-14 text-sm font-sans">
            No gateway transactions recorded yet. Call an API above to initiate your first nanopayment.
          </div>
        )}
      </div>
    </div>
  );
}
