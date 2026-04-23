import { withX402 } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'technology';
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder' || apiKey.includes('get_free_from')) {
    return NextResponse.json({ mock: true, articles: [{ title: "AI Reaches New Heights", source: {name: "Mock News"} }] });
  }

  const data = await fetch(`https://newsapi.org/v2/top-headlines?category=${category}&apiKey=${apiKey}`);
  return NextResponse.json(await data.json());
};

export const GET = withX402(
  handler,
  (process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  {
    price: '$0.002',
    network: 'base-sepolia',
    config: { description: 'Latest news headlines - 1 call' },
  }
);
