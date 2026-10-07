'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAccount, useSendTransaction, useWriteContract, useSwitchChain } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import UsdcBalance from '../../components/UsdcBalance';
import WalletConnector from '../../components/WalletConnector';
import { 
  Wallet, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Plus,
  CreditCard,
  Droplets,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';



interface UnifiedKitChain {
  chain: string;
  confirmedBalance: string;
  pendingBalance?: string;
  hasPending: boolean;
}

interface UnifiedKitData {
  totalConfirmed: string;
  totalPending: string;
  chains: UnifiedKitChain[];
}

type PaymentState = 
  | 'IDLE' 
  | 'CONNECTING' 
  | 'CREATING_SESSION' 
  | 'CHECKOUT_READY' 
  | 'PENDING' 
  | 'SUCCESS' 
  | 'CANCELLED' 
  | 'FAILED' 
  | 'NOT_CONFIGURED';

type FundingMode = 'unified_kit' | 'fiat_onramp';

const PRESET_AMOUNTS = ['10', '25', '50', '100'];

export default function OnrampPage() {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();


  const [unifiedBalance, setUnifiedBalance] = useState<string | null>(null);
  const [unifiedKitData, setUnifiedKitData] = useState<UnifiedKitData | null>(null);
  const [balanceConfigured, setBalanceConfigured] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Funding Rails Mode
  const [fundingMode, setFundingMode] = useState<FundingMode>('unified_kit');
  const [sourceChain, setSourceChain] = useState<string>('Base');

  // Amount State
  const [selectedPreset, setSelectedPreset] = useState<string>('25');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');

  // Payment State Machine
  const [paymentState, setPaymentState] = useState<PaymentState>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Faucet secondary state (explicitly isolated for testnet developers)
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string>('');

  // Server Configuration Info
  const [configInfo, setConfigInfo] = useState<{
    fiatConfigured: boolean;
    appId: string | null;
  }>({
    fiatConfigured: false,
    appId: null,
  });

  const initialBalanceRef = useRef<number | null>(null);

  // Authoritative Balance Query from GET /api/unified-balance
  const fetchAuthoritativeBalance = useCallback(async () => {
    try {
      const activeAddr = address || '';
      let queryParam = '';
      if (isConnected && address) {
        queryParam = `address=${encodeURIComponent(address)}`;
      } else {
        setUnifiedBalance(null);
        setUnifiedKitData(null);
        return;
      }

      const res = await fetch(`/api/unified-balance?${queryParam}`);
      const data = await res.json();

      if (data?.configured === false) {
        setBalanceConfigured(false);
        setUnifiedBalance(null);
        setUnifiedKitData(null);
        return;
      }

      setBalanceConfigured(true);
      if (data?.available !== undefined && data?.available !== null) {
        const parsed = parseFloat(data.available);
        setUnifiedBalance(isNaN(parsed) ? '0.0000' : parsed.toFixed(4));
        if (initialBalanceRef.current === null && !isNaN(parsed)) {
          initialBalanceRef.current = parsed;
        }
      } else {
        setUnifiedBalance('0.0000');
      }

      if (data?.unifiedKit) {
        setUnifiedKitData(data.unifiedKit);
      } else {
        setUnifiedKitData(null);
      }
    } catch {
      setUnifiedBalance(null);
      setUnifiedKitData(null);
    }
  }, [isConnected, address]);

  const loadWalletAndBalance = useCallback(async () => {
    await fetchAuthoritativeBalance();
  }, [fetchAuthoritativeBalance]);

  // Check Onramp Server Config & Balances on Mount
  useEffect(() => {
    loadWalletAndBalance();

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/add-funds');
        const data = await res.json();
        const isFiatConfigured = Boolean(data?.fiatOnramp?.configured);
        setConfigInfo({
          fiatConfigured: isFiatConfigured,
          appId: data?.fiatOnramp?.appId || null,
        });
      } catch {
        setConfigInfo({
          fiatConfigured: false,
          appId: null,
        });
      }
    };

    fetchConfig();

    const handleWalletChanged = () => {
      loadWalletAndBalance();
    };

    window.addEventListener('storage', handleWalletChanged);

    return () => {
      window.removeEventListener('storage', handleWalletChanged);
    };
  }, [loadWalletAndBalance]);

  const activeAddress = address || '';
  const walletType = isConnected ? 'MetaMask' : 'None';
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const hasActiveWallet = Boolean(isConnected && address);

  // Display Unified Balance
  const unifiedBalanceDisplay = hasActiveWallet
    ? (unifiedBalance !== null ? `${unifiedBalance} USDC` : 'Loading...')
    : '$0.0000 USDC';

  // Manual Trigger Refresh Balance
  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      await loadWalletAndBalance();
      await loadWalletAndBalance();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Amount Handlers
  const effectiveAmount = customAmount.trim() !== '' ? customAmount.trim() : selectedPreset;

  const handleAmountChange = (val: string) => {
    setCustomAmount(val);
    setSelectedPreset('');
    setPaymentState('IDLE');
    setStatusMessage('');

    if (val === '') {
      setAmountError('');
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setAmountError('Please enter a valid amount greater than 0.');
    } else {
      setAmountError('');
    }
  };

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    setCustomAmount('');
    setAmountError('');
    setPaymentState('IDLE');
    setStatusMessage('');
  };

  // Arc Unified Balance Kit Deposit Flow
  const handleUnifiedKitDeposit = async () => {
    if (!hasActiveWallet) {
      setPaymentState('FAILED');
      setStatusMessage('Connect your wallet to continue.');
      return;
    }

    const num = parseFloat(effectiveAmount);
    if (isNaN(num) || num <= 0) {
      setAmountError('Please enter a valid amount greater than 0.');
      return;
    }

    setPaymentState('CREATING_SESSION');
    setStatusMessage(`Initiating Arc Unified Balance Kit allocation from ${sourceChain.replace('_', ' ')}...`);

    try {
      let usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Default
      let targetChainId = 8453; // Base Default

      switch (sourceChain) {
        case 'Base':
          usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
          targetChainId = 8453;
          break;
        case 'Ethereum':
          usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
          targetChainId = 1;
          break;
        case 'Polygon':
          usdcAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
          targetChainId = 137;
          break;
        case 'Arbitrum':
          usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
          targetChainId = 42161;
          break;
        case 'Avalanche':
          usdcAddress = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
          targetChainId = 43114;
          break;
      }

      // EXPLICIT CHAIN SWITCH: Ensure the user is on the right network first
      if (chain?.id !== targetChainId) {
        setStatusMessage(`Please approve the network switch to ${sourceChain.replace('_', ' ')} in your wallet...`);
        await switchChainAsync({ chainId: targetChainId });
      }

      setPaymentState('PENDING');
      setStatusMessage('Please confirm the USDC deposit transaction in your wallet...');

      const USDC_ABI = [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const;
      
      const txHash = await writeContractAsync({
        address: usdcAddress as `0x${string}`,
        abi: USDC_ABI,
        chainId: targetChainId,
        functionName: 'transfer',
        args: ['0xfd4960F33670f3477ebe817B184dd59fC4961437', parseUnits(effectiveAmount, 6)], // Treasury Address
      });

      setStatusMessage(`Transaction submitted! Hash: ${txHash.slice(0, 10)}... waiting for confirmation`);
      
      // Wait a moment for UX
      await new Promise(r => setTimeout(r, 2000));

      const res = await fetch('/api/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unified_kit_deposit',
          amount: effectiveAmount,
          walletAddress: activeAddress,
          walletType,
          sourceChain,
          txHash, // Pass real txHash to backend
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'SUCCESS') {
        setPaymentState('SUCCESS');
        setStatusMessage(`Successfully registered ${effectiveAmount} USDC deposit into Arc Unified Balance (Gateway Domain 26).`);
        await handleRefreshBalance();
      } else {
        setPaymentState('FAILED');
        setStatusMessage(data.error || 'Unified Balance deposit could not be completed.');
      }
    } catch {
      setPaymentState('FAILED');
      setStatusMessage('Deposit request failed. Please check network connection.');
    }
  };

  // Real Add Funds Flow: Create Official Circle Onramp Session
  const handleStartOnramp = async () => {
    if (!hasActiveWallet) {
      setPaymentState('FAILED');
      setStatusMessage('Connect your wallet to continue.');
      return;
    }

    if (!configInfo.fiatConfigured) {
      setPaymentState('NOT_CONFIGURED');
      setStatusMessage('Circle Card Onramp is not configured yet. Set CIRCLE_API_KEY and NEXT_PUBLIC_CIRCLE_APP_ID in .env.local.');
      return;
    }

    const num = parseFloat(effectiveAmount);
    if (isNaN(num) || num <= 0) {
      setAmountError('Please enter a valid amount greater than 0.');
      return;
    }

    setPaymentState('CREATING_SESSION');
    setStatusMessage('Creating official Circle Onramp checkout session...');

    try {
      const res = await fetch('/api/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_checkout_session',
          amount: effectiveAmount,
          walletAddress: activeAddress,
          walletType,
          network: 'base',
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'CHECKOUT_READY' && data.sessionUrl) {
        setPaymentState('CHECKOUT_READY');
        setCheckoutUrl(data.sessionUrl);
        setStatusMessage('Checkout session ready. Click below to open Circle hosted checkout.');
      } else {
        setPaymentState('FAILED');
        setStatusMessage(data.error || 'Funding could not be completed. Please try again.');
      }
    } catch {
      setPaymentState('FAILED');
      setStatusMessage('Funding could not be completed. Please try again.');
    }
  };

  // Secondary Isolated Developer Faucet
  const handleDevFaucetRequest = async () => {
    if (!hasActiveWallet) {
      setFaucetMessage('Connect your wallet first.');
      return;
    }

    setFaucetLoading(true);
    setFaucetMessage('Requesting testnet tokens from Circle Faucet...');

    try {
      const res = await fetch('/api/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'testnet_funding',
          walletAddress: activeAddress,
          walletType,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        setFaucetMessage('Testnet USDC requested successfully! Waiting for on-chain block...');
        await handleRefreshBalance();
      } else {
        setFaucetMessage(data.error || 'Faucet request failed.');
      }
    } catch {
      setFaucetMessage('Faucet request could not be completed.');
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-200">
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

          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              href="/dashboard" 
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Back to</span> Dashboard
            </Link>

            <Link
              href="/add-funds"
              className="relative inline-flex items-center justify-center px-3.5 py-1.5 font-black text-slate-900 bg-gradient-to-b from-cyan-400 to-cyan-500 rounded-xl shadow-[0_4px_0_rgb(8,145,178)] hover:from-cyan-300 hover:to-cyan-400 active:translate-y-[4px] active:shadow-[0_0_0_rgb(8,145,178)] transition-all text-[10px] sm:text-xs border border-cyan-200/50 h-[34px]"
            >
              <span className="text-slate-900 font-extrabold mr-1">+</span>
              Add Funds
            </Link>

            <a 
              href="https://faucet.circle.com" 
              target="_blank" 
              rel="noreferrer" 
              className="relative inline-flex items-center justify-center px-3.5 py-1.5 font-black text-white bg-gradient-to-b from-red-500 to-red-600 rounded-xl shadow-[0_4px_0_rgb(153,27,27)] hover:from-red-400 hover:to-red-500 transition-all text-[10px] sm:text-xs border border-red-400/50 hidden md:inline-flex"
            >
              FAUCET
            </a>

            <UsdcBalance />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-1.5">
            <ShieldCheck size={14} />
            Arc Unified Balance Kit / Circle Gateway
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Add Funds
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">
            Fund your Arc Unified Balance with USDC for sub-cent AI micropayments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Column: Balance Card & Destination Wallet */}
          <div className="space-y-6 md:col-span-1">
            {/* Unified Balance Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] pointer-events-none"></div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Unified Balance
                </span>
                <button
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                  title="Refresh Balance"
                >
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {unifiedBalanceDisplay}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Active Network</span>
                <span className="text-green-400 font-mono font-medium">Arc Mainnet</span>
              </div>

              {/* Circle Gateway Unified Balance Kit Breakdown */}
              {unifiedKitData && unifiedKitData.chains && unifiedKitData.chains.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1">
                      <Sparkles size={11} /> Arc Unified Kit
                    </span>
                    <span className="font-mono text-cyan-300 text-[10px] bg-cyan-950/70 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                      Gateway Domain 26
                    </span>
                  </div>
                  <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-slate-800/60">
                    {unifiedKitData.chains.map((c) => (
                      <div key={c.chain} className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400">{c.chain.replace('_', ' ')}</span>
                        <span className="text-slate-200 font-semibold">{parseFloat(c.confirmedBalance || '0').toFixed(2)} USDC</span>
                      </div>
                    ))}
                    {parseFloat(unifiedKitData.totalPending || '0') > 0 && (
                      <div className="flex justify-between items-center text-[10px] font-mono text-amber-400 pt-1 border-t border-slate-800/50">
                        <span>Pending Sync</span>
                        <span>+{parseFloat(unifiedKitData.totalPending).toFixed(2)} USDC</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Authentication Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Funding Destination
              </h3>
              <WalletConnector />
            </div>

          </div>

          {/* Right Column: Real Add Funds Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[60px] pointer-events-none"></div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <Layers size={18} className="text-cyan-400" />
                  Choose how you want to fund your balance
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Deposit USDC into your Arc Unified Balance using the official Circle Unified Balance Kit or Circle Card Onramp.
                </p>
              </div>

              {/* Unified Balance Kit Explainer Notice */}
              <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/40 rounded-xl mb-6 text-xs text-cyan-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <Info size={14} />
                  Official Circle Unified Balance Kit (Arc Domain 26)
                </div>
                <p className="text-[11px] text-cyan-300/80 leading-relaxed">
                  Powered by <code className="bg-black/50 px-1 py-0.5 rounded text-cyan-300 font-mono">@circle-fin/unified-balance-kit</code>. Allows aggregating USDC across source chains (Base, Ethereum) and routing unified liquidity directly into Arc Mainnet.
                </p>
              </div>

              {/* Source Chain Selector */}
              <div className="space-y-2 mb-6">
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-400">
                    Source Chain Liquidity
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSourceChain('Base')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Base'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">Base</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Circle Gateway Domain 6</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Ethereum')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Ethereum'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">Ethereum</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Circle Gateway Domain 0</div>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => setSourceChain('Polygon')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Polygon'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">Polygon</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Circle Gateway Domain 7</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Arbitrum')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Arbitrum'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">Arbitrum</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Circle Gateway Domain 3</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Avalanche')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Avalanche'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">Avalanche</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Circle Gateway Domain 1</div>
                    </button>
                  </div>
                </div>

              {/* Amount Selection */}
              <div className="space-y-4 mb-6">
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-400">
                  Select Amount (USDC)
                </label>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isSelected = selectedPreset === preset && customAmount === '';
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`py-3 px-2 rounded-xl text-sm font-black font-mono transition-all border ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                            : 'bg-black/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                        }`}
                      >
                        ${preset}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                    Or Enter Custom Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Custom amount (e.g. 15.50)"
                      value={customAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className={`w-full bg-black/70 border rounded-xl px-4 py-3 pl-8 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                        amountError
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 uppercase">
                      USDC
                    </span>
                  </div>
                  {amountError && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} />
                      {amountError}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary Breakdown */}
              <div className="bg-black/60 rounded-xl p-4 border border-slate-800/80 space-y-2 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Target Deposit</span>
                  <span className="font-mono font-bold text-white">${parseFloat(effectiveAmount || '0').toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Payment Rails</span>
                  <span className="text-slate-300 font-medium">
                    Circle Unified Balance Kit (Arc Gateway Domain 26)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Destination</span>
                  <span className="font-mono text-cyan-400 truncate max-w-[200px]" title={activeAddress || 'No wallet connected'}>
                    {activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'Wallet not connected'}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-xl border mb-6 text-xs flex items-start gap-2.5 font-sans ${
                    paymentState === 'SUCCESS'
                      ? 'bg-green-950/40 border-green-800/60 text-green-300'
                      : paymentState === 'CREATING_SESSION' || paymentState === 'PENDING'
                      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                      : paymentState === 'CHECKOUT_READY'
                      ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}
                >
                  {paymentState === 'SUCCESS' ? (
                    <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                  ) : paymentState === 'CREATING_SESSION' || paymentState === 'PENDING' ? (
                    <Loader2 size={16} className="text-cyan-400 animate-spin shrink-0 mt-0.5" />
                  ) : paymentState === 'CHECKOUT_READY' ? (
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>{statusMessage}</div>
                </div>
              )}

              {/* Primary Action Button */}
              <div>
                {!hasActiveWallet ? (
                  <button
                    disabled
                    className="w-full py-4 bg-slate-800 text-slate-500 font-bold rounded-xl text-sm border border-slate-700/60 flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <Wallet size={16} />
                    Connect your wallet to continue
                  </button>
                ) : (
                  <button
                    onClick={handleUnifiedKitDeposit}
                    disabled={paymentState === 'CREATING_SESSION' || Boolean(amountError)}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentState === 'CREATING_SESSION' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Allocating via Arc Unified Balance Kit...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Deposit ${parseFloat(effectiveAmount || '0').toFixed(2)} USDC to Arc Unified Balance
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
