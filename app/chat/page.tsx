'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { Bot, Send, User, BrainCircuit, Activity, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { ARC_USDC_CONTRACT } from '../../lib/arcConfig';

import UsdcBalance from '../../components/UsdcBalance';
import WalletConnector from '../../components/WalletConnector';

export default function ChatPage() {
  const { address, chain } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your Agentic Smart Assistant. You pay per message using USDC via the x402 protocol on Arc Testnet. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'challenging' | 'paying' | 'success'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsProcessing(true);
    setPaymentStatus('challenging');

    try {
      // 1. Initial Call (gets 402 Challenge)
      const initRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      if (initRes.status === 402) {
        const challenge = await initRes.json();
        setPaymentStatus('paying');
        
        // 2. Pay 0.001 USDC
        let txHash = '';
        
        // TRY GATEWAY BALANCE FIRST (Gasless)
        try {
          const deductRes = await fetch('/api/add-funds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'deduct_unified_balance',
              amount: challenge.amount,
              walletAddress: address
            })
          });

          const deductData = await deductRes.json();
          
          if (deductRes.ok && deductData.status === 'SUCCESS') {
            console.log('Paid using Unified Gateway Balance!');
            txHash = 'GATEWAY_PAYMENT_SUCCESS'; // Virtual txHash
          } else {
            // FALLBACK TO METAMASK ON-CHAIN PAYMENT
            // EXPLICIT CHAIN SWITCH: Ensure user is on Arc Testnet for micropayment
            if (chain?.id !== 5042002) {
              setMessages(prev => [...prev, { role: 'assistant', text: 'Please approve the network switch to Arc Testnet in your wallet to process the payment.' }]);
              await switchChainAsync({ chainId: 5042002 });
            }

            txHash = await sendTransactionAsync({
              to: challenge.accepts[0].payTo as `0x${string}`,
              value: parseEther(challenge.amount), // Native ARC used for fee sim
              chainId: 5042002,
            });
          }
        } catch (err: any) {
          console.error("Payment failed", err);
          throw err;
        }

        // Mock waiting for indexing
        await new Promise(r => setTimeout(r, 2000));
        setPaymentStatus('success');

        // 3. Get Data using the txHash as proof
        const dataRes = await fetch('/api/data/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `L402 ${txHash}`
          },
          body: JSON.stringify({ message: userMsg })
        });

        if (dataRes.ok) {
          const data = await dataRes.json();
          setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
          setTotalTokens(prev => prev + (data.tokensUsed || 0));
        } else {
          setMessages(prev => [...prev, { role: 'assistant', text: 'Error: Failed to fetch AI response after payment.' }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Error: Did not receive 402 challenge.' }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Payment or network error occurred.' }]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setPaymentStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-fuchsia-500/30">
      {/* Navbar Minimal */}
      <header className="bg-black/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <span className="font-bold text-white tracking-tight">NanoAPI<span className="text-cyan-400">Gateway</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/50 px-3.5 py-1.5 rounded-xl transition-all"
            >
              ← Back to Dashboard
            </Link>
            <UsdcBalance />
            <WalletConnector variant="navbar" />
          </div>
        </div>
      </header>

      <main className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 overflow-hidden z-30">
        {/* Background Blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        {/* Desktop Absolute Sidebars */}
        <div className="hidden xl:flex absolute right-12 top-[20%] flex-col gap-6 z-10 w-64">
          <div className="flex flex-col p-5 bg-[#0A0D12] border border-[#1E293B] rounded-2xl shadow-2xl">
            <div className="text-[#94A3B8] text-xs font-bold uppercase tracking-[0.2em] mb-3 text-center">Payment Method</div>
            <div className="relative w-full bg-[#0F141C]/90 border border-fuchsia-500/30 text-white text-sm font-bold rounded-xl px-4 py-3 text-center shadow-[0_0_15px_rgba(217,70,239,0.1)]">
              USDC on Arc (~$0.001)
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 bg-[#0A0D12] border border-[#1E293B] rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent pointer-events-none"></div>
            <div className="text-[#94A3B8] text-xs font-bold uppercase tracking-[0.2em] mb-4 text-center z-10">AI Tokens Used</div>
            <div className="text-4xl font-black text-fuchsia-400 mb-2 drop-shadow-[0_0_15px_rgba(217,70,239,0.4)] z-10">{totalTokens.toLocaleString()}</div>
            <div className="text-slate-500 text-sm text-center z-10">Consumed by your connected account</div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex flex-col w-full max-w-4xl h-[85vh] min-h-[600px] bg-[#0A0D12] border border-[#1E293B] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden z-10">
          
          {/* Header */}
          <div className="border-b border-[#1E293B] bg-[#0F141C] p-5 shrink-0 flex items-center justify-between">
            <h1 className="text-xl font-black text-white flex items-center gap-3">
              <span className="bg-fuchsia-500/20 p-2 rounded-xl text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                <BrainCircuit size={20} />
              </span>
              Agentic Chat
            </h1>
            <div className="text-sm text-slate-400 bg-black px-4 py-1.5 rounded-full border border-slate-800 shadow-inner font-mono">
              Cost: <span className="text-cyan-400 font-bold">$0.001 USDC</span> / msg
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-6 bg-[#050505] space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-5 shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 text-white rounded-br-sm border border-fuchsia-500/30' 
                    : 'bg-[#121822] text-slate-200 rounded-bl-sm border border-[#1E293B]'
                }`}>
                  <div className="text-xs font-bold mb-2 opacity-70 flex items-center gap-2">
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    {msg.role === 'user' ? 'You' : 'Agentic Assistant'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-medium">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl p-4 bg-[#121822] text-slate-200 rounded-bl-sm border border-[#1E293B]">
                  <div className="flex flex-col gap-3">
                    {paymentStatus === 'challenging' && (
                      <div className="flex items-center gap-2 text-xs text-yellow-500 font-bold tracking-widest uppercase">
                        <Loader2 className="animate-spin w-4 h-4" /> 402 Payment Required...
                      </div>
                    )}
                    {paymentStatus === 'paying' && (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold tracking-widest uppercase">
                        <Activity className="animate-pulse w-4 h-4" /> Executing $0.001 USDC TX...
                      </div>
                    )}
                    {paymentStatus === 'success' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold tracking-widest uppercase">
                        <CheckCircle2 className="w-4 h-4" /> TX Confirmed, Generating Reply...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <div className="p-5 bg-[#0F141C] border-t border-[#1E293B] shrink-0">
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setInput('Analyze the future of AI agents.')} className="text-xs bg-[#1A2332] hover:bg-[#253247] text-slate-400 hover:text-white px-4 py-2 rounded-full transition-colors border border-slate-800">🤖 Future of AI agents</button>
              <button onClick={() => setInput('Write a smart contract for micropayments.')} className="text-xs bg-[#1A2332] hover:bg-[#253247] text-slate-400 hover:text-white px-4 py-2 rounded-full transition-colors border border-slate-800">💻 Write smart contract</button>
            </div>
            <div className="w-full flex gap-3 relative">
              <input 
                type="text" 
                placeholder={!address ? "Connect wallet to chat..." : "Type your message..."}
                className="flex-grow min-w-0 bg-[#050505] border border-[#1E293B] shadow-inner rounded-xl px-5 py-4 text-white focus:outline-none focus:border-fuchsia-500/50 transition-colors disabled:opacity-50 font-medium" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isProcessing || !address}
              />
              <button 
                onClick={handleSend}
                disabled={isProcessing || !input.trim() || !address} 
                className="bg-gradient-to-b from-fuchsia-500 to-fuchsia-700 hover:from-fuchsia-400 hover:to-fuchsia-600 text-white font-bold px-8 py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,70,239,0.3)] flex items-center gap-2 shrink-0 border border-fuchsia-400/50"
              >
                <span>Send</span>
                <Send size={18} className={isProcessing ? "opacity-50" : ""} />
              </button>
            </div>
            {!address && (
              <div className="text-center mt-3 text-xs text-red-400 font-bold">
                Wallet connection required for x402 micropayments.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
