import Link from 'next/link';
import ApiCard from '../../components/ApiCard';
import TransactionFeed from '../../components/TransactionFeed';
import MarginAnalysis from '../../components/MarginAnalysis';
import UnifiedBalanceUI from '../../components/UnifiedBalanceUI';
import UsdcBalance from '../../components/UsdcBalance';
import WalletConnector from '../../components/WalletConnector';
import MobileMenu from '../../components/MobileMenu';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black">
      {/* Top Navbar */}
      <header className="bg-black/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/nanoapigateway_logo.png"
              alt="NanoAPI Gateway Logo"
              className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            />
            <span className="font-bold text-white text-lg tracking-tight">
              NanoAPI<span className="text-cyan-400">Gateway</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative hidden sm:block group/tip">
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-500 px-4 py-1.5 rounded-xl border border-yellow-400/50 shadow-[0_4px_0_rgb(161,98,7)] hover:from-yellow-200 hover:to-yellow-400 hover:shadow-[0_4px_0_rgb(161,98,7),0_0_15px_rgba(250,204,21,0.4)] active:translate-y-[4px] active:shadow-[0_0_0_rgb(161,98,7)] transition-all tracking-wide group"
              >
                <span className="flex h-1.5 w-1.5 rounded-full bg-black animate-pulse"></span>
                Agentic chat
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
              <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 leading-relaxed opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 z-50 pointer-events-none">
                <div className="font-bold text-yellow-400 mb-1 text-xs">🤖 Agentic Smart Assistant</div>
                Chat with an autonomous AI agent paying $0.0001 USDC per message via Circle Gateway Nanopayments on Arc Mainnet.
                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 border-l border-t border-slate-700 rotate-45"></div>
              </div>
            </div>

            <div className="relative hidden sm:block group/tip">
              <Link
                href="/add-funds"
                className="relative inline-flex items-center justify-center px-3.5 py-1.5 font-black text-slate-900 bg-gradient-to-b from-cyan-400 to-cyan-500 rounded-xl shadow-[0_4px_0_rgb(8,145,178)] hover:from-cyan-300 hover:to-cyan-400 active:translate-y-[4px] active:shadow-[0_0_0_rgb(8,145,178)] transition-all text-[10px] sm:text-xs border border-cyan-200/50 h-[34px]"
              >
                <span className="text-slate-900 font-extrabold mr-1">+</span>
                Deposit Gateway
              </Link>
              <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 leading-relaxed opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 z-50 pointer-events-none">
                <div className="font-bold text-cyan-400 mb-1 text-xs">⚡ Circle Gateway Funding</div>
                Deposit USDC to Circle Gateway Wallet on Arc Mainnet for instant, gas-free nanopayments.
                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 border-l border-t border-slate-700 rotate-45"></div>
              </div>
            </div>
            <UsdcBalance />
            <WalletConnector variant="navbar" />
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main API Area */}
          <div className="xl:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 drop-shadow-sm">API Marketplace</h2>
              <p className="text-slate-400 text-sm sm:text-lg">
                Production sub-cent micropayments via Circle Gateway Unified Balance & x402 V2 on Arc Mainnet.
              </p>
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
                description="Summarize extensive text via real AI inference."
                price="$0.005"
                paramName="text"
                defaultParam="Web3 protocols enable ownership and autonomous agentic commerce."
              />
              <ApiCard
                title="AI Translate"
                endpoint="/api/translate"
                description="Translate English to 30 global languages."
                price="$0.003"
                paramName="text"
                defaultParam="Hello, the future is agentic."
                dropdownParamName="targetLang"
                dropdownOptions={[
                  'Spanish',
                  'French',
                  'German',
                  'Chinese',
                  'Japanese',
                  'Hindi',
                  'Arabic',
                  'Russian',
                  'Portuguese',
                  'Bangla',
                ]}
              />
              <ApiCard
                title="Token Information"
                endpoint="/api/token-info"
                description="Inspect on-chain token metadata & contract statistics on Arc Mainnet."
                price="$0.001"
                paramName="contractAddress"
                defaultParam="0x3600000000000000000000000000000000000000"
              />
            </div>
            <div className="pt-8 pb-12 w-full">
              <MarginAnalysis />
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8 xl:sticky xl:top-24 h-fit">
            <TransactionFeed />
            <UnifiedBalanceUI />
          </div>
        </div>
      </main>
    </div>
  );
}
