import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { ARC_TESTNET } from './arcConfig';
import { baseSepolia, sepolia } from 'viem/chains';

export const config = createConfig({
  chains: [ARC_TESTNET as any, baseSepolia, sepolia],
  connectors: [
    metaMask(),
    injected({ target: 'rabby' }),
    injected({ target: 'trust' }),
    injected(),
  ],
  transports: {
    [ARC_TESTNET.id]: http('https://rpc.testnet.arc.network'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
});
