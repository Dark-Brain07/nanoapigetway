export default function MarginAnalysis() {
  return (
    <div className="col-span-full border border-slate-800 bg-black p-4 sm:p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow">
      <h3 className="text-xl font-bold mb-4 text-white">Why Arc Wins: Margin Analysis</h3>
      <p className="text-slate-400 text-sm mb-6">Payment processors take ~30¢ per transaction. Ethereum gas costs $0.50+. This makes sub-cent micropayments economically impossible. See how Arc changes the game.</p>
      
      <div className="overflow-x-auto text-sm mb-6 rounded-lg border border-slate-800 bg-black overflow-hidden shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Payment Method</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Fee / call</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Viable at $0.001?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-400">
            <tr className="hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4 flex items-center gap-2">Stripe/Card</td>
              <td className="py-3 px-4 text-red-400 bg-red-900/10 font-mono">$0.30 + 2.9%</td>
              <td className="py-3 px-4 text-slate-300">❌ Fee &gt; Payment</td>
            </tr>
            <tr className="hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4">Ethereum Gas</td>
              <td className="py-3 px-4 text-red-400 bg-red-900/10 font-mono">~$0.50-$5.00</td>
              <td className="py-3 px-4 text-slate-300">❌ Fee &gt; Payment</td>
            </tr>
            <tr className="bg-purple-900/10 hover:bg-purple-900/20 transition-colors">
              <td className="py-3 px-4 text-purple-200">Solana</td>
              <td className="py-3 px-4 text-yellow-400 font-mono">~$0.00025</td>
              <td className="py-3 px-4 text-purple-200">✅ Maybe</td>
            </tr>
            <tr className="bg-cyan-900/20 hover:bg-cyan-900/30 font-medium text-slate-200 transition-colors border-t border-cyan-800/40">
              <td className="py-3 px-4 text-cyan-400 font-bold">Arc + x402</td>
              <td className="py-3 px-4 text-green-400 font-mono font-bold">~$0.000001</td>
              <td className="py-3 px-4 text-cyan-300 font-semibold tracking-wide">✅ YES! 1000x cheaper</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-purple-900/20 border border-purple-800/50 p-5 rounded-lg shadow-sm">
        <div className="text-purple-300 font-bold mb-3 uppercase tracking-widest text-xs">The Profit Logic Demonstration</div>
        <div className="text-slate-300 text-sm leading-relaxed space-y-3">
          <p className="opacity-90">If 1,000 users call the weather API 10 times a day:</p>
          <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700/50 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-700/50 gap-1">
              <span className="text-slate-400">Traditional Gateway Fees:</span> 
              <span className="text-red-400 font-mono font-bold bg-red-900/20 px-2 py-0.5 rounded">$3,000 LOST</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-1 gap-1">
              <span className="text-slate-300 font-medium">Arc + x402 Fees:</span> 
              <span className="text-green-400 font-mono font-bold bg-green-900/20 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(74,222,128,0.2)]">$0.01 PAID = 100% PROFIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
