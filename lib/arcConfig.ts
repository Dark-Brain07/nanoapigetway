export const ARC_MAINNET = {
  id: 5042,
  name: 'Arc Mainnet',
  network: 'arc-mainnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
    public: { http: ['https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.io',
    },
  },
  testnet: false,
};

export const ARC_USDC_CONTRACT = '0x3600000000000000000000000000000000000000';

