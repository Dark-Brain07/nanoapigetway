'use client';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function UsdcBalance() {
  const { address, isConnected } = useAccount();
  const [gatewayBalance, setGatewayBalance] = useState<string | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setGatewayBalance(null);
      setOnChainBalance(null);
      return;
    }
    
    let isMounted = true;
    
    const fetchBalances = async () => {
      try {
        const res = await fetch(`/api/unified-balance?address=${address}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setGatewayBalance(data.available || '0.000000');
          setOnChainBalance(data.onChain?.usdcTokenBalance || '0.000000');
        }
      } catch (e) {
        if (isMounted) {
          setGatewayBalance('0.000000');
        }
      }
    };
    
    fetchBalances();
    const interval = setInterval(fetchBalances, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, isConnected]);

  if (!isConnected) return null;

  const gwParsed = gatewayBalance ? parseFloat(gatewayBalance) : 0;
  const onChainParsed = onChainBalance ? parseFloat(onChainBalance) : 0;
  const isZeroGateway = gwParsed <= 0;
  const hasOnChain = onChainParsed > 0;

  return (
    <div className="hidden sm:flex items-center gap-2">
      {/* On-Chain Arc Wallet Balance (Rail 1: Direct) */}
      <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs shadow-inner border transition-colors ${
        hasOnChain
          ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-300'
          : 'bg-black border-slate-800 text-slate-400'
      }`}>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Wallet:</span>
        <span className="font-mono font-bold text-slate-100">
          {onChainBalance !== null ? parseFloat(onChainBalance).toFixed(4) : '...'}
        </span>
        <span className="text-[10px] text-cyan-400 font-semibold uppercase">USDC</span>
      </div>

      {/* Circle Gateway Unified Balance (Rail 2: Gasless Nanopayments) */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs shadow-inner transition-colors ${
        gwParsed > 0
          ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
          : 'bg-slate-900/60 border-slate-800 text-slate-400'
      }`}>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Gateway:</span>
        <span className="font-mono font-bold text-slate-100">
          ${gatewayBalance !== null ? parseFloat(gatewayBalance).toFixed(4) : '...'}
        </span>
        {isZeroGateway && !hasOnChain && (
          <Link
            href="/add-funds"
            className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 px-1.5 py-0.5 rounded transition-colors"
          >
            <PlusCircle size={10} /> Deposit
          </Link>
        )}
      </div>
    </div>
  );
}

