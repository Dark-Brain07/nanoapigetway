'use client';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ARC_TESTNET } from '../lib/arcConfig';
import { Wallet, Loader2, ExternalLink, X } from 'lucide-react';

interface WalletConnectorProps {
  variant?: 'navbar' | 'card';
}

export default function WalletConnector({ variant = 'card' }: WalletConnectorProps = {}) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET.id });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // External Wallet connected state
  if (isConnected) {
    if (variant === 'navbar') {
      return (
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner flex items-center gap-2 h-[34px]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="font-mono text-cyan-400 text-[11px] sm:text-xs tracking-wide">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-red-100 bg-gradient-to-b from-red-600 to-red-800 px-3 py-1.5 rounded-xl border border-red-500/50 shadow-[0_4px_0_rgb(153,27,27)] hover:from-red-500 hover:to-red-700 hover:shadow-[0_4px_0_rgb(153,27,27),0_0_10px_rgba(239,68,68,0.4)] active:translate-y-[4px] active:shadow-[0_0_0_rgb(153,27,27)] transition-all tracking-wide h-[34px]"
          >
            Disconnect
          </button>
        </div>
      );
    } else {
      return (
        <div className="p-5 bg-gradient-to-br from-cyan-950/40 to-slate-900 rounded-xl border border-cyan-500/20 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">
            <Wallet size={14} />
            {activeConnector?.name || 'Wallet'} Connected
          </div>
          <div className="flex justify-between items-center gap-3">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <span className="font-mono text-cyan-400 text-xs truncate" title={address}>{address?.slice(0, 6)}...{address?.slice(-6)}</span>
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
  }

  // Not connected
  return (
    <div className="flex flex-col gap-3">

      {variant === 'navbar' ? (
        <button
          onClick={() => setIsWalletModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-b from-purple-500 to-purple-700 px-4 py-1.5 rounded-xl border border-purple-400/50 shadow-[0_4px_0_rgb(126,34,206)] hover:from-purple-400 hover:to-purple-600 hover:shadow-[0_4px_0_rgb(126,34,206),0_0_15px_rgba(168,85,247,0.5)] active:translate-y-[4px] active:shadow-[0_0_0_rgb(126,34,206)] transition-all tracking-wide h-[34px]"
        >
          <Wallet size={14} className="text-white shrink-0" />
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={() => setIsWalletModalOpen(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl flex items-center justify-center font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] gap-2 text-sm"
        >
          <Wallet size={16} className="text-white" />
          Connect Wallet
        </button>
      )}

      {isWalletModalOpen && mounted && createPortal(
        <div className="fixed top-0 left-0 w-screen h-[100dvh] z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white tracking-tight">Connect Wallet</h3>
              <button 
                onClick={() => setIsWalletModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3 relative z-10 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {connectors.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i).map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setIsWalletModalOpen(false);
                  }}
                  className="flex items-center gap-4 w-full p-4 rounded-xl bg-black/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0 p-1">
                    {connector.icon ? (
                       <img src={connector.icon} alt={connector.name} className="w-full h-full object-contain" />
                    ) : (
                       <Wallet size={20} className="text-slate-400 group-hover:text-white" />
                    )}
                  </div>
                  
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-slate-200 group-hover:text-white">{connector.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Browser Extension</span>
                  </div>
                </button>
              ))}
            </div>
            
          </div>
        </div>,
        document.body
      )}


    </div>
  );
}
