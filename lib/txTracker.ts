// In-memory store for transactions
export interface Transaction {
  txHash: string;
  amount: string;
  endpoint: string;
  timestamp: string;
  walletAddress: string;
  status: string;
}

declare global {
  var txHost: Transaction[];
}

if (!global.txHost) {
  global.txHost = [];
}

export const getTransactions = () => {
  return global.txHost;
};

export const addTransaction = (tx: Transaction) => {
  global.txHost.unshift(tx);
  if (global.txHost.length > 200) {
    global.txHost.pop();
  }
  return tx;
};
