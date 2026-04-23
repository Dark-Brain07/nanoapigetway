import Link from 'next/link';
import ApiCard from '../../components/ApiCard';
import TransactionFeed from '../../components/TransactionFeed';
import MarginAnalysis from '../../components/MarginAnalysis';
import GatewayBridge from '../../components/GatewayBridge';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black">
      {/* Top Navbar */}
      <header className="bg-black/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/nanoapigateway_logo.png" alt="NanoAPI Gateway Logo" className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
            <span className="font-bold text-white text-lg tracking-tight">NanoAPI<span className="text-cyan-400">Gateway</span></span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="relative inline-flex items-center justify-center px-4 py-1.5 font-black text-white bg-gradient-to-b from-red-500 to-red-600 rounded-xl shadow-[0_4px_0_rgb(153,27,27)] hover:from-red-400 hover:to-red-500 hover:shadow-[0_4px_0_rgb(153,27,27),0_0_15px_rgba(239,68,68,0.6)] active:translate-y-[4px] active:shadow-[0_0_0_rgb(153,27,27)] transition-all group overflow-hidden border border-red-400/50 hidden sm:inline-flex">
              <span className="relative z-10 animate-pulse tracking-[0.2em] text-[10px] sm:text-xs">FAUCET</span>
            </a>
            <div className="relative hidden sm:block group/tip">
              <Link href="/demo" className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-500 px-4 py-1.5 rounded-xl border border-yellow-400/50 shadow-[0_4px_0_rgb(161,98,7)] hover:from-yellow-200 hover:to-yellow-400 hover:shadow-[0_4px_0_rgb(161,98,7),0_0_15px_rgba(250,204,21,0.4)] active:translate-y-[4px] active:shadow-[0_0_0_rgb(161,98,7)] transition-all tracking-wide group">
                <span className="flex h-1.5 w-1.5 rounded-full bg-black animate-pulse"></span>
                Autonomous Agent
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
              <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 leading-relaxed opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 z-50 pointer-events-none">
                <div className="font-bold text-yellow-400 mb-1 text-xs">⚡ Autonomous Payment Agent</div>
                Execute 50 real on-chain USDC micro-transactions via Circle Wallet on Arc Testnet — fully verifiable on ArcScan Explorer.
                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 border-l border-t border-slate-700 rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main API Area */}
          <div className="xl:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 drop-shadow-sm">API Marketplace</h2>
              <p className="text-slate-400 text-sm sm:text-lg">Sub-cent micropayments enabled by x402 on Arc Testnet.</p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6 items-start">
              <ApiCard 
                title="Weather Info"
                endpoint="/api/weather"
                description="Real-time global weather parameters."
                price="$0.001"
                paramName="city"
                defaultParam="Dhaka"
              />
              <ApiCard 
                title="Global News"
                endpoint="/api/news"
                description="Latest headlines by category."
                price="$0.002"
                paramName="category"
                defaultParam="technology"
              />
              <ApiCard 
                title="Crypto Pulse"
                endpoint="/api/crypto-price"
                description="Live multi-currency asset prices."
                price="$0.001"
                paramName="ids"
                defaultParam="bitcoin,ethereum,usd-coin"
              />
              <ApiCard 
                title="AI Summary"
                endpoint="/api/ai-summary"
                description="Summarize extensive text via Gemini."
                price="$0.005"
                paramName="text"
                defaultParam="Web3 protocols enable ownership..."
              />
              <ApiCard 
                title="AI Translate"
                endpoint="/api/translate"
                description="Translate English to 30 global languages."
                price="$0.003"
                paramName="text"
                defaultParam="Hello, the future is agentic."
                dropdownParamName="targetLang"
                dropdownOptions={['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi', 'Arabic', 'Russian', 'Portuguese', 'Bangla']}
              />
            </div>
            {/* Margin Analysis moved here to sit safely under the API cards */}
            <div className="pt-8 pb-12 w-full">
              <MarginAnalysis />
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8 xl:sticky xl:top-24 h-fit">
            <TransactionFeed />
            <GatewayBridge />
          </div>

        </div>
      </main>
    </div>
  );
}
