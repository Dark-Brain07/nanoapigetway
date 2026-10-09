'use client';
import { useState, useEffect } from 'react';
import { useAccount, useSignTypedData, useSwitchChain, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, parseAbi, maxUint256 } from 'viem';
import {
  CloudSun,
  Newspaper,
  Activity,
  Sparkles,
  Globe,
  CheckCircle2,
  ArrowRight,
  Shield,
  Coins,
  ShieldCheck,
  Zap,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { ARC_CHAIN_ID, CIRCLE_GATEWAY_WALLET, CIRCLE_BATCHING_NAME, CIRCLE_BATCHING_VERSION, ARC_USDC_CONTRACT } from '@/lib/arcConfig';
import { getExplorerForTx } from '@/lib/chainExplorers';

function ResultVisualizer({ endpoint, data }: { endpoint: string; data: any }) {
  if (data.error) {
    return (
      <div className="bg-red-500/10 border-l-2 border-red-500 p-3 text-red-400 text-sm">
        {data.error}
      </div>
    );
  }

  switch (endpoint) {
    case '/api/weather':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 rounded-full text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20">
                <CloudSun size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  {data.name || 'Unknown Location'}
                  {data.country && <span className="text-xs text-slate-400 font-normal">({data.country})</span>}
                </h4>
                <p className="text-slate-400 capitalize text-sm mt-0.5">{data.weather?.[0]?.description || 'Live Station Data'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-light text-white tracking-tight">
                {data.main?.temp !== undefined ? Number(data.main.temp).toFixed(1) : '--'}°C
              </div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mt-1 flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Real-Time Data</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 text-[10px] uppercase block">Feels Like</span>
              <span className="text-slate-200 font-bold">{data.main?.feels_like !== undefined ? Number(data.main.feels_like).toFixed(1) + '°C' : '--'}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 text-[10px] uppercase block">Humidity</span>
              <span className="text-slate-200 font-bold">{data.main?.humidity !== undefined ? data.main.humidity + '%' : '--'}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 text-[10px] uppercase block">Wind Speed</span>
              <span className="text-slate-200 font-bold">{data.wind?.speed !== undefined ? data.wind.speed + ' m/s' : '--'}</span>
            </div>
          </div>
        </div>
      );
    case '/api/news':
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm tracking-wide uppercase">
              <Newspaper size={16} /> Top Headlines
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE WIRE
            </span>
          </div>
          {data.articles?.slice(0, 3).map((a: any, i: number) => (
            <div key={i} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
              <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-relaxed">{a.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                <span className="text-xs text-indigo-300/80 font-medium">{a.source?.name || 'News Wire'}</span>
              </div>
            </div>
          ))}
        </div>
      );
    case '/api/crypto':
    case '/api/crypto-price':
      const tokens = Object.keys(data).filter((k) => !k.startsWith('_'));
      return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm tracking-wide uppercase">
              <Activity size={16} /> Live Markets
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> REAL-TIME FEED
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            {tokens.map((t, i) => {
              const item = data[t];
              const price = item?.usd !== undefined ? `$${item.usd.toLocaleString()}` : item?.price || '$0.00';
              const change = item?.usd_24h_change;
              const isPositive = change !== undefined && change >= 0;
              return (
                <div key={i} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/50 to-teal-400/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 capitalize font-medium">{t.replace('-', ' ')}</span>
                    {change !== undefined && (
                      <span className={`text-[10px] font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '▲ +' : '▼ '}{Number(change).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-emerald-400 tracking-tight">
                    {price}
                  </span>
                </div>
              );
            })}
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
                &ldquo;{data.summary || 'Summary generated via Arc payment.'}&rdquo;
              </p>
            </div>
          </div>
        </div>
      );
    case '/api/translate':
      return (
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-3 font-semibold text-sm tracking-wide uppercase">
            <Globe size={16} /> Translation Result ({data.targetLanguage})
          </div>
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-400 text-xs mb-1">Original: &ldquo;{data.originalText}&rdquo;</p>
            <p className="text-slate-100 text-base font-semibold">&ldquo;{data.translation}&rdquo;</p>
          </div>
        </div>
      );
    case '/api/token-info':
      return (
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-3 font-semibold text-sm tracking-wide uppercase">
            <ShieldCheck size={16} /> On-Chain Token Verified ({data.network})
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-xs">Name / Symbol</div>
              <div className="text-slate-100 font-bold">{data.name} ({data.symbol})</div>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-xs">Decimals</div>
              <div className="text-slate-100 font-bold">{data.decimals}</div>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 col-span-2 truncate">
              <div className="text-slate-400 text-xs">Address</div>
              <div className="text-cyan-400 text-xs font-mono">{data.address}</div>
            </div>
          </div>
        </div>
      );
    default:
      return (
        <pre className="text-xs text-slate-300 bg-slate-900 p-4 rounded-xl overflow-x-auto max-h-[200px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

interface ApiCardProps {
  title: string;
  description: string;
  price: string;
  endpoint: string;
  defaultParam?: string;
  paramName?: string;
  dropdownOptions?: string[];
  dropdownParamName?: string;
}

export default function ApiCard({
  title,
  description,
  price,
  endpoint,
  defaultParam = '',
  paramName = '',
  dropdownOptions,
  dropdownParamName = '',
}: ApiCardProps) {
  const [param, setParam] = useState(defaultParam);
  const [dropdownParam, setDropdownParam] = useState(dropdownOptions ? dropdownOptions[0] : '');
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  const publicClient = usePublicClient();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const [quickDepositing, setQuickDepositing] = useState(false);
  const [existingTxHash, setExistingTxHash] = useState<string | null>(null);

  // Check if user already has a settled transaction for this endpoint
  useEffect(() => {
    if (!address) {
      setExistingTxHash(null);
      return;
    }
    fetch(`/api/transactions?payer=${address}&endpoint=${encodeURIComponent(endpoint)}&status=settled&limit=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.transactions && data.transactions.length > 0) {
          const latest = data.transactions[0];
          if (latest.transactionHash?.startsWith('0x') || latest.settlementId?.startsWith('0x')) {
            setExistingTxHash(latest.transactionHash || latest.settlementId);
          }
        }
      })
      .catch(() => null);
  }, [address, endpoint]);

  const handleFetchExistingResult = async (txHashToUse?: string) => {
    const hash = txHashToUse || existingTxHash;
    if (!hash || !address) return;

    setLoading(true);
    setStatusStep('Retrieving settled API result from gateway...');
    try {
      const params = new URLSearchParams();
      if (paramName && param) params.append(paramName, param);
      if (dropdownParamName && dropdownParam) params.append(dropdownParamName, dropdownParam);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const targetUrl = `${endpoint}${queryStr}`;

      const res = await fetch(targetUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'payment-signature': JSON.stringify({
            x402Version: 2,
            scheme: 'direct-arc',
            txHash: hash,
            payer: address,
          }),
        },
      });

      const data = await res.json();
      if (res.ok) {
        setResult({
          ...data,
          _paymentInfo: {
            settlementId: hash,
            transactionHash: hash,
            amount: price,
            payer: address,
            network: 'Arc Mainnet (eip155:5042)',
            method: 'Arc Mainnet Direct Transfer (Settled)',
            scheme: 'direct-arc',
          },
        });
      } else {
        setResult({ error: data.error || 'Failed to retrieve result' });
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Network error' });
    } finally {
      setLoading(false);
      setStatusStep('');
    }
  };

  const handleQuickDeposit = async () => {
    if (!address) return;
    setQuickDepositing(true);
    setStatusStep('Initiating deposit to Circle Gateway...');
    try {
      if (chain?.id !== ARC_CHAIN_ID && switchChainAsync) {
        await switchChainAsync({ chainId: ARC_CHAIN_ID });
      }

      const depositAmount = '0.003';
      const amountUnits = parseUnits(depositAmount, 6);

      // Step 1: Check existing USDC allowance for Circle Gateway Wallet
      let currentAllowance = 0n;
      if (publicClient) {
        try {
          currentAllowance = await publicClient.readContract({
            address: ARC_USDC_CONTRACT as `0x${string}`,
            abi: parseAbi(['function allowance(address, address) view returns (uint256)']),
            functionName: 'allowance',
            args: [address, CIRCLE_GATEWAY_WALLET as `0x${string}`],
          });
        } catch (e) {
          console.warn('Could not read allowance:', e);
        }
      }

      if (currentAllowance < amountUnits) {
        setStatusStep('Step 1/2: Please approve Circle Gateway Wallet to spend USDC...');
        const approveTx = await writeContractAsync({
          address: ARC_USDC_CONTRACT as `0x${string}`,
          abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
          chainId: ARC_CHAIN_ID,
          functionName: 'approve',
          args: [CIRCLE_GATEWAY_WALLET as `0x${string}`, maxUint256],
        });

        setStatusStep('Waiting for USDC approval confirmation on Arc...');
        try {
          if (publicClient) {
            await Promise.race([
              publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 5000 }),
              new Promise((r) => setTimeout(r, 2000)),
            ]);
          } else {
            await new Promise((r) => setTimeout(r, 2000));
          }
        } catch {
          // Bounded wait
        }
      }

      // Step 2: Call official deposit() function on Circle Gateway Wallet contract
      setStatusStep('Step 2/2: Confirming deposit into Circle Gateway Wallet contract...');
      const txHash = await writeContractAsync({
        address: CIRCLE_GATEWAY_WALLET as `0x${string}`,
        abi: parseAbi(['function deposit(address token, uint256 amount) external']),
        chainId: ARC_CHAIN_ID,
        functionName: 'deposit',
        args: [ARC_USDC_CONTRACT as `0x${string}`, amountUnits],
      });

      setStatusStep('Deposit confirmed on Arc! Registering with Circle Gateway...');
      await fetch('/api/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unified_kit_deposit',
          amount: depositAmount,
          walletAddress: address,
          walletType: 'MetaMask',
          sourceChain: 'Arc',
          txHash,
        }),
      });

      setResult({
        error: `Deposit of ${depositAmount} USDC successfully executed on Circle Gateway Wallet! Once indexed, click "Call API" to run your first nanopayment.`,
      });
    } catch (err: any) {
      console.error('Quick deposit failed:', err);
      setResult({
        error: `Deposit failed: ${err.shortMessage || err.message || 'Transaction rejected in wallet'}`,
      });
    } finally {
      setQuickDepositing(false);
      setStatusStep('');
    }
  };

  const handleCall = async () => {
    if (!address) {
      setResult({ error: 'Please connect your Web3 wallet first to authorize Circle Gateway Nanopayments.' });
      return;
    }

    setLoading(true);
    setResult(null);
    setStatusStep('Requesting x402 challenge...');

    try {
      // Build query params
      const params = new URLSearchParams();
      if (paramName && param) params.append(paramName, param);
      if (dropdownParamName && dropdownParam) params.append(dropdownParamName, dropdownParam);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const targetUrl = `${endpoint}${queryStr}`;

      // Step 1: Initial call to endpoint -> Expect HTTP 402 with x402 V2 requirements
      const initialRes = await fetch(targetUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (initialRes.status === 200) {
        // If not protected
        const data = await initialRes.json();
        setResult(data);
        setLoading(false);
        return;
      }

      if (initialRes.status !== 402) {
        const errorText = await initialRes.text();
        setResult({ error: `Server error (${initialRes.status}): ${errorText}` });
        setLoading(false);
        return;
      }

      // Step 2: Parse x402 V2 challenge
      const challenge = await initialRes.json();
      const directAccept = challenge.accepts?.find((a: any) => a.scheme === 'direct-arc');

      // Check user balances (Arc On-Chain USDC & Circle Gateway Unified Balance)
      setStatusStep('Checking wallet and Gateway balances...');
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

      const accept = directAccept || gatewayAccept || challenge.accepts?.[0];

      if (!accept) {
        setResult({ error: 'Malformed 402 challenge: No payment requirements specified.' });
        setLoading(false);
        return;
      }

      const payTo = accept.payTo;
      const atomicAmount = accept.amount;
      const requiredAmountUnits = BigInt(atomicAmount);
      const requiredUsdc = Number(atomicAmount) / 1_000_000;
      const verifyingContract = gatewayAccept?.extra?.verifyingContract || CIRCLE_GATEWAY_WALLET;
      const domainName = gatewayAccept?.extra?.name || CIRCLE_BATCHING_NAME;
      const domainVersion = gatewayAccept?.extra?.version || CIRCLE_BATCHING_VERSION;

      // Pre-check for self-transfer (buyer == seller)
      if (address && payTo && address.toLowerCase() === payTo.toLowerCase()) {
        setResult({
          error: `Self-transfer detected: Connected wallet (${address.slice(0, 6)}...${address.slice(-4)}) is the seller revenue address configured in .env.local. Please switch to another wallet account in MetaMask to test paying for APIs!`,
        });
        setLoading(false);
        return;
      }

      const useGateway = availableGw >= requiredUsdc && onChainUsdc < requiredUsdc;
      const targetChainId = useGateway && gatewayAccept?.network
        ? parseInt(gatewayAccept.network.replace('eip155:', ''))
        : ARC_CHAIN_ID;

      // Ensure chain switch to appropriate network
      if (chain?.id !== targetChainId && switchChainAsync) {
        try {
          setStatusStep(`Switching network to ${useGateway ? 'Chain ' + targetChainId : 'Arc Mainnet'}...`);
          await switchChainAsync({ chainId: targetChainId });
        } catch (switchErr) {
          console.warn('Switch chain warning:', switchErr);
        }
      }

      let paidRes: Response;
      let usedMethod = '';
      let usedScheme: 'direct-arc' | 'exact' = 'exact';
      let activeTxHash: string | null = null;
      let activeSettlementId: string | null = null;

      if (onChainUsdc >= requiredUsdc) {
        // =========================================================
        // RAIL 1: DIRECT ARC WALLET PAYMENT (Zero Deposit Friction)
        // =========================================================
        usedMethod = 'Arc Mainnet Direct Transfer';
        usedScheme = 'direct-arc';
        setStatusStep(`Confirming direct payment of ${price} USDC on Arc Mainnet in wallet...`);

        const txHash = await writeContractAsync({
          address: ARC_USDC_CONTRACT as `0x${string}`,
          abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
          chainId: ARC_CHAIN_ID,
          functionName: 'transfer',
          args: [payTo as `0x${string}`, requiredAmountUnits],
        });

        activeTxHash = txHash;
        activeSettlementId = txHash;

        setStatusStep('Confirming Arc on-chain settlement (< 0.5s)...');
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
          // Bounded wait: Arc block time is < 0.5s, proceed directly to server verification
        }

        setStatusStep('Verifying on-chain payment with x402 gateway...');
        const paymentPayload = {
          x402Version: 2,
          scheme: 'direct-arc',
          txHash,
          payer: address,
          amount: atomicAmount,
        };

        paidRes = await fetch(targetUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'payment-signature': JSON.stringify(paymentPayload),
          },
        });
      } else if (availableGw >= requiredUsdc) {
        // =========================================================
        // RAIL 2: CIRCLE GATEWAY UNIFIED BALANCE (Gasless Nanopayment)
        // =========================================================
        usedMethod = 'Circle Gateway Nanopayment';
        usedScheme = 'exact';
        setStatusStep('Signing Circle Gateway voucher (Gasless)...');

        const nonceBytes = new Uint8Array(32);
        crypto.getRandomValues(nonceBytes);
        const nonce = `0x${Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

        const now = Math.floor(Date.now() / 1000);
        const validAfter = 0n;
        const validBefore = BigInt(now + (gatewayAccept?.maxTimeoutSeconds || 2592000));

        const domain = {
          name: domainName,
          version: domainVersion,
          chainId: targetChainId,
          verifyingContract: verifyingContract as `0x${string}`,
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

        setStatusStep('Submitting payment to Circle Gateway Facilitator...');
        const paymentPayload = {
          x402Version: 2,
          scheme: 'exact',
          network: gatewayAccept?.network,
          asset: gatewayAccept?.asset,
          resource: {
            url: targetUrl,
            description: description,
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

        paidRes = await fetch(targetUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'payment-signature': JSON.stringify(paymentPayload),
          },
        });
      } else {
        // Neither rail has sufficient funds
        setResult({
          error: `Insufficient balance: Your Arc wallet has ${onChainUsdc.toFixed(4)} USDC, and your Circle Unified Balance is $${availableGw.toFixed(4)}. Please add USDC to your Arc wallet or deposit into Circle Gateway.`,
          insufficientFunds: true,
          onChainUsdc,
          availableGw,
        });
        setLoading(false);
        return;
      }

      const data = await paidRes.json();

      if (!paidRes.ok) {
        let displayError = data.error || `Payment rejection (${paidRes.status})`;
        if (displayError.includes('insufficient_balance')) {
          displayError = `Insufficient Circle Gateway Unified Balance: Your on-chain wallet balance has not been deposited into Circle Gateway yet. Go to 'Deposit Gateway' in the navbar to deposit USDC into Circle Gateway (0x7777...00eE) for instant nanopayments.`;
        }
        setResult({
          error: displayError,
          details: data.details,
        });
        setLoading(false);
        return;
      }

      // Step 5: Log to persistent database
      const settlementId = data._payment?.settlementId || activeSettlementId || paidRes.headers.get('X-Payment-Settlement');
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          endpoint,
          amount: price,
          atomicAmount,
          settlementId,
          txHash: activeTxHash || settlementId,
          scheme: usedScheme,
          status: 'settled',
        }),
      }).catch((e) => console.warn('Failed to record transaction history:', e));

      setResult({
        ...data,
        _paymentInfo: {
          settlementId,
          transactionHash: activeTxHash,
          amount: price,
          payer: address,
          network: 'Arc Mainnet (eip155:5042)',
          method: usedMethod,
          scheme: usedScheme,
        },
      });
    } catch (err: any) {
      console.error('Call failed:', err);
      setResult({
        error: err.shortMessage || err.message || 'Payment or request failed',
      });
    } finally {
      setLoading(false);
      setStatusStep('');
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-slate-700/50 hover:border-cyan-500/40 transition-all duration-300 group shadow-2xl flex flex-col">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors tracking-tight">
          {title}
        </h3>
        <span className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 text-green-300 text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)] font-medium whitespace-nowrap ml-2">
          {price} USDC/call
        </span>
      </div>

      <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-grow">{description}</p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-2 flex-shrink-0">
        <input
          type="text"
          value={param}
          onChange={(e) => setParam(e.target.value)}
          placeholder={`Enter ${paramName || 'input'}...`}
          className="flex-[2] min-w-0 bg-slate-950/50 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
        />
        {dropdownOptions && (
          <select
            value={dropdownParam}
            onChange={(e) => setDropdownParam(e.target.value)}
            className="flex-[1] min-w-[100px] bg-slate-950/50 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
          >
            {dropdownOptions.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleCall}
          disabled={loading}
          className="bg-gradient-to-b from-cyan-400 via-blue-600 to-blue-800 border-blue-700 shadow-lg hover:brightness-110 active:brightness-90 text-white px-5 sm:px-7 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px]"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Activity className="animate-spin" size={16} /> Paying
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-cyan-300" /> Call API
            </div>
          )}
        </button>
        {existingTxHash && !result && (
          <button
            type="button"
            onClick={() => handleFetchExistingResult(existingTxHash)}
            disabled={loading}
            className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/60 text-cyan-300 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            title="Load live result from your already-confirmed transaction"
          >
            <CheckCircle2 size={14} className="text-cyan-400" /> View Result ({existingTxHash.slice(0, 6)}...{existingTxHash.slice(-4)})
          </button>
        )}
      </div>

      {loading && statusStep && (
        <div className="mt-3 text-xs text-cyan-400/90 flex items-center gap-2 animate-pulse">
          <Activity size={12} className="animate-spin" /> {statusStep}
        </div>
      )}

      {result && (
        <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
          {result.error ? (
            result.error.toLowerCase().includes('insufficient') || result.error.includes('Unified Balance') ? (
              <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 text-slate-200 text-sm">
                <div className="flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
                  <div className="space-y-2 flex-grow">
                    <div className="font-bold text-amber-300">
                      Payment Required: Insufficient Funds
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {result.error}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleQuickDeposit}
                        disabled={quickDepositing}
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-md cursor-pointer"
                      >
                        {quickDepositing ? (
                          <>
                            <Activity size={13} className="animate-spin" /> Depositing 0.005 USDC...
                          </>
                        ) : (
                          <>
                            <PlusCircle size={13} /> Quick Deposit 0.005 USDC
                          </>
                        )}
                      </button>
                      <Link
                        href="/add-funds"
                        className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
                      >
                        Deposit Options →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm flex items-start gap-2">
                <Shield size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Call Failed</div>
                  <div className="text-xs text-red-300/80 mt-0.5">{result.error}</div>
                </div>
              </div>
            )
          ) : (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
              <div className="p-5">
                <ResultVisualizer endpoint={endpoint} data={result} />
              </div>

              {result._paymentInfo && (
                result._paymentInfo.scheme === 'direct-arc' ? (
                  <div className="bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border-t border-cyan-800/40 px-3 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold tracking-wide uppercase">
                      <CheckCircle2 size={16} /> Paid via Arc Mainnet Direct Transfer
                    </div>
                    {(() => {
                      const exp = getExplorerForTx(
                        result._paymentInfo.transactionHash || '',
                        result._paymentInfo.network || 'eip155:5042',
                        'Arc'
                      );
                      return (
                        <a
                          href={exp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-300 hover:text-cyan-100 bg-cyan-950/60 hover:bg-cyan-900/60 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-mono border border-cyan-700/50 transition-colors"
                          title={`View on ${exp.name}`}
                        >
                          {exp.badgeLabel} {result._paymentInfo.transactionHash?.slice(0, 10)}...{result._paymentInfo.transactionHash?.slice(-6)} ↗
                        </a>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-emerald-950/60 to-teal-900/40 border-t border-emerald-900/40 px-3 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
                      <CheckCircle2 size={16} /> Paid via Circle Gateway Nanopayments
                    </div>
                    <span className="text-emerald-300 bg-emerald-950/50 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-mono border border-emerald-800/50">
                      [GATEWAY BATCHED] {result._paymentInfo.settlementId?.slice(0, 16)}...
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
