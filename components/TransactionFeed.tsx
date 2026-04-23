'use client';
import { useEffect, useState } from 'react';

export default function TransactionFeed() {
  const [txs, setTxs] = useState<any[]>([]);
  const [count, setCount] = useState(0);

  const fetchTxs = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTxs(data.transactions || []);
      setCount(data.count || 0);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTxs();
    const interval = setInterval(fetchTxs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black p-4 sm:p-6 rounded-xl border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col h-[350px] sm:h-[400px] font-mono">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 border-b border-green-500/50 pb-3 sm:pb-4 gap-2">
        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-green-500">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          root@arc-testnet:~#
        </h3>
        <div className="border border-green-500/30 px-4 py-1.5 rounded-sm text-sm font-semibold flex items-center gap-2">
          <span className="text-green-400">[{count}]</span>
          <span className="text-green-600">TX_COUNT</span>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-green-800 space-y-1">
        {txs.map((tx, i) => (
          <div key={i} className="bg-transparent p-2 rounded border-l-2 border-transparent hover:border-green-500 hover:bg-green-900/20 transition-colors flex items-center justify-between text-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-1">
               <div className="text-green-400 font-bold tracking-tight">
                 <span className="text-green-600 mr-2">{'>'}</span>
                 {tx.endpoint.replace('/api/', '').toUpperCase()}_EXEC()
               </div>
               <div className="text-green-500 text-xs ml-4">FEE: {tx.amount} USDC</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <a 
                href={`https://testnet.arcscan.app/tx/${tx.txHash}`} 
                target="_blank" rel="noreferrer"
                className="text-green-500 hover:text-green-300 hover:underline text-xs flex items-center gap-1 transition-colors"
                title="View on ArcScan Explorer"
              >
                [0x{tx.txHash.slice(2,6)}...{tx.txHash.slice(-4)}] ↗
              </a>
              <div className="text-green-700 text-xs">
                {new Date(tx.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {txs.length === 0 && (
          <div className="text-center text-slate-500 mt-10">No transactions yet.</div>
        )}
      </div>
    </div>
  );
}
