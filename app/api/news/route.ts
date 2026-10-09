import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const authResult = await protectWithX402(req, '/api/news');
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'technology';
  const apiKey = process.env.NEWS_API_KEY;

  try {
    let articles: any[] = [];

    if (apiKey && apiKey !== 'placeholder' && !apiKey.includes('get_free_from')) {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?category=${encodeURIComponent(category)}&language=en&apiKey=${apiKey}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        articles = data.articles || [];
      }
    }

    // Live fallback to real financial & tech feeds if NewsAPI unavailable
    if (articles.length === 0) {
      const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { cache: 'no-store' });
      const topIds: number[] = await hnRes.json();
      const top5 = topIds.slice(0, 5);

      const items = await Promise.all(
        top5.map(async (id) => {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { cache: 'no-store' });
          return itemRes.json();
        })
      );

      articles = items.map((item) => ({
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: { name: 'Hacker News / Global Tech Feed' },
        publishedAt: new Date(item.time * 1000).toISOString(),
        score: item.score,
      }));
    }

    return NextResponse.json(
      {
        category,
        count: articles.length,
        articles,
        _payment: {
          settlementId: authResult.settlementId,
          payer: authResult.payer,
          amount: authResult.amount,
          network: authResult.network,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'X-Payment-Settlement': authResult.settlementId,
          'X-Payment-Payer': authResult.payer,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[News API] Error fetching live news:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live news headlines' },
      { status: 502 }
    );
  }
}
