import Link from 'next/link';
import WalletConnector from '../components/WalletConnector';
import HomeWrapper from '../components/HomeWrapper';
import UsdcBalance from '../components/UsdcBalance';

export default function Home() {
  return (
    <HomeWrapper>
    <div className="min-h-screen bg-black">
      {/* Top Navbar */}
      <header className="bg-transparent pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/nanoapigateway_logo.png" alt="NanoAPI Gateway Logo" className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
            <span className="font-bold text-white text-lg tracking-tight">NanoAPI<span className="text-cyan-400">Gateway</span></span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="relative inline-flex items-center justify-center px-4 py-1.5 font-black text-white bg-gradient-to-b from-red-500 to-red-600 rounded-xl shadow-[0_4px_0_rgb(153,27,27)] hover:from-red-400 hover:to-red-500 hover:shadow-[0_4px_0_rgb(153,27,27),0_0_15px_rgba(239,68,68,0.6)] active:translate-y-[4px] active:shadow-[0_0_0_rgb(153,27,27)] transition-all group overflow-hidden border border-red-400/50">
              <span className="relative z-10 animate-pulse tracking-[0.2em] text-[10px] sm:text-xs">FAUCET</span>
            </a>
            <UsdcBalance />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 xl:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        {/* Left Column — Hero Text */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">


          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] drop-shadow-lg">
            Pay <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-blue-400 to-white uppercase text-shadow-sm" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.7em', verticalAlign: 'middle', textShadow: '3px 3px 0px rgba(0,0,0,0.3)', WebkitTextStroke: '1px transparent' }}>Sub-Cent</span> <br />
            For AI APIs
          </h1>
          
          <p className="text-sm sm:text-lg text-slate-300 max-w-xl leading-relaxed font-light">
            NanoAPI Gateway leverages the <strong className="text-white font-medium">x402 protocol</strong> to enable true pay-per-use APIs. 
            Connect to access premium AI endpoints starting at just 
            <span className="text-cyan-400 font-bold ml-1 bg-cyan-950/50 px-2 rounded">$0.001 USDC</span> per call.
          </p>
        </div>

        {/* Right Column — Get Started */}
        <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
          <div className="max-w-md mx-auto lg:ml-auto p-5 sm:p-8 bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl space-y-5">
            <h3 className="font-bold text-slate-100 text-lg border-b border-slate-700/50 pb-3 tracking-tight">
              Gateway Authentication
            </h3>
            <WalletConnector />
            <div className="pt-3 border-t border-slate-700/50">
              <Link href="/dashboard" className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 focus:ring-2 focus:ring-yellow-500 focus:outline-none text-black text-center font-black rounded-xl transition-all border border-yellow-400 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] group">
                Enter Dashboard 
                <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="mt-16 sm:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left border-t border-green-900/40 pt-10 sm:pt-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-green-500/80 to-transparent shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
        
        {/* Box 1 */}
        <div className="group relative space-y-4 p-8 bg-black rounded-lg border border-green-900/50 hover:border-green-500 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,1)] hover:shadow-[0_0_25px_rgba(34,197,94,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none z-0"></div>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 blur-[50px] group-hover:bg-green-500/20 transition-colors"></div>
          
          <div className="relative z-10 flex flex-col items-start">
            <div className="w-14 h-14 mb-4 border border-green-700/50 bg-black p-2 relative group-hover:border-green-400 transition-colors shadow-inner">
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-green-500"></div>
              <img src="/usdc_logo.png" alt="USDC Settlement Logo" className="w-full h-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
            </div>
            <h3 className="text-lg font-black text-green-400 font-mono tracking-tight uppercase flex items-center gap-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              <span className="text-green-600">{'//'}</span> USDC Settlement
            </h3>
            <p className="text-green-500/70 text-sm leading-relaxed mt-4 font-mono">
              {'>'} Transactions are settled instantly using Circle&apos;s USDC token directly on the Arc blockchain testnet with ~$0.000001 gas.<span className="animate-pulse font-bold text-green-400 ml-1">_</span>
            </p>
          </div>
        </div>
        
        {/* Box 2 */}
        <div className="group relative space-y-4 p-8 bg-black rounded-lg border border-green-900/50 hover:border-green-500 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,1)] hover:shadow-[0_0_25px_rgba(34,197,94,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none z-0"></div>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 blur-[50px] group-hover:bg-green-500/20 transition-colors"></div>
          
          <div className="relative z-10 flex flex-col items-start">
            <div className="w-14 h-14 mb-4 border border-green-700/50 bg-black p-2 relative group-hover:border-green-400 transition-colors shadow-inner">
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-green-500"></div>
              <img src="/x402_logo.png" alt="x402 Protocol Logo" className="w-full h-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
            </div>
            <h3 className="text-lg font-black text-green-400 font-mono tracking-tight uppercase flex items-center gap-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              <span className="text-green-600">{'//'}</span> x402 Protocol
            </h3>
            <p className="text-green-500/70 text-sm leading-relaxed mt-4 font-mono">
              {'>'} Native HTTP response code 402 integration for autonomous multi-agent economies and automated pay-per-use systems.<span className="animate-pulse font-bold text-green-400 ml-1">_</span>
            </p>
          </div>
        </div>

        {/* Box 3 */}
        <div className="group relative space-y-4 p-8 bg-black rounded-lg border border-green-900/50 hover:border-green-500 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,1)] hover:shadow-[0_0_25px_rgba(34,197,94,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none z-0"></div>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 blur-[50px] group-hover:bg-green-500/20 transition-colors"></div>
          
          <div className="relative z-10 flex flex-col items-start">
            <div className="w-14 h-14 mb-4 border border-green-700/50 bg-black p-2 relative group-hover:border-green-400 transition-colors shadow-inner">
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-green-500"></div>
              <img src="/dev_wallet_logo.png" alt="Developer Wallets Logo" className="w-full h-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
            </div>
            <h3 className="text-lg font-black text-green-400 font-mono tracking-tight uppercase flex items-center gap-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              <span className="text-green-600">{'//'}</span> Developer Wallets
            </h3>
            <p className="text-green-500/70 text-sm leading-relaxed mt-4 font-mono">
              {'>'} No extension needed. Circle&apos;s SDK handles secure on-chain wallet generation for seamless user experience.<span className="animate-pulse font-bold text-green-400 ml-1">_</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
    </HomeWrapper>
  );
}
