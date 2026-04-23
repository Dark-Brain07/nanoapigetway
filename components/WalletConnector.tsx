'use client';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';
import { ARC_TESTNET } from '../lib/arcConfig';
import { Wallet, Shield, Loader2, ExternalLink, Copy } from 'lucide-react';

interface CircleWalletData {
  walletId: string;
  address: string;
}

export default function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET.id });

  const [circleWallet, setCircleWallet] = useState<CircleWalletData | null>(null);
  const [circleLoading, setCircleLoading] = useState(false);
  const [circleError, setCircleError] = useState('');
  const [isDestroying, setIsDestroying] = useState(false);

  // Load Circle wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('circleWallet');
    if (stored) {
      try {
        setCircleWallet(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const handleCircleConnect = async () => {
    setCircleLoading(true);
    setCircleError('');
    try {
      const res = await fetch('/api/circle-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'NanoAPI_User_' + Date.now() }),
      });
      const data = await res.json();
      if (data.wallet?.address && data.wallet?.id) {
        const walletData: CircleWalletData = {
          walletId: data.wallet.id,
          address: data.wallet.address,
        };
        setCircleWallet(walletData);
        localStorage.setItem('circleWallet', JSON.stringify(walletData));
        // Dispatch event so ApiCards can pick it up immediately
        window.dispatchEvent(new Event('circleWalletChanged'));
      } else {
        setCircleError('Wallet creation returned no address. Check Circle API key.');
      }
    } catch (e) {
      console.error(e);
      setCircleError('Failed to create Circle wallet.');
    }
    setCircleLoading(false);
  };

  const handleCircleDisconnect = () => {
    setIsDestroying(true);
    setTimeout(() => {
      setCircleWallet(null);
      localStorage.removeItem('circleWallet');
      window.dispatchEvent(new Event('circleWalletChanged'));
      setIsDestroying(false);
    }, 400);
  };

  // Circle Developer Wallet connected state
  if (circleWallet) {
    return (
      <div className="relative p-5 bg-black rounded-xl border border-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden group/wallet">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-50"></div>
        <div className="absolute -left-20 -top-20 w-40 h-40 bg-cyan-500/10 blur-[50px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} className="text-cyan-400" />
            Circle Dev Wallet
          </div>
          <button
            onClick={handleCircleDisconnect}
            disabled={isDestroying}
            className={`px-3 py-1.5 rounded transition-all duration-300 text-[10px] uppercase tracking-wider
              ${isDestroying ? 'opacity-0 scale-150 blur-md grayscale tracking-[0.5em] rotate-3' : 'bg-red-950/30 text-red-400 border border-red-900/50 font-bold hover:scale-110 hover:bg-red-900/50 hover:text-red-300 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:font-black'}`}
          >
            Disconnect
          </button>
        </div>
        
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between bg-[#09090b] px-3 py-2.5 rounded-lg border border-slate-800 shadow-inner group-hover/wallet:border-slate-700 transition-colors">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Address</span>
              <span className="font-mono text-cyan-400 text-xs truncate max-w-[180px] sm:max-w-[220px]" title={circleWallet.address}>{circleWallet.address}</span>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(circleWallet.address)}
              className="text-slate-500 hover:text-cyan-400 transition-colors p-1.5 rounded-md hover:bg-slate-800 border border-transparent hover:border-slate-700"
              title="Copy Address"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MetaMask connected state
  if (isConnected) {
    return (
      <div className="p-5 bg-gradient-to-br from-cyan-950/40 to-slate-900 rounded-xl border border-cyan-500/20 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">
          <Wallet size={14} />
          MetaMask Connected
        </div>
        <div className="flex justify-between items-center gap-3">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <span className="font-mono text-cyan-400 text-xs truncate" title={address}>{address}</span>
            <span className="text-purple-400 text-xs truncate">{balance?.formatted} {balance?.symbol}</span>
          </div>
          <button
            onClick={() => disconnect()}
            className="px-3 py-1.5 bg-red-900/40 text-red-400 rounded-lg hover:bg-red-900/60 transition-colors text-xs font-medium border border-red-800/40 shrink-0"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Not connected - show both options
  return (
    <div className="flex flex-col gap-3">
      {connectors.filter(c => c.name === 'MetaMask' || c.id === 'injected').map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="px-4 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl flex items-center justify-center font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] gap-2"
        >
          <Wallet size={18} />
          Connect {connector.name}
        </button>
      ))}

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-700"></div>
        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider font-semibold">Or</span>
        <div className="flex-grow border-t border-slate-700"></div>
      </div>

      <button
        onClick={handleCircleConnect}
        disabled={circleLoading}
        className="px-4 py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl flex items-center justify-center font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] gap-2 disabled:opacity-50"
      >
        {circleLoading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Creating Wallet...
          </>
        ) : (
          <>
            <Shield size={18} />
            Create Circle Developer Wallet
          </>
        )}
      </button>

      {circleError && (
        <div className="text-red-400 text-xs text-center bg-red-950/30 p-2 rounded-lg border border-red-900/50">
          {circleError}
        </div>
      )}
    </div>
  );
}
