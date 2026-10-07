import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { ARC_MAINNET } from './arcConfig';
import { base, mainnet } from 'viem/chains';

export const config = createConfig({
  chains: [ARC_MAINNET as any, base, mainnet],
  connectors: [
    metaMask(),
    injected({ target: 'rabby' }),
    injected({ target: 'trust' }),
    injected(),
  ],
  transports: {
    [ARC_MAINNET.id]: http('https://rpc.mainnet.arc.io'),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});
