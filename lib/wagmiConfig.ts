import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { ARC_TESTNET } from './arcConfig';

export const config = createConfig({
  chains: [ARC_TESTNET as any],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [ARC_TESTNET.id]: http('https://rpc.testnet.arc.network'),
  },
});
