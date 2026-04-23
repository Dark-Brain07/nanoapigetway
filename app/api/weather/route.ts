import { withX402 } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'Dhaka';
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey.includes('get_free_from')) {
    return NextResponse.json({ mock: true, name: city, main: { temp: 298.15 }, weather: [{ description: "Sunny (mock data)" }] });
  }

  const data = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
  return NextResponse.json(await data.json());
};

export const GET = withX402(
  handler,
  (process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  {
    price: '$0.001',
    network: 'base-sepolia',
    config: { description: 'Real-time weather data - 1 call' },
  }
);
