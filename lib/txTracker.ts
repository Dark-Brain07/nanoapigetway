import { createPaymentRecord, getPaymentRecords, PaymentRecord } from './db';

export interface Transaction {
  id?: string;
  txHash: string;
  amount: string;
  endpoint: string;
  timestamp: string;
  walletAddress: string;
  status: string;
  settlementId?: string | null;
  network?: string;
}

/**
 * Returns persistent transactions from the database.
 */
export const getTransactions = async (): Promise<Transaction[]> => {
  const records = await getPaymentRecords({ limit: 100 });
  return records.map((r) => ({
    id: r.id,
    txHash: r.transactionHash || r.settlementId || r.paymentId,
    amount: r.amountUsd || r.amount,
    endpoint: r.endpoint,
    timestamp: r.createdAt,
    walletAddress: r.payer,
    status: r.status,
    settlementId: r.settlementId,
    network: r.network,
  }));
};

/**
 * Persists a transaction to the database.
 */
export const addTransaction = async (tx: Transaction): Promise<Transaction> => {
  const paymentId = tx.txHash || `tx_${Date.now()}_${crypto.randomUUID()}`;
  await createPaymentRecord({
    requestId: `req_${Date.now()}`,
    paymentId,
    payer: tx.walletAddress,
    seller: process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000',
    endpoint: tx.endpoint,
    amount: tx.amount,
    amountUsd: tx.amount.startsWith('$') ? tx.amount : `$${tx.amount}`,
    asset: '0x3600000000000000000000000000000000000000',
    network: tx.network || 'eip155:5042',
    scheme: 'exact',
    status: (tx.status as any) || 'settled',
    settlementId: tx.settlementId || (tx.txHash.startsWith('0x') ? null : tx.txHash),
    transactionHash: tx.txHash.startsWith('0x') ? tx.txHash : null,
  });

  return tx;
};
