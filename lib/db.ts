import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PaymentStatus = 'pending' | 'verified' | 'settled' | 'failed' | 'expired' | 'rejected';

export interface PaymentRecord {
  id: string;
  requestId: string;
  paymentId: string;
  nonce?: string;
  payer: string;
  seller: string;
  endpoint: string;
  amount: string; // Atomic units (e.g., '1000' for $0.001)
  amountUsd?: string; // Formatted USD (e.g., '$0.001')
  asset: string;
  network: string;
  scheme: string;
  status: PaymentStatus;
  settlementId?: string | null;
  transactionHash?: string | null;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

interface DatabaseSchema {
  transactions: PaymentRecord[];
  processedNonces: Record<string, { paymentId: string; timestamp: string }>;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'gateway_db.json');

// In-memory cache for fast sync reads, backed by persistent disk storage
let memoryStore: DatabaseSchema | null = null;
let writeLock: Promise<void> = Promise.resolve();

function ensureDbFile(): DatabaseSchema {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      memoryStore = JSON.parse(content) as DatabaseSchema;
      if (!memoryStore.transactions) memoryStore.transactions = [];
      if (!memoryStore.processedNonces) memoryStore.processedNonces = {};
      return memoryStore;
    }
  } catch (err) {
    console.warn('[Database] Initial read error, initializing empty store:', err);
  }

  memoryStore = {
    transactions: [],
    processedNonces: {},
  };
  persistToDiskSync(memoryStore);
  return memoryStore;
}

function persistToDiskSync(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Failed to persist DB to disk:', err);
  }
}

async function withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const currentLock = writeLock;
  let release: () => void;
  writeLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await currentLock;
  try {
    return await fn();
  } finally {
    release!();
  }
}

/**
 * Checks if a payment with the given nonce or paymentId has already been settled.
 * Returns true if already processed (replay detected).
 */
export async function isPaymentReplayed(nonceOrPaymentId: string): Promise<boolean> {
  const db = ensureDbFile();
  if (db.processedNonces[nonceOrPaymentId]) {
    return true;
  }
  const existing = db.transactions.find(
    (t) => t.paymentId === nonceOrPaymentId || (t.nonce && t.nonce === nonceOrPaymentId)
  );
  return existing ? existing.status === 'settled' : false;
}

/**
 * Inserts or initializes a payment record.
 * Throws an error if idempotency constraint is violated (concurrent duplicates).
 */
export async function createPaymentRecord(
  record: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: PaymentStatus;
  }
): Promise<PaymentRecord> {
  return withWriteLock(() => {
    const db = ensureDbFile();

    // Check idempotency
    const existing = db.transactions.find(
      (t) => t.paymentId === record.paymentId || (record.nonce && t.nonce === record.nonce)
    );

    if (existing) {
      if (existing.status === 'settled') {
        throw new Error(`Payment already settled (idempotency key: ${record.paymentId})`);
      }
      return existing;
    }

    const newRecord: PaymentRecord = {
      ...record,
      id: crypto.randomUUID(),
      status: record.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.transactions.unshift(newRecord);
    if (newRecord.nonce) {
      db.processedNonces[newRecord.nonce] = {
        paymentId: newRecord.paymentId,
        timestamp: newRecord.createdAt,
      };
    }

    persistToDiskSync(db);
    return newRecord;
  });
}

/**
 * Updates an existing payment record (e.g. marked settled, verified, or failed).
 */
export async function updatePaymentRecord(
  idOrPaymentId: string,
  updates: Partial<Omit<PaymentRecord, 'id' | 'createdAt'>>
): Promise<PaymentRecord | null> {
  return withWriteLock(() => {
    const db = ensureDbFile();
    const record = db.transactions.find(
      (t) => t.id === idOrPaymentId || t.paymentId === idOrPaymentId
    );

    if (!record) {
      return null;
    }

    Object.assign(record, updates, { updatedAt: new Date().toISOString() });

    if (updates.status === 'settled' && record.nonce) {
      db.processedNonces[record.nonce] = {
        paymentId: record.paymentId,
        timestamp: record.updatedAt,
      };
    }

    persistToDiskSync(db);
    return record;
  });
}

/**
 * Retrieves payment transaction history with optional pagination and filters.
 */
export async function getPaymentRecords(filter?: {
  payer?: string;
  seller?: string;
  endpoint?: string;
  status?: PaymentStatus;
  limit?: number;
}): Promise<PaymentRecord[]> {
  const db = ensureDbFile();
  let list = db.transactions;

  if (filter?.payer) {
    const p = filter.payer.toLowerCase();
    list = list.filter((t) => t.payer.toLowerCase() === p);
  }
  if (filter?.seller) {
    const s = filter.seller.toLowerCase();
    list = list.filter((t) => t.seller.toLowerCase() === s);
  }
  if (filter?.endpoint) {
    list = list.filter((t) => t.endpoint === filter.endpoint);
  }
  if (filter?.status) {
    list = list.filter((t) => t.status === filter.status);
  }

  const limit = filter?.limit || 100;
  return list.slice(0, limit);
}

/**
 * Retrieves a single payment record by paymentId or ID.
 */
export async function getPaymentRecordById(idOrPaymentId: string): Promise<PaymentRecord | null> {
  const db = ensureDbFile();
  const found = db.transactions.find(
    (t) => t.id === idOrPaymentId || t.paymentId === idOrPaymentId
  );
  return found || null;
}
