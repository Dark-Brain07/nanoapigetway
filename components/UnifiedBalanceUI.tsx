'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Loader2, Wallet, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';

export default function UnifiedBalanceUI() {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<string>('0.000000');
  const [onChainUsdc, setOnChainUsdc] = useState<string>('0.0000');
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({});
  const [breakdown, setBreakdown] = useState<Array<{ chain: string; confirmedBalance: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isSellerView, setIsSellerView] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      setLoading(true);
      try {
        const query = isSellerView ? '?seller=true' : address ? `?address=${address}` : '';
        if (!query) {
          setBalance('0.000000');
          setOnChainUsdc('0.0000');
          setWalletBalances({});
          setBreakdown([]);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/unified-balance${query}`);
        const data = await res.json();

        setBalance(data.available || '0.000000');
        setOnChainUsdc(data.onChain?.usdcTokenBalance || '0.0000');
        if (data.walletBalances) {
          const parsed: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.walletBalances as Record<string, any>)) {
            parsed[k] = v.usdcTokenBalance || '0.0000';
          }
          setWalletBalances(parsed);
        }
        setBreakdown(data.breakdown || []);
      } catch (e) {
        console.error('Failed to query Unified Balance:', e);
        setBalance('0.000000');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [address, isConnected, isSellerView]);

  const hasExternalWalletFunds = Object.values(walletBalances).some((v) => parseFloat(v) > 0);
  const isGatewayEmpty = parseFloat(balance) === 0;

  return (
    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 shadow-2xl col-span-full h-full flex flex-col hover:border-cyan-500/40 transition-all group relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-[60px] pointer-events-none rounded-full group-hover:bg-cyan-500/20 transition-all duration-500"></div>

      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-slate-300">
          <Sparkles size={14} className="text-cyan-400" />
          {isSellerView ? 'Seller Gateway Revenue' : 'Circle Gateway Unified Balance'}
        </h3>
        <button
          onClick={() => setIsSellerView(!isSellerView)}
          className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wider transition-colors"
        >
          {isSellerView ? 'View Buyer Balance' : 'View Seller Revenue'}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center py-4 relative z-10">
        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
          Available Nanopayment Liquidity
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-3xl font-black my-2">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-cyan-400 font-mono text-3xl sm:text-4xl font-black tracking-tight drop-shadow-[0_0_15px_rgba(34,211,238,0.35)]">
              ${parseFloat(balance).toFixed(4)}
            </span>
            <span className="text-slate-500 font-bold text-xs uppercase">USDC</span>
          </div>
        )}

        {/* On-Chain Personal Wallet Balances across all active chains */}
        {!isSellerView && address && (
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 text-[10.5px]">
            {Object.entries(walletBalances)
              .filter(([_, bal]) => parseFloat(bal) > 0)
              .map(([chainName, bal]) => (
                <div
                  key={chainName}
                  className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800"
                  title={`Your ${chainName} personal wallet balance`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      chainName === 'Arc'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : chainName === 'Base'
                        ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                        : chainName === 'Polygon'
                        ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                        : 'bg-cyan-400'
                    }`}
                  ></span>
                  <span className="text-slate-400">{chainName}:</span>
                  <span className="text-slate-200 font-mono font-bold">${parseFloat(bal).toFixed(4)}</span>
                </div>
              ))}
          </div>
        )}

        {/* Informative helper when user has USDC in personal wallet that isn't deposited yet */}
        {!loading && !isSellerView && address && isGatewayEmpty && hasExternalWalletFunds && (
          <div className="mt-3 mx-2 p-2 rounded-xl bg-blue-950/30 border border-blue-800/40 text-[10.5px] text-blue-300 text-center leading-relaxed">
            ℹ️ You have personal wallet USDC on {
              Object.entries(walletBalances)
                .filter(([_, bal]) => parseFloat(bal) > 0)
                .map(([name]) => name)
                .join(', ') || 'connected chains'
            }. Deposit to Circle Gateway to enable cross-chain nanopayments!
          </div>
        )}

        {/* Chain Breakdown */}
        {!loading && breakdown && breakdown.length > 0 && (
          <div className="flex flex-col gap-1 mt-3 w-full max-w-[240px]">
            {breakdown.slice(0, 3).map((c, i) => (
              <div
                key={i}
                className="flex justify-between items-center text-[10px] bg-slate-950/80 border border-slate-800/80 px-2.5 py-1 rounded-md"
              >
                <span className="text-slate-400 font-semibold">{c.chain}</span>
                <span className="text-cyan-300 font-mono font-medium">${parseFloat(c.confirmedBalance).toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 relative z-10">
        <Link
          href="/add-funds"
          className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 group/btn"
        >
          <Plus size={14} className="group-hover/btn:rotate-90 transition-transform duration-300" />
          Deposit / Fund Gateway
        </Link>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 text-center mt-2.5 relative z-10">
        <ShieldCheck size={11} className="text-emerald-400" />
        <span>Indexed by Circle Gateway (Domain 26 • Arc Mainnet)</span>
      </div>
    </div>
  );
}
