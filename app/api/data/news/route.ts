import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'technology';
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey.includes('get_free_from')) {
    return NextResponse.json({ mock: true, articles: [{ title: "AI Reaches New Heights", source: {name: "Mock News"} }] });
  }
  // Use the 'everything' endpoint with 'q' to support arbitrary search queries since 'category' only allows strict enums
  const data = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(category)}&sortBy=publishedAt&language=en&apiKey=${apiKey}`);
  return NextResponse.json(await data.json());
}
