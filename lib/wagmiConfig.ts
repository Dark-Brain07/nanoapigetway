import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { ARC_MAINNET } from './arcConfig';
import { base, mainnet, polygon, arbitrum, avalanche } from 'viem/chains';

export const config = createConfig({
  chains: [ARC_MAINNET as any, base, mainnet, polygon, arbitrum, avalanche],
  connectors: [
    metaMask(),
    injected({ target: 'rabby' }),
    injected({ target: 'trust' }),
    injected(),
  ],
  transports: {
    [ARC_MAINNET.id]: http('https://rpc.mainnet.arc.io'),
    [base.id]: http('https://base-rpc.publicnode.com'),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
    [polygon.id]: http('https://polygon-bor-rpc.publicnode.com'),
    [arbitrum.id]: http('https://arbitrum-one-rpc.publicnode.com'),
    [avalanche.id]: http('https://avalanche-c-chain-rpc.publicnode.com'),
  },
});
