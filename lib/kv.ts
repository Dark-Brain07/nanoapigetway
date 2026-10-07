const KV_BUCKET = 'S87Aov1AbBgh9QevLpZq9w';
const KV_URL = `https://kvdb.io/${KV_BUCKET}/deposits`;

export async function getGatewayDeposits(): Promise<Record<string, number>> {
  try {
    const res = await fetch(KV_URL, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    return data || {};
  } catch (error) {
    return {};
  }
}

export async function setGatewayDeposits(deposits: Record<string, number>) {
  try {
    await fetch(KV_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deposits)
    });
  } catch (error) {
    console.error('Failed to write to KV database');
  }
}
