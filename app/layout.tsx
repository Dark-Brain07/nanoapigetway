'use client';
import "./globals.css";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/wagmiConfig';
import { useState } from 'react';

 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());
  
  return (
    <html lang="en">
      <head>
        <title>NanoAPI Gateway — Sub-Cent AI API Payments on Arc</title>
        <meta name="description" content="Pay sub-cent micropayments for AI APIs using USDC on Arc blockchain via the x402 protocol. Weather, News, Crypto, Translation & AI Summary endpoints." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta property="og:title" content="NanoAPI Gateway — Sub-Cent AI API Payments" />
        <meta property="og:description" content="True pay-per-use AI APIs starting at $0.001 USDC per call, powered by x402 protocol on Arc Testnet." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body className={`bg-black text-slate-200 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-100 font-sans overflow-x-hidden`}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
