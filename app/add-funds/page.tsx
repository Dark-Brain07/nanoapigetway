'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAccount, useSendTransaction, useWriteContract, useSwitchChain, usePublicClient } from 'wagmi';
import { parseEther, parseUnits, parseAbi, maxUint256, createPublicClient, http } from 'viem';
import UsdcBalance from '../../components/UsdcBalance';
import WalletConnector from '../../components/WalletConnector';
import MobileMenu from '../../components/MobileMenu';
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
import { getExplorerForTx } from '@/lib/chainExplorers';



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

const PRESET_AMOUNTS = ['0.005', '0.01', '0.10', '1'];

export default function OnrampPage() {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();


  const [unifiedBalance, setUnifiedBalance] = useState<string | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({});
  const [unifiedKitData, setUnifiedKitData] = useState<UnifiedKitData | null>(null);
  const [balanceConfigured, setBalanceConfigured] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Funding Rails Mode
  const [fundingMode, setFundingMode] = useState<FundingMode>('unified_kit');
  const [sourceChain, setSourceChain] = useState<string>('Arc');

  // Amount State
  const [selectedPreset, setSelectedPreset] = useState<string>('0.01');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');

  // Payment State Machine
  const [paymentState, setPaymentState] = useState<PaymentState>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [lastDepositTx, setLastDepositTx] = useState<{ hash: string; chain: string } | null>(null);

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

      if (data?.walletBalances) {
        const parsed: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.walletBalances as Record<string, any>)) {
          parsed[k] = v.usdcTokenBalance || '0.0000';
        }
        setWalletBalances(parsed);
      }

      if (data?.onChain?.usdcTokenBalance) {
        setOnChainBalance(data.onChain.usdcTokenBalance);
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
  const publicClient = usePublicClient();
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
      let usdcAddress = '0x3600000000000000000000000000000000000000'; // Arc Mainnet Default
      let targetChainId = 5042; // Arc Mainnet

      switch (sourceChain) {
        case 'Arc':
          usdcAddress = '0x3600000000000000000000000000000000000000';
          targetChainId = 5042;
          break;
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
      const amountUnits = parseUnits(effectiveAmount, 6);
      const gatewayWalletAddress = '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE';

      const TARGET_RPCS: Record<number, string> = {
        5042: 'https://rpc.mainnet.arc.io',
        8453: 'https://base-rpc.publicnode.com',
        137: 'https://polygon-bor-rpc.publicnode.com',
        1: 'https://ethereum-rpc.publicnode.com',
        42161: 'https://arbitrum-one-rpc.publicnode.com',
        43114: 'https://avalanche-c-chain-rpc.publicnode.com',
      };

      const targetRpc = TARGET_RPCS[targetChainId] || 'https://base-rpc.publicnode.com';
      const targetClient = createPublicClient({
        transport: http(targetRpc, { timeout: 6000 }),
      });

      // Step 1: Check existing USDC allowance for Circle Gateway Wallet on the TARGET chain
      let currentAllowance = 0n;
      try {
        currentAllowance = await targetClient.readContract({
          address: usdcAddress as `0x${string}`,
          abi: parseAbi(['function allowance(address, address) view returns (uint256)']),
          functionName: 'allowance',
          args: [activeAddress as `0x${string}`, gatewayWalletAddress],
        });
      } catch (e) {
        console.warn('Could not read allowance on target chain:', e);
      }

      if (currentAllowance < amountUnits) {
        setStatusMessage(`Step 1/2: Please approve Circle Gateway Wallet to spend USDC on ${sourceChain.replace('_', ' ')}...`);
        const approveTx = await writeContractAsync({
          address: usdcAddress as `0x${string}`,
          abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
          chainId: targetChainId,
          functionName: 'approve',
          args: [gatewayWalletAddress, maxUint256],
        });

        setStatusMessage(`Waiting for USDC approval confirmation on ${sourceChain.replace('_', ' ')}...`);
        try {
          await Promise.race([
            targetClient.waitForTransactionReceipt({ hash: approveTx, timeout: 5000 }),
            new Promise((r) => setTimeout(r, 2500)),
          ]);
        } catch {
          // Bounded wait
        }
      }

      // Step 2: Call official deposit() function on Circle Gateway Wallet contract
      setStatusMessage('Step 2/2: Confirming deposit into Circle Gateway Wallet contract in Rabby/wallet...');
      const txHash = await writeContractAsync({
        address: gatewayWalletAddress,
        abi: parseAbi(['function deposit(address token, uint256 amount) external']),
        chainId: targetChainId,
        functionName: 'deposit',
        args: [usdcAddress as `0x${string}`, amountUnits],
      });

      setStatusMessage(`Deposit submitted to Circle Gateway! Hash: ${txHash.slice(0, 10)}...`);
      
      try {
        await Promise.race([
          targetClient.waitForTransactionReceipt({ hash: txHash, timeout: 6000 }),
          new Promise((r) => setTimeout(r, 2000)),
        ]);
      } catch {
        // Bounded wait
      }

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
        setLastDepositTx({ hash: txHash, chain: sourceChain });
        setStatusMessage(`Successfully registered ${effectiveAmount} USDC deposit from ${sourceChain} into Circle Gateway Unified Balance.`);
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

            <UsdcBalance />
            <MobileMenu />
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
                      onClick={() => setSourceChain('Arc')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Arc'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          Arc Mainnet
                        </span>
                        {walletBalances['Arc'] && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            {parseFloat(walletBalances['Arc']).toFixed(4)} USDC
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">Circle Gateway Domain 26</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Base')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sourceChain === 'Base'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                          Base
                        </span>
                        {walletBalances['Base'] && (
                          <span className="text-[10px] text-blue-400 font-mono font-bold">
                            {parseFloat(walletBalances['Base']).toFixed(4)} USDC
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">Circle Gateway Domain 6</div>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                    <button
                      type="button"
                      onClick={() => setSourceChain('Ethereum')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        sourceChain === 'Ethereum'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Ethereum</span>
                        {walletBalances['Ethereum'] && parseFloat(walletBalances['Ethereum']) > 0 && (
                          <span className="text-[9.5px] text-cyan-400 font-mono font-bold">
                            {parseFloat(walletBalances['Ethereum']).toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Domain 0</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Polygon')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        sourceChain === 'Polygon'
                          ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Polygon</span>
                        {walletBalances['Polygon'] && (
                          <span className="text-[9.5px] text-purple-400 font-mono font-bold">
                            {parseFloat(walletBalances['Polygon']).toFixed(4)} USDC
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Domain 7</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Arbitrum')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        sourceChain === 'Arbitrum'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Arbitrum</span>
                        {walletBalances['Arbitrum'] && parseFloat(walletBalances['Arbitrum']) > 0 && (
                          <span className="text-[9.5px] text-blue-400 font-mono font-bold">
                            {parseFloat(walletBalances['Arbitrum']).toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Domain 3</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceChain('Avalanche')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        sourceChain === 'Avalanche'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Avalanche</span>
                        {walletBalances['Avalanche'] && parseFloat(walletBalances['Avalanche']) > 0 && (
                          <span className="text-[9.5px] text-red-400 font-mono font-bold">
                            {parseFloat(walletBalances['Avalanche']).toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Domain 1</div>
                    </button>
                  </div>
                </div>

                {/* Explanation Banner */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5 mb-6">
                  <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">How Circle Gateway Unified Balance Works:</span>
                    <p className="mt-0.5 text-slate-400 text-[11px]">
                      USDC in your personal Base or Arc wallet is held directly by your address. To become part of your <span className="text-cyan-300 font-semibold">Circle Gateway Unified Balance</span>, you must deposit it into the official Circle Gateway contract (<span className="text-cyan-400 font-mono">0x7777...00eE</span>). Once deposited, it is unified across chains for instant, zero-gas nanopayments.
                    </p>
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500">
                      Or Enter Custom Amount
                    </label>
                    {(() => {
                      const activeChainBal = walletBalances[sourceChain] ?? (sourceChain === 'Arc' ? onChainBalance : '0');
                      if (!activeChainBal || parseFloat(activeChainBal) <= 0) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const maxVal = parseFloat(activeChainBal);
                            const safeVal = Math.max(0, maxVal > 0.002 && sourceChain === 'Arc' ? maxVal - 0.002 : maxVal).toFixed(4);
                            handleAmountChange(safeVal);
                          }}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline decoration-dotted"
                        >
                          {sourceChain} Wallet: {parseFloat(activeChainBal).toFixed(4)} USDC (Max)
                        </button>
                      );
                    })()}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      placeholder="Custom amount (e.g. 0.005)"
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
                  <span className="font-mono font-bold text-white">${effectiveAmount || '0.00'} USDC</span>
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
                  <div className="flex-1">
                    <div>{statusMessage}</div>
                    {lastDepositTx && paymentState === 'SUCCESS' && (
                      <div className="mt-2 pt-2 border-t border-green-800/40">
                        {(() => {
                          const exp = getExplorerForTx(lastDepositTx.hash, null, lastDepositTx.chain);
                          return (
                            <a
                              href={exp.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] underline text-cyan-300 hover:text-cyan-100 transition-colors"
                            >
                              <span>View on {exp.name}: {lastDepositTx.hash.slice(0, 10)}...{lastDepositTx.hash.slice(-8)}</span>
                              <ExternalLink size={12} />
                            </a>
                          );
                        })()}
                      </div>
                    )}
                  </div>
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
                        Deposit ${effectiveAmount || '0.00'} USDC to Arc Unified Balance
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
