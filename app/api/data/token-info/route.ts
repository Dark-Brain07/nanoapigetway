import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractAddress = searchParams.get('contractAddress');
  
  if (!contractAddress || !contractAddress.startsWith('0x')) {
    return NextResponse.json({ error: 'Valid contractAddress parameter is required' }, { status: 400 });
  }

  try {
    // 1. Get Token Info via Blockscout V2 API
    const v2Res = await fetch(`https://testnet.arcscan.app/api/v2/tokens/${contractAddress}`);
    let tokenData: any = {};
    if (v2Res.ok) {
        tokenData = await v2Res.json();
    } else {
        return NextResponse.json({ error: 'Token not found on Arcscan' });
    }

    // 2. Get top token holders
    const holdersRes = await fetch(`https://testnet.arcscan.app/api/v2/tokens/${contractAddress}/holders`);
    let topHolders = [];
    if (holdersRes.ok) {
        const hData = await holdersRes.json();
        topHolders = (hData.items || []).slice(0, 3);
    }
    
    // 3. Smart contract verification & creator details
    const scRes = await fetch(`https://testnet.arcscan.app/api/v2/smart-contracts/${contractAddress}`);
    let isVerified = false;
    let creatorAddress = 'Unknown';
    if (scRes.ok) {
        const scData = await scRes.json();
        if (scData.is_verified) isVerified = true;
        if (scData.creator_address_hash) creatorAddress = scData.creator_address_hash;
    } else {
        // Fallback for creator address if not returned in smart-contracts endpoint
        const addressRes = await fetch(`https://testnet.arcscan.app/api/v2/addresses/${contractAddress}`);
        if (addressRes.ok) {
            const addrData = await addressRes.json();
            if (addrData.creator_address_hash) {
                creatorAddress = addrData.creator_address_hash;
            }
        }
    }

    const honeypotStatus = isVerified ? "Safe (Verified)" : "Warning (Unverified Contract)";
    
    return NextResponse.json({
      name: tokenData.name || 'Unknown Token',
      symbol: tokenData.symbol || '???',
      totalSupply: tokenData.total_supply,
      decimals: parseInt(tokenData.decimals || '18'),
      holders: tokenData.holders_count ? parseInt(tokenData.holders_count).toLocaleString() : '0',
      creator: creatorAddress,
      honeypotStatus,
      isVerified,
      topHolders: topHolders.map((h: any) => ({
        address: h.address?.hash || 'Unknown',
        value: h.value || '0'
      }))
    });

  } catch (error) {
    console.error('Token Info Error:', error);
    return NextResponse.json({ error: 'Failed to fetch token data' });
  }
}
