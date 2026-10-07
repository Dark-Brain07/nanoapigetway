'use client';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';

export default function UsdcBalance() {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setBalance(null);
      return;
    }
    
    let isMounted = true;
    
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/arc-balance?address=${address}`);
        const data = await res.json();
        if (isMounted) {
          setBalance(data.balance);
        }
      } catch (e) {
        if (isMounted) setBalance('0');
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, isConnected]);

  if (!isConnected) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
      <img src="/usdc_logo.png" alt="USDC" className="w-5 h-5 rounded-full" />
      <span className="text-xs font-bold text-white font-mono">{balance ? parseFloat(balance).toFixed(6) : '...'}</span>
      <span className="text-[10px] text-slate-500 uppercase">USDC</span>
    </div>
  );
}
