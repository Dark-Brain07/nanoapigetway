'use client';
import { useState, useEffect } from 'react';
import { useSendTransaction, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { CloudSun, Newspaper, Activity, Sparkles, Globe, CheckCircle2, ArrowRight, Shield } from 'lucide-react';

// Map protected endpoints to their unprotected data mirrors
const DATA_MIRROR: Record<string, string> = {
  '/api/weather': '/api/data/weather',
  '/api/news': '/api/data/news',
  '/api/crypto-price': '/api/data/crypto-price',
  '/api/ai-summary': '/api/data/ai-summary',
  '/api/translate': '/api/data/translate',
};

interface CircleWalletData {
  walletId: string;
  address: string;
}

function ResultVisualizer({ endpoint, data }: { endpoint: string, data: any }) {
  if (data.error) {
    return (
      <div className="bg-red-500/10 border-l-2 border-red-500 p-3 text-red-400 text-sm">
        {data.error}
      </div>
    );
  }

  switch(endpoint) {
    case '/api/weather':
      return (
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 rounded-full text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20">
                <CloudSun size={28} />
              </div>
              <div>
                 <h4 className="text-xl font-bold text-slate-100">{data.name || 'Unknown Location'}</h4>
                 <p className="text-slate-400 capitalize text-sm mt-0.5">{data.weather?.[0]?.description || 'No description'}</p>
              </div>
           </div>
           <div className="text-right">
              <div className="text-3xl font-light text-white tracking-tight">
                {data.main?.temp ? (data.main.temp - 273.15).toFixed(1) : '--'}°
              </div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-500/70 font-semibold mt-1">Live Data</div>
           </div>
        </div>
      );
    case '/api/news':
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 mb-3 font-semibold text-sm tracking-wide uppercase">
            <Newspaper size={16} /> Top Headlines
          </div>
          {data.articles?.slice(0,2).map((a:any, i:number) => (
             <div key={i} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
               <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-relaxed">{a.title}</p>
               <div className="flex items-center gap-2 mt-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                 <span className="text-xs text-indigo-300/80 font-medium">{a.source?.name || 'News Source'}</span>
               </div>
             </div>
          ))}
        </div>
      );
    case '/api/crypto-price':
      const tokens = Object.keys(data).filter(k => k !== '_x402' && k !== 'mock');
      return (
        <div>
          <div className="flex items-center gap-2 text-emerald-400 mb-3 font-semibold text-sm tracking-wide uppercase">
            <Activity size={16} /> Live Markets
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            {tokens.map((t, i) => (
               <div key={i} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors flex flex-col relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/50 to-teal-400/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <span className="text-xs text-slate-400 capitalize mb-1">{t.replace('-', ' ')}</span>
                 <span className="text-lg font-bold text-emerald-400 tracking-tight">${data[t]?.usd?.toLocaleString() || '0.00'}</span>
               </div>
            ))}
          </div>
        </div>
      );
    case '/api/ai-summary':
      return (
        <div className="relative group">
           <div className="absolute -left-2 -top-2 text-purple-500/20 group-hover:text-purple-500/30 transition-colors pointer-events-none">
              <Sparkles size={64} />
           </div>
           <div className="pl-2 relative z-10">
              <div className="flex items-center gap-2 text-purple-400 mb-3 font-semibold text-sm tracking-wide uppercase">
                <Sparkles size={16} /> AI Summary
              </div>
              <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-4 shadow-inner">
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  &ldquo;{data.summary || 'Summary unavailable.'}&rdquo;
                </p>
              </div>
           </div>
        </div>
      );
    case '/api/translate':
      const translations = data.translations || {};
      const langs = Object.keys(translations);
      return (
        <div>
           <div className="flex items-center justify-between mb-4">
             <div className="flex flex-col items-center gap-1">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-800 rounded-md">Input: English</span>
             </div>
             <ArrowRight size={14} className="text-cyan-500/50" />
             <div className="flex flex-col items-center gap-1">
               <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest px-2 py-1 bg-cyan-950 rounded-md">Output: {langs[0] || 'Translated'}</span>
             </div>
           </div>
           
           <div className="relative bg-slate-900/50 border border-slate-700/80 rounded-2xl p-4 overflow-hidden shadow-inner max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
             <div className="absolute top-0 right-0 p-4 text-cyan-900/10 pointer-events-none sticky inset-x-0"><Globe size={80} className="float-right" /></div>
             
             {langs.length > 0 ? (
               <div className="flex flex-col gap-3 relative z-10">
                 {langs.map((lang, idx) => (
                   <div key={idx} className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/50 flex flex-col gap-2 hover:border-cyan-500/30 transition-colors w-full">
                      <span className="text-[10px] text-cyan-400/80 uppercase font-bold tracking-wider border-b border-slate-700/50 pb-1">{lang}</span>
                      <span className="text-sm sm:text-base text-cyan-50 font-medium leading-relaxed break-words">{translations[lang]}</span>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-red-400 relative z-10">Translation output unavailable.</p>
             )}
           </div>
        </div>
      );
    default:
      return (
         <pre className="text-xs text-slate-400 overflow-x-auto font-mono scrollbar-thin scrollbar-thumb-slate-700 max-h-32">
            {JSON.stringify(data, null, 2)}
         </pre>
      );
  }
}

export default function ApiCard({ title, endpoint, description, price, defaultParam, paramName, dropdownOptions, dropdownParamName }: any) {
  const [param, setParam] = useState(defaultParam);
  const [dropdownParam, setDropdownParam] = useState(dropdownOptions ? dropdownOptions[0] : '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { sendTransactionAsync } = useSendTransaction();
  const { address } = useAccount();

  // Listen for Circle wallet from localStorage
  const [circleWallet, setCircleWallet] = useState<CircleWalletData | null>(null);

  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem('circleWallet');
      if (stored) {
        try { setCircleWallet(JSON.parse(stored)); } catch { setCircleWallet(null); }
      } else {
        setCircleWallet(null);
      }
    };
    load();
    window.addEventListener('circleWalletChanged', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('circleWalletChanged', load);
      window.removeEventListener('storage', load);
    };
  }, []);

  const handleCall = async () => {
    setLoading(true);
    setResult(null);
    try {
      const queryParams = `${paramName}=${encodeURIComponent(param)}${dropdownParamName ? `&${dropdownParamName}=${encodeURIComponent(dropdownParam)}` : ''}`;
      
      // Step 1: Hit the x402-protected endpoint to trigger the 402 challenge
      const challengeRes = await fetch(`${endpoint}?${queryParams}`);
      const challengeData = await challengeRes.json();

      // Step 2: If we got a 402 (expected), execute payment
      let txHash = '';
      const payTo = challengeData.accepts?.[0]?.payTo || '0xfd4960F33670f3477ebe817B184dd59fC4961437';

      if (challengeRes.status === 402 || challengeData.error) {
        const numericPrice = price.replace('$', '');

        // ---- CIRCLE DEVELOPER WALLET PATH ----
        if (circleWallet) {
          try {
            const transferRes = await fetch('/api/circle-wallet/transfer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletId: circleWallet.walletId,
                destination: payTo,
                amount: numericPrice,
              }),
            });
            const transferData = await transferRes.json();

            if (transferData.success && transferData.txHash) {
              txHash = transferData.txHash;
            } else {
              setResult({ error: transferData.error || 'Circle transaction failed' });
              setLoading(false);
              return;
            }
          } catch (err: any) {
            console.error("Circle transfer error:", err);
            setResult({ error: 'Circle wallet transfer failed' });
            setLoading(false);
            return;
          }
        }
        // ---- METAMASK / WAGMI PATH ----
        else if (address) {
          try {
            txHash = await sendTransactionAsync({
              to: payTo as `0x${string}`,
              value: parseEther(numericPrice),
            });
          } catch (err: any) {
            console.log("Transaction rejected or failed", err);
            setResult({ error: 'Transaction rejected by wallet' });
            setLoading(false);
            return;
          }
        } else {
          setResult({ error: 'Please connect a wallet first (MetaMask or Circle)' });
          setLoading(false);
          return;
        }

        // Step 3: After successful payment, fetch data from the unprotected mirror endpoint
        const mirrorEndpoint = DATA_MIRROR[endpoint] || endpoint;
        const dataRes = await fetch(`${mirrorEndpoint}?${queryParams}`);
        const data = await dataRes.json();

        // Step 4: Log the real transaction
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: txHash,
            amount: numericPrice + ' USDC',
            endpoint: endpoint,
            walletAddress: circleWallet?.address || address,
          })
        });

        setResult({
          ...data,
          _x402: {
            paid: true,
            txHash,
            network: 'arc-testnet',
            paidVia: circleWallet ? 'circle' : 'metamask',
          },
        });
      } else {
        // No 402 = endpoint is not protected, just show the data
        setResult(challengeData);
      }
    } catch (e) {
      console.error(e);
      setResult({ error: 'Call failed' });
    }
    setLoading(false);
  };

  const isCircleMode = !!circleWallet;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-slate-700/50 hover:border-cyan-500/40 transition-all duration-300 group shadow-2xl flex flex-col">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors tracking-tight">{title}</h3>
        <span className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 text-green-300 text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)] font-medium whitespace-nowrap ml-2">
          {price} USDC/call
        </span>
      </div>

      <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-grow">{description}</p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-2 flex-shrink-0">
        <input
          type="text"
          value={param}
          onChange={e => setParam(e.target.value)}
          className="flex-[2] min-w-0 bg-slate-950/50 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
        />
        {dropdownOptions && (
          <select 
            value={dropdownParam}
            onChange={e => setDropdownParam(e.target.value)}
            className="flex-[1] min-w-[100px] bg-slate-950/50 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
          >
            {dropdownOptions.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
        <button
          onClick={handleCall}
          disabled={loading}
          className={`${
            isCircleMode
              ? 'bg-gradient-to-b from-purple-400 via-purple-600 to-purple-800 border-purple-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-10px_20px_rgba(0,0,0,0.4),0_5px_15px_rgba(0,0,0,0.5)] hover:brightness-110 active:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_10px_20px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.5)]'
              : 'bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-800 border-blue-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-10px_20px_rgba(0,0,0,0.4),0_5px_15px_rgba(0,0,0,0.5)] hover:brightness-110 active:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_10px_20px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.5)]'
          } relative overflow-hidden text-white border px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] sm:min-w-[130px] transform hover:-translate-y-px active:translate-y-[2px] w-full sm:w-auto before:absolute before:top-0 before:left-[5%] before:right-[5%] before:h-[45%] before:bg-gradient-to-b before:from-white/70 before:to-white/10 before:rounded-b-[100px] before:pointer-events-none drop-shadow-xl text-shadow-sm`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Activity className="animate-spin" size={16} /> Paying
            </div>
          ) : isCircleMode ? (
            <div className="flex items-center gap-2">
              <Shield size={16} /> Auto-Pay
            </div>
          ) : (
            'Call API →'
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
           {result.error ? (
             <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
                <Activity size={16} /> {result.error}
             </div>
           ) : (
             <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
               <div className="p-5">
                  <ResultVisualizer endpoint={endpoint} data={result} />
               </div>

               {result._x402 && (
                 <div className={`${
                   result._x402.paidVia === 'circle'
                     ? 'bg-gradient-to-r from-purple-950/60 to-fuchsia-900/40 border-t border-purple-900/40'
                     : 'bg-gradient-to-r from-emerald-950/60 to-teal-900/40 border-t border-emerald-900/40'
                 } px-3 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2`}>
                    <div className={`flex items-center gap-2 ${
                      result._x402.paidVia === 'circle' ? 'text-purple-400' : 'text-emerald-400'
                    } text-xs font-semibold tracking-wide uppercase`}>
                       {result._x402.paidVia === 'circle' ? <Shield size={16} /> : <CheckCircle2 size={16} />}
                       {result._x402.paidVia === 'circle' ? 'Paid via Circle Wallet' : 'Paid via ARC Network'}
                    </div>
                    <a href={`https://testnet.arcscan.app/tx/${result._x402.txHash}`} target="_blank" rel="noreferrer" className="text-cyan-400 bg-cyan-950/50 hover:bg-cyan-900/60 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all font-medium border border-cyan-800/50 hover:border-cyan-500/50">
                      View Tx <ArrowRight size={12} />
                    </a>
                 </div>
               )}
             </div>
           )}
        </div>
      )}
    </div>
  );
}
