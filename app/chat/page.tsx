'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useSignTypedData, useSwitchChain, useWriteContract, usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';
import { Bot, Send, User, BrainCircuit, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import {
  ARC_CHAIN_ID,
  ARC_USDC_CONTRACT,
  CIRCLE_GATEWAY_WALLET,
  CIRCLE_BATCHING_NAME,
  CIRCLE_BATCHING_VERSION,
} from '@/lib/arcConfig';
import UsdcBalance from '@/components/UsdcBalance';
import WalletConnector from '@/components/WalletConnector';
import MobileMenu from '@/components/MobileMenu';
import { getExplorerForTx } from '@/lib/chainExplorers';

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
  txHash?: string | null;
  method?: string;
}

export default function ChatPage() {
  const { address, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your Agentic Smart Assistant. You pay per message using USDC via the x402 protocol on Arc Mainnet. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'challenging' | 'paying' | 'success'>('idle');
  const [totalTokens, setTotalTokens] = useState(148);
  const [activePaymentRail, setActivePaymentRail] = useState('Circle Gateway');
  const [gwBalance, setGwBalance] = useState<number>(0);
  const [arcBalance, setArcBalance] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Query user balances to show active payment method
  useEffect(() => {
    if (!address) {
      setActivePaymentRail('Circle Gateway');
      return;
    }
    fetch(`/api/unified-balance?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        const onChain = parseFloat(data?.onChain?.usdcTokenBalance || '0');
        const gw = parseFloat(data?.available || '0');
        setGwBalance(gw);
        setArcBalance(onChain);
        if (gw >= 0.0001) {
          setActivePaymentRail('Circle Gateway');
        } else if (onChain >= 0.0001) {
          setActivePaymentRail('Direct Arc Wallet');
        } else {
          setActivePaymentRail('Circle Gateway');
        }
      })
      .catch(() => null);
  }, [address]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    if (!address) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Please connect your wallet first to authorize payments.' },
      ]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsProcessing(true);
    setPaymentStatus('challenging');

    try {
      // 1. Initial Call (gets HTTP 402 Challenge)
      const initRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages }),
      });

      if (initRes.status !== 402) {
        if (initRes.ok) {
          const data = await initRes.json();
          setMessages((prev) => [...prev, { role: 'assistant', text: data.reply || 'No reply generated.' }]);
          setIsProcessing(false);
          setPaymentStatus('idle');
          return;
        }
        throw new Error(`Unexpected server status ${initRes.status}`);
      }

      const challenge = await initRes.json();
      const directAccept = challenge.accepts?.find((a: any) => a.scheme === 'direct-arc');

      // Check balances to determine payment rail & funded chain
      const balRes = await fetch(`/api/unified-balance?address=${address}`).catch(() => null);
      const balData = await balRes?.json().catch(() => null);
      const availableGw = parseFloat(balData?.available || '0');
      const onChainUsdc = parseFloat(balData?.onChain?.usdcTokenBalance || '0');

      // Find the gateway requirement matching the chain where the user holds Circle Gateway balance
      let gatewayAccept = challenge.accepts?.find((a: any) => {
        if (a.scheme !== 'exact') return false;
        const chainId = parseInt(a.network.replace('eip155:', ''));
        const matchingDomain = balData?.breakdown?.find((b: any) => {
          if (b.domain === 6 && chainId === 8453) return parseFloat(b.confirmedBalance) > 0;
          if (b.domain === 26 && chainId === 5042) return parseFloat(b.confirmedBalance) > 0;
          if (b.domain === 7 && chainId === 137) return parseFloat(b.confirmedBalance) > 0;
          if (b.domain === 3 && chainId === 42161) return parseFloat(b.confirmedBalance) > 0;
          if (b.domain === 0 && chainId === 1) return parseFloat(b.confirmedBalance) > 0;
          return false;
        });
        return Boolean(matchingDomain);
      });

      if (!gatewayAccept) {
        gatewayAccept = challenge.accepts?.find((a: any) => a.scheme === 'exact');
      }

      const accept = gatewayAccept || directAccept || challenge.accepts?.[0];
      if (!accept) throw new Error('No payment requirements in 402 challenge');

      const payTo = accept.payTo;
      const atomicAmount = accept.amount;
      const requiredAmountUnits = BigInt(atomicAmount);
      const requiredUsdc = Number(atomicAmount) / 1_000_000;

      if (address && payTo && address.toLowerCase() === payTo.toLowerCase()) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ Self-transfer detected: Connected wallet (${address.slice(0, 6)}...${address.slice(-4)}) is the seller revenue address configured in .env.local. Please switch to another account in your wallet to test!`,
          },
        ]);
        setIsProcessing(false);
        setPaymentStatus('idle');
        return;
      }

      let paidRes: Response;
      let usedMethod = '';
      let usedScheme: 'direct-arc' | 'exact' = 'exact';
      let activeTxHash: string | null = null;

      setPaymentStatus('paying');

      const useGateway =
        activePaymentRail === 'Circle Gateway'
          ? availableGw >= requiredUsdc || onChainUsdc < requiredUsdc
          : availableGw >= requiredUsdc && onChainUsdc < requiredUsdc;

      const targetChainId = useGateway && gatewayAccept?.network
        ? parseInt(gatewayAccept.network.replace('eip155:', ''))
        : ARC_CHAIN_ID;

      // Ensure network is appropriately set for the chosen rail
      if (chain?.id !== targetChainId && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: targetChainId });
        } catch (switchErr) {
          console.warn('Network switch warning:', switchErr);
        }
      }

      if (useGateway && availableGw >= requiredUsdc) {
        // =========================================================
        // RAIL 2: CIRCLE GATEWAY UNIFIED BALANCE (Gasless Nanopayment)
        // =========================================================
        usedMethod = `Circle Gateway Nanopayment (${gatewayAccept?.network ? 'Chain ' + targetChainId : 'Arc'})`;
        usedScheme = 'exact';

        const nonceBytes = new Uint8Array(32);
        crypto.getRandomValues(nonceBytes);
        const nonce = `0x${Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

        const now = Math.floor(Date.now() / 1000);
        const validAfter = 0n;
        const validBefore = BigInt(now + (gatewayAccept?.maxTimeoutSeconds || 2592000));

        const domain = {
          name: gatewayAccept?.extra?.name || CIRCLE_BATCHING_NAME,
          version: gatewayAccept?.extra?.version || CIRCLE_BATCHING_VERSION,
          chainId: targetChainId,
          verifyingContract: (gatewayAccept?.extra?.verifyingContract || CIRCLE_GATEWAY_WALLET) as `0x${string}`,
        };

        const types = {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        } as const;

        const message = {
          from: address as `0x${string}`,
          to: payTo as `0x${string}`,
          value: requiredAmountUnits,
          validAfter,
          validBefore,
          nonce: nonce as `0x${string}`,
        };

        const signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message,
        });

        const paymentPayload = {
          x402Version: 2,
          scheme: 'exact',
          network: gatewayAccept?.network,
          asset: gatewayAccept?.asset,
          resource: {
            url: '/api/chat',
            description: 'AI Assistant inference per message',
            mimeType: 'application/json',
          },
          accepted: gatewayAccept || accept,
          payload: {
            authorization: {
              from: address,
              to: payTo,
              value: atomicAmount,
              validAfter: validAfter.toString(),
              validBefore: validBefore.toString(),
              nonce,
            },
            signature,
          },
        };

        paidRes = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'payment-signature': JSON.stringify(paymentPayload),
          },
          body: JSON.stringify({ message: userMsg, history: messages }),
        });
      } else if (onChainUsdc >= requiredUsdc) {
        // =========================================================
        // RAIL 1: DIRECT ARC WALLET PAYMENT
        // =========================================================
        usedMethod = 'Arc Mainnet Direct Transfer';
        usedScheme = 'direct-arc';

        const txHash = await writeContractAsync({
          address: ARC_USDC_CONTRACT as `0x${string}`,
          abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
          chainId: ARC_CHAIN_ID,
          functionName: 'transfer',
          args: [payTo as `0x${string}`, requiredAmountUnits],
        });

        activeTxHash = txHash;

        // Bounded wait: Arc block time is < 0.5s, never hang in browser
        try {
          if (publicClient) {
            await Promise.race([
              publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 3000 }),
              new Promise((r) => setTimeout(r, 1200)),
            ]);
          } else {
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch {
          // Bounded wait
        }

        const paymentPayload = {
          x402Version: 2,
          scheme: 'direct-arc',
          txHash,
          payer: address,
          amount: atomicAmount,
        };

        paidRes = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'payment-signature': JSON.stringify(paymentPayload),
          },
          body: JSON.stringify({ message: userMsg, history: messages }),
        });
      } else if (availableGw >= requiredUsdc) {
        // Fallback to Circle Gateway if needed
        usedMethod = 'Circle Gateway Nanopayment';
        usedScheme = 'exact';
        const nonceBytes = new Uint8Array(32);
        crypto.getRandomValues(nonceBytes);
        const nonce = `0x${Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

        const now = Math.floor(Date.now() / 1000);
        const validAfter = 0n;
        const validBefore = BigInt(now + (gatewayAccept?.maxTimeoutSeconds || 2592000));

        const domain = {
          name: gatewayAccept?.extra?.name || CIRCLE_BATCHING_NAME,
          version: gatewayAccept?.extra?.version || CIRCLE_BATCHING_VERSION,
          chainId: targetChainId,
          verifyingContract: (gatewayAccept?.extra?.verifyingContract || CIRCLE_GATEWAY_WALLET) as `0x${string}`,
        };

        const types = {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        } as const;

        const message = {
          from: address as `0x${string}`,
          to: payTo as `0x${string}`,
          value: requiredAmountUnits,
          validAfter,
          validBefore,
          nonce: nonce as `0x${string}`,
        };

        const signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message,
        });

        const paymentPayload = {
          x402Version: 2,
          scheme: 'exact',
          network: gatewayAccept?.network,
          asset: gatewayAccept?.asset,
          resource: {
            url: '/api/chat',
            description: 'AI Assistant inference per message',
            mimeType: 'application/json',
          },
          accepted: gatewayAccept || accept,
          payload: {
            authorization: {
              from: address,
              to: payTo,
              value: atomicAmount,
              validAfter: validAfter.toString(),
              validBefore: validBefore.toString(),
              nonce,
            },
            signature,
          },
        };

        paidRes = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'payment-signature': JSON.stringify(paymentPayload),
          },
          body: JSON.stringify({ message: userMsg, history: messages }),
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ Insufficient Funds: Your Arc wallet has ${onChainUsdc.toFixed(4)} USDC, and your Circle Unified Balance is $${availableGw.toFixed(4)}. Please add USDC to your Arc wallet or deposit into Circle Gateway to continue chatting.`,
          },
        ]);
        setIsProcessing(false);
        setPaymentStatus('idle');
        return;
      }

      const data = await paidRes.json();

      if (!paidRes.ok) {
        let displayError = data.error || 'Gateway rejected authorization';
        if (displayError.includes('insufficient_balance')) {
          displayError = `Insufficient Circle Gateway Unified Balance: Your on-chain wallet balance has not been deposited into Circle Gateway yet. Go to 'Deposit Gateway' in the navbar to deposit USDC into Circle Gateway (0x7777...00eE) for instant chat micropayments.`;
        }
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `⚠️ ${displayError}` },
        ]);
        setIsProcessing(false);
        setPaymentStatus('idle');
        return;
      }

      const settlementId = data._payment?.settlementId || activeTxHash;
      setPaymentStatus('success');

      // Record transaction in history table
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          endpoint: '/api/chat',
          amount: '$0.0001',
          atomicAmount,
          settlementId,
          txHash: activeTxHash || settlementId,
          scheme: usedScheme,
          status: 'settled',
        }),
      }).catch((e) => console.warn('Failed to record transaction history:', e));

      const replyContent = data.reply || 'No reply generated.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: replyContent,
          txHash: activeTxHash,
          method: usedMethod,
        },
      ]);

      // Increment token usage stat
      const estimatedTokens = Math.max(45, Math.floor(replyContent.length / 3.5));
      setTotalTokens((prev) => prev + estimatedTokens);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error: ${error.shortMessage || error.message || 'Payment or network error occurred.'}`,
        },
      ]);
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
            <span className="font-bold text-white tracking-tight text-lg">
              NanoAPI<span className="text-cyan-400">Gateway</span>
            </span>
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
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 overflow-hidden z-30">
        {/* Background Blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        {/* Desktop Absolute Sidebars */}
        <div className="hidden xl:flex absolute right-12 top-[20%] flex-col gap-6 z-10 w-64">
          <div className="flex flex-col p-5 bg-[#0A0D12] border border-[#1E293B] rounded-2xl shadow-2xl">
            <div className="text-[#94A3B8] text-xs font-bold uppercase tracking-[0.2em] mb-3 text-center">
              Payment Method
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActivePaymentRail('Circle Gateway')}
                className={`relative w-full text-xs font-bold rounded-xl px-3.5 py-3 text-left transition-all border flex items-center justify-between cursor-pointer ${
                  activePaymentRail === 'Circle Gateway'
                    ? 'bg-fuchsia-950/40 border-fuchsia-500/70 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                    : 'bg-[#0F141C]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${gwBalance >= 0.0001 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></span>
                  Circle Gateway
                </span>
                <span className="font-mono text-xs text-cyan-300 font-bold">
                  ${gwBalance.toFixed(4)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActivePaymentRail('Direct Arc Wallet')}
                className={`relative w-full text-xs font-bold rounded-xl px-3.5 py-3 text-left transition-all border flex items-center justify-between cursor-pointer ${
                  activePaymentRail === 'Direct Arc Wallet'
                    ? 'bg-fuchsia-950/40 border-fuchsia-500/70 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                    : 'bg-[#0F141C]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${arcBalance >= 0.0001 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></span>
                  Direct Arc Wallet
                </span>
                <span className="font-mono text-xs text-cyan-300 font-bold">
                  ${arcBalance.toFixed(4)}
                </span>
              </button>
            </div>
            <div className="text-[10px] text-slate-400 text-center mt-2.5">
              {activePaymentRail === 'Circle Gateway' ? '⚡ Gasless nanopayments via Unified Balance' : '🔗 On-chain direct ERC-20 transfer'}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-[#0A0D12] border border-[#1E293B] rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent pointer-events-none"></div>
            <div className="text-[#94A3B8] text-xs font-bold uppercase tracking-[0.2em] mb-4 text-center z-10">
              AI Tokens Used
            </div>
            <div className="text-4xl font-black text-fuchsia-400 mb-2 drop-shadow-[0_0_15px_rgba(217,70,239,0.4)] z-10">
              {totalTokens.toLocaleString()}
            </div>
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
              Cost: <span className="text-cyan-400 font-bold">$0.0001 USDC</span> / msg
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-6 bg-[#050505] space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-5 shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 text-white rounded-br-sm border border-fuchsia-500/30'
                      : 'bg-[#121822] text-slate-200 rounded-bl-sm border border-[#1E293B]'
                  }`}
                >
                  <div className="text-xs font-bold mb-2 opacity-70 flex items-center gap-2">
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    {msg.role === 'user' ? 'You' : 'Agentic Assistant'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-medium">
                    {msg.text}
                  </div>
                  {msg.txHash && (
                    <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-mono text-[11px]">Paid: {msg.method || 'Arc Mainnet'}</span>
                      {(() => {
                        const exp = getExplorerForTx(msg.txHash, null, msg.method);
                        return (
                          <a
                            href={exp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center gap-1 underline"
                            title={`View on ${exp.name}`}
                          >
                            {msg.txHash.slice(0, 10)}...{msg.txHash.slice(-6)} ↗
                          </a>
                        );
                      })()}
                    </div>
                  )}
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
                        <Activity className="animate-pulse w-4 h-4" /> Executing $0.0001 USDC Payment...
                      </div>
                    )}
                    {paymentStatus === 'success' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold tracking-widest uppercase">
                        <CheckCircle2 className="w-4 h-4" /> Payment Confirmed, Generating Reply...
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
              <button
                onClick={() => setInput('Analyze the future of AI agents.')}
                className="text-xs bg-[#1A2332] hover:bg-[#253247] text-slate-400 hover:text-white px-4 py-2 rounded-full transition-colors border border-slate-800"
              >
                🤖 Future of AI agents
              </button>
              <button
                onClick={() => setInput('Write a smart contract for micropayments.')}
                className="text-xs bg-[#1A2332] hover:bg-[#253247] text-slate-400 hover:text-white px-4 py-2 rounded-full transition-colors border border-slate-800"
              >
                💻 Write smart contract
              </button>
              <button
                onClick={() => setInput('Explain Arc x402 dual payment rails.')}
                className="text-xs bg-[#1A2332] hover:bg-[#253247] text-slate-400 hover:text-white px-4 py-2 rounded-full transition-colors border border-slate-800"
              >
                ⚡ Arc x402 Rails
              </button>
            </div>
            <div className="w-full flex gap-3 relative">
              <input
                type="text"
                placeholder={!address ? 'Connect wallet to chat...' : 'Type your message...'}
                className="flex-grow min-w-0 bg-[#050505] border border-[#1E293B] shadow-inner rounded-xl px-5 py-4 text-white focus:outline-none focus:border-fuchsia-500/50 transition-colors disabled:opacity-50 font-medium"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isProcessing || !address}
              />
              <button
                onClick={handleSend}
                disabled={isProcessing || !input.trim() || !address}
                className="bg-gradient-to-b from-fuchsia-500 to-fuchsia-700 hover:from-fuchsia-400 hover:to-fuchsia-600 text-white font-bold px-8 py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,70,239,0.3)] flex items-center gap-2 shrink-0 border border-fuchsia-400/50 cursor-pointer"
              >
                <span>Send</span>
                <Send size={18} className={isProcessing ? 'opacity-50' : ''} />
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
