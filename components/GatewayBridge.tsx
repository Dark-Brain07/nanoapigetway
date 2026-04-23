'use client';
import { useState } from 'react';

export default function GatewayBridge() {
  const [amount, setAmount] = useState('10');
  const [sourceChain, setSourceChain] = useState('Ethereum Sepolia');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBridge = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceChain,
          amount,
          destinationAddress: '0x000'
        })
      });
      const data = await res.json();
      setResult(data);
    } catch(e) {
      console.error(e);
      setResult({ error: 'Bridge failed' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-800/80 p-4 sm:p-6 rounded-xl border border-slate-700 shadow-xl col-span-full h-full flex flex-col hover:border-blue-500/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-10 -mt-10 rounded-full group-hover:bg-blue-500/20 transition-all"></div>
      
      <h3 className="text-xl font-bold mb-2 flex justify-between items-center text-white relative">
        <span className="flex items-center flex-wrap gap-2">
          Circle Gateway Bridge
          <span className="relative inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded bg-black border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)] overflow-hidden group-hover:shadow-[0_0_15px_rgba(34,197,94,0.6)] group-hover:border-green-400 transition-all">
            <span className="absolute inset-0 bg-green-500/10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none"></span>
            <span className="text-[10px] font-mono font-bold text-green-400 tracking-wider relative z-10">
              {'>'} AWAITING_DEPLOYMENT.sh
            </span>
            <span className="w-1.5 h-3 bg-green-400 animate-pulse relative z-10"></span>
          </span>
        </span>
        <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-700/50 shadow-inner text-[10px]">CCTP</div>
      </h3>
      <p className="text-slate-400 text-sm mb-6 relative">Seamlessly move USDC from testnets directly to Arc using Circle CCTP. <span className="text-amber-400/70 text-xs">(Demo Mode)</span></p>

      <div className="space-y-4 flex-1 flex flex-col justify-end relative">
        <div className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-slate-700/50 shadow-inner">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5 ml-1">Source Chain</label>
            <select 
              value={sourceChain} 
              onChange={e => setSourceChain(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            >
              <option>Ethereum Sepolia</option>
              <option>Base Sepolia</option>
              <option>Polygon Amoy</option>
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5 ml-1">Amount (USDC)</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 pl-8 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleBridge}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-900/40 mt-2 flex items-center justify-center gap-2 group-hover:shadow-blue-500/20"
        >
          {loading ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
              Bridging...
            </>
          ) : 'Bridge to Arc Testnet →'}
        </button>

        {result && (
          <div className="mt-4 text-xs p-3.5 bg-slate-950 rounded-lg border border-green-900/50 font-mono text-green-400 break-all animate-in fade-in slide-in-from-top-2 shadow-[0_0_15px_rgba(74,222,128,0.1)] relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
            <div className="font-semibold text-green-300 mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Bridge Success
            </div>
            <div className="truncate text-[10px] text-green-500 mt-2 max-w-full opacity-80" title={result.txHash}>Tx Hash: {result.txHash}</div>
          </div>
        )}
      </div>
    </div>
  );
}
