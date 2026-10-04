'use client';
import { useAccount, useBalance } from 'wagmi';

export default function UsdcBalance() {
  const { address, isConnected, chain } = useAccount();

  let tokenAddress: `0x${string}` | undefined = undefined;
  if (chain?.id === 84532) { // Base Sepolia
    tokenAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  } else if (chain?.id === 11155111) { // Eth Sepolia
    tokenAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  }

  const { data: wagmiBalance } = useBalance({ 
    address,
    token: tokenAddress,
    query: {
      enabled: isConnected,
      refetchInterval: 10000
    }
  });

  const displayBalance = isConnected && wagmiBalance ? wagmiBalance.formatted : null;

  if (displayBalance === null) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
      <img src="/usdc_logo.png" alt="USDC" className="w-5 h-5 rounded-full" />
      <span className="text-xs font-bold text-white font-mono">{parseFloat(displayBalance).toFixed(4)}</span>
      <span className="text-[10px] text-slate-500 uppercase">USDC</span>
    </div>
  );
}
