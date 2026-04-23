import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'Dhaka';
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey.includes('get_free_from')) {
    return NextResponse.json({ mock: true, name: city, main: { temp: 298.15 }, weather: [{ description: "Sunny (mock data)" }] });
  }
  const data = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
  return NextResponse.json(await data.json());
}
