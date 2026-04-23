'use client';
import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';

interface CircleWalletData {
  walletId: string;
  address: string;
}

export default function UsdcBalance() {
  const [circleBalance, setCircleBalance] = useState<string | null>(null);
  const [isCircleWallet, setIsCircleWallet] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { data: wagmiBalance } = useBalance({ 
    address,
    query: {
      enabled: isConnected && !isCircleWallet,
      refetchInterval: 10000
    }
  });

  useEffect(() => {
    const fetchBalance = async () => {
      const stored = localStorage.getItem('circleWallet');
      if (!stored) { 
        setIsCircleWallet(false);
        setCircleBalance(null); 
        return; 
      }
      
      setIsCircleWallet(true);
      try {
        const wallet: CircleWalletData = JSON.parse(stored);
        const res = await fetch(`/api/circle-wallet?walletId=${wallet.walletId}`);
        const data = await res.json();
        
        if (data.balances && data.balances.length > 0) {
          const usdc = data.balances.find((b: any) => b.token?.symbol === 'USDC') || data.balances[0];
          setCircleBalance(usdc?.amount || '0');
        } else {
          setCircleBalance('0');
        }
      } catch {
        setCircleBalance(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    window.addEventListener('circleWalletChanged', fetchBalance);
    window.addEventListener('storage', fetchBalance);
    return () => {
      clearInterval(interval);
      window.removeEventListener('circleWalletChanged', fetchBalance);
      window.removeEventListener('storage', fetchBalance);
    };
  }, []);

  const displayBalance = isCircleWallet 
    ? circleBalance 
    : (isConnected && wagmiBalance ? wagmiBalance.formatted : null);

  if (displayBalance === null) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
      <img src="/usdc_logo.png" alt="USDC" className="w-5 h-5 rounded-full" />
      <span className="text-xs font-bold text-white font-mono">{parseFloat(displayBalance).toFixed(4)}</span>
      <span className="text-[10px] text-slate-500 uppercase">USDC</span>
    </div>
  );
}
