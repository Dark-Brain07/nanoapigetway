'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Loader2 } from 'lucide-react';

import { useAccount } from 'wagmi';

export default function UnifiedBalanceUI() {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<string | null>(null);
  const [chains, setChains] = useState<{chain: string, confirmedBalance: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address) {
        setBalance('0.00');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/unified-balance?address=${address}`);
        const data = await res.json();
        setBalance(data.available || '0.00');
        setChains(data.unifiedKit?.chains || []);
      } catch (e) {
        console.error(e);
        setBalance('0.00');
        setChains([]);
      }
      setLoading(false);
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [address, isConnected]);

  return (
    <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 shadow-xl col-span-full h-full flex flex-col hover:border-cyan-500/30 transition-all group relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 blur-[50px] pointer-events-none rounded-full group-hover:bg-cyan-500/20 transition-all duration-500"></div>
      
      <h3 className="text-sm font-bold mb-4 flex justify-between items-center text-white relative z-10 uppercase tracking-widest text-slate-300">
        <span className="flex items-center gap-2">
          <Sparkles size={16} className="text-cyan-400" />
          Arc Unified Balance
        </span>
        <span className="bg-cyan-900/40 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest">
          V2
        </span>
      </h3>
      
      <div className="flex-1 flex flex-col justify-center items-center py-6 relative z-10">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Total Liquidity</div>
        
        {loading ? (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-3xl font-black">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <div className="flex items-end gap-2 group-hover:scale-105 transition-transform duration-300">
            <span className="text-cyan-400 font-mono text-4xl font-black tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              ${Number(balance).toFixed(2)}
            </span>
            <span className="text-slate-500 font-bold text-sm mb-1.5 uppercase">USDC</span>
          </div>
        )}

        {/* Chain Breakdown */}
        {!loading && chains && chains.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-4 w-full max-w-[200px]">
            {chains.map((c, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] bg-slate-900/80 border border-slate-700/50 px-2 py-1 rounded shadow-inner">
                <span className="text-slate-400 font-bold uppercase tracking-wider">{c.chain.replace('_', ' ')}</span>
                <span className="text-cyan-300 font-mono font-medium">${Number(c.confirmedBalance).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 relative z-10">
        <Link 
          href="/onramp"
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 group/btn"
        >
          <Plus size={16} className="group-hover/btn:rotate-90 transition-transform duration-300" />
          Add Funds
        </Link>
      </div>
      
      <p className="text-[10px] text-slate-500 text-center mt-3 relative z-10">
        Powered by official @circle-fin/unified-balance-kit
      </p>
    </div>
  );
}
