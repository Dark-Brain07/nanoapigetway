'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Zap, CheckCircle2, Activity } from 'lucide-react';
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
    <div className="bg-black/95 p-4 sm:p-5 rounded-2xl border border-emerald-500/35 shadow-[0_0_30px_rgba(16,185,129,0.12)] overflow-hidden flex flex-col h-[390px] sm:h-[430px] font-mono">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3 gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block shadow-[0_0_6px_rgba(245,158,11,0.5)]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 truncate ml-1 flex items-center gap-1.5">
            <Activity size={12} className="text-emerald-400 shrink-0" />
            Arc Nanopayment Live Stream
          </span>
        </div>

        {/* Settled Events Counter Badge */}
        <div className="border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-2 shrink-0 shadow-inner">
          <span className="text-emerald-300 font-bold font-mono">
            {txs.filter(t => t.status === 'settled').length}
          </span>
          <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-wide">
            Settled
          </span>
        </div>
      </div>

      {/* Terminal Command Line Box */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-950/40 via-emerald-950/20 to-black/60 border border-emerald-500/30 rounded-xl px-3 py-2 mb-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)] shrink-0 overflow-hidden">
        <span className="text-emerald-400 font-bold text-xs select-none shrink-0">❯</span>
        <div className="flex items-center text-xs sm:text-[13px] font-bold font-mono tracking-tight overflow-x-auto scrollbar-none whitespace-nowrap min-w-0 flex-1">
          <span className="text-emerald-400 font-bold">root@arc-mainnet</span>
          <span className="text-emerald-600 font-bold">:</span>
          <span className="text-cyan-400 font-bold">~</span>
          <span className="text-slate-400 font-bold">$</span>
          <span className="text-white ml-2 font-semibold">nanopayment_feed</span>
          <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse ml-1 shrink-0"></span>
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
