'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const FACILITATOR_ADDRESS = '0xfd4960F33670f3477ebe817B184dd59fC4961437';

const APIS = [
  { endpoint: '/api/weather', dataEndpoint: '/api/data/weather', params: 'city=London', name: 'Weather', price: '0.001' },
  { endpoint: '/api/news', dataEndpoint: '/api/data/news', params: 'category=science', name: 'News', price: '0.002' },
  { endpoint: '/api/crypto-price', dataEndpoint: '/api/data/crypto-price', params: 'ids=bitcoin', name: 'Crypto Pulse', price: '0.001' },
  { endpoint: '/api/weather', dataEndpoint: '/api/data/weather', params: 'city=Tokyo', name: 'Weather (Tokyo)', price: '0.001' },
  { endpoint: '/api/translate', dataEndpoint: '/api/data/translate', params: 'text=Hello&targetLang=Spanish', name: 'Translate', price: '0.003' },
];

interface CircleWalletData {
  walletId: string;
  address: string;
}

export default function Demo() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [circleWallet, setCircleWallet] = useState<CircleWalletData | null>(null);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, usdcSpent: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('circleWallet');
    if (stored) {
      try { setCircleWallet(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startDemo = async () => {
    if (running) {
      abortControllerRef.current?.abort();
      setRunning(false);
      addLog('⏹ Demo stopped by user.');
      return;
    }

    if (!circleWallet) {
      addLog('❌ No Circle wallet found. Please create one on the Dashboard first.');
      return;
    }

    setRunning(true);
    setLogs([]);
    setStats({ total: 0, success: 0, failed: 0, usdcSpent: 0 });
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    addLog('🚀 AUTONOMOUS PAYMENT AGENT INITIALIZED');
    addLog(`🔑 Wallet: ${circleWallet.address.slice(0, 6)}...${circleWallet.address.slice(-4)}`);
    addLog(`📡 Target: ${FACILITATOR_ADDRESS.slice(0, 6)}...${FACILITATOR_ADDRESS.slice(-4)}`);
    addLog('─'.repeat(50));

    let successCount = 0;
    let failCount = 0;
    let totalSpent = 0;

    try {
      for (let round = 0; round < 10; round++) {
        if (signal.aborted) break;

        addLog(`\n📦 ROUND ${round + 1}/10`);

        for (let j = 0; j < APIS.length; j++) {
          if (signal.aborted) break;
          const api = APIS[j];
          const callNum = round * APIS.length + j + 1;

          addLog(`⏳ [TX #${callNum}] ${api.name} — Sending ${api.price} USDC...`);

          try {
            // Step 1: Real Circle USDC transfer
            const transferRes = await fetch('/api/circle-wallet/transfer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletId: circleWallet.walletId,
                destination: FACILITATOR_ADDRESS,
                amount: api.price,
              }),
              signal,
            });
            const transferData = await transferRes.json();

            if (!transferData.success || !transferData.txHash) {
              failCount++;
              addLog(`❌ [TX #${callNum}] ${api.name} — Payment failed: ${transferData.error || 'Unknown error'}`);
              setStats({ total: callNum, success: successCount, failed: failCount, usdcSpent: totalSpent });
              continue;
            }

            const txHash = transferData.txHash;
            const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;

            // Step 2: Fetch API data
            await fetch(`${api.dataEndpoint}?${api.params}`, { signal });

            // Step 3: Log transaction
            await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                txHash,
                amount: api.price + ' USDC',
                endpoint: api.endpoint,
                walletAddress: circleWallet.address,
              }),
              signal,
            });

            successCount++;
            totalSpent += parseFloat(api.price);
            addLog(`✅ [TX #${callNum}] ${api.name} — PAID ${api.price} USDC | Hash: ${shortHash}`);
            setStats({ total: callNum, success: successCount, failed: failCount, usdcSpent: totalSpent });

            // Small delay between txns to avoid rate limiting
            await new Promise(r => setTimeout(r, 800));

          } catch (e: any) {
            if (e.name === 'AbortError') break;
            failCount++;
            addLog(`❌ [TX #${callNum}] ${api.name} — Error: ${e.message}`);
            setStats(prev => ({ ...prev, total: callNum, failed: failCount }));
          }
        }
      }

      if (!signal.aborted) {
        addLog('─'.repeat(50));
        addLog(`🏁 DEMO COMPLETE — ${successCount} real on-chain transactions!`);
        addLog(`💰 Total USDC spent: ${totalSpent.toFixed(4)} USDC`);
        addLog(`🔍 All transactions verifiable on https://testnet.arcscan.app`);
        setRunning(false);
      }
    } catch (e) {
      if (!signal.aborted) {
        addLog('❌ Demo encountered a critical error.');
        setRunning(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white font-mono flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <nav className="mb-8 sm:mb-12 flex justify-between items-center">
          <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 font-sans font-medium flex items-center gap-2 group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
          </Link>
          <div className="text-xs text-green-400 font-mono uppercase tracking-widest border border-green-500/30 bg-green-950/30 px-3 py-1 rounded-sm shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            {'>'} Real On-Chain Demo_
          </div>
        </nav>
        
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700/80 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-green-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-10 gap-6 relative z-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                Autonomous Agent Demo
              </h1>
              <p className="text-slate-400 font-sans max-w-lg leading-relaxed text-sm">
                Executes 50 <strong className="text-green-400">real on-chain USDC micro-transactions</strong> on Arc Testnet via Circle Programmable Wallet. Every transaction is immutably recorded and verifiable on <span className="text-cyan-400">ArcScan Explorer</span>. Full transaction history, analytics, and hash details are available on your <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors">Live Dashboard</Link>.
              </p>
              {!circleWallet && (
                <p className="text-red-400 text-xs mt-2 font-sans">
                  ⚠ No Circle wallet detected. <Link href="/dashboard" className="underline">Create one first →</Link>
                </p>
              )}
            </div>
            
            <button 
              onClick={startDemo}
              disabled={!circleWallet && !running}
              className={`${running ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-green-600 hover:bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]'} px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 font-sans tracking-wide min-w-[180px] sm:min-w-[200px] flex justify-center items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {running ? (
                <>
                  <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                  Stop Demo
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  Start 50 Real Txns
                </>
              )}
            </button>
          </div>

          {/* Live Stats Bar */}
          <div className="grid grid-cols-4 gap-3 mb-4 relative z-10">
            <div className="bg-black/60 rounded-lg p-3 border border-slate-800 text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total</div>
              <div className="text-xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-black/60 rounded-lg p-3 border border-green-900/50 text-center">
              <div className="text-xs text-green-500 uppercase tracking-wider mb-1">Success</div>
              <div className="text-xl font-bold text-green-400">{stats.success}</div>
            </div>
            <div className="bg-black/60 rounded-lg p-3 border border-red-900/50 text-center">
              <div className="text-xs text-red-500 uppercase tracking-wider mb-1">Failed</div>
              <div className="text-xl font-bold text-red-400">{stats.failed}</div>
            </div>
            <div className="bg-black/60 rounded-lg p-3 border border-cyan-900/50 text-center">
              <div className="text-xs text-cyan-500 uppercase tracking-wider mb-1">USDC Spent</div>
              <div className="text-xl font-bold text-cyan-400">{stats.usdcSpent.toFixed(4)}</div>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="bg-black/90 rounded-xl border border-slate-800 p-4 sm:p-6 h-[400px] sm:h-[450px] overflow-y-auto text-sm font-mono shadow-inner relative z-10 scrollbar-thin scrollbar-thumb-slate-700">
            <div className="sticky top-0 bg-black/90 pb-2 border-b border-slate-800/50 mb-4 flex justify-between text-xs text-slate-500 uppercase tracking-widest font-bold">
              <span>root@arc-testnet:~# agent_demo.sh</span>
              <span className={running ? 'text-green-400 animate-pulse' : 'text-slate-600'}>{running ? '● LIVE' : '○ IDLE'}</span>
            </div>
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-600 italic">
                {circleWallet ? 'Ready. Press "Start 50 Real Txns" to begin...' : 'Create a Circle wallet on the Dashboard first.'}
              </div>
            ) : null}
            <div className="space-y-1 pb-4">
              {logs.map((log, i) => (
                <div key={i} className={`${log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : log.includes('⏹') || log.includes('🏁') ? 'text-yellow-400' : log.includes('🚀') || log.includes('📦') ? 'text-cyan-400' : 'text-slate-300'} leading-relaxed text-xs sm:text-sm`}>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
