import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  // Enforce x402 V2 payment verification & Circle Gateway settlement
  const authResult = await protectWithX402(req, '/api/weather');
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'New York';
  const apiKey = process.env.OPENWEATHER_API_KEY;

  try {
    let weatherData: any;

    if (apiKey && apiKey !== 'placeholder' && !apiKey.includes('get_free_from')) {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
      if (res.ok) {
        weatherData = await res.json();
      } else {
        throw new Error(`OpenWeather API returned ${res.status}`);
      }
    } else {
      // Direct live fallback to Open-Meteo API (real live meteorological satellite data, never mock)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
        { cache: 'no-store' }
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        return NextResponse.json({ error: `City '${city}' not found` }, { status: 404 });
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      const meteoRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`,
        { cache: 'no-store' }
      );
      const meteoData = await meteoRes.json();

      weatherData = {
        name,
        country,
        main: {
          temp: meteoData.current?.temperature_2m,
          feels_like: meteoData.current?.apparent_temperature,
          humidity: meteoData.current?.relative_humidity_2m,
        },
        wind: {
          speed: meteoData.current?.wind_speed_10m,
        },
        weather: [
          {
            code: meteoData.current?.weather_code,
            description: 'Live Meteorological Station Data',
          },
        ],
        coordinates: { latitude, longitude },
      };
    }

    return NextResponse.json(
      {
        ...weatherData,
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
    console.error('[Weather API] Error executing live weather query:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch weather data from external provider' },
      { status: 502 }
    );
  }
}
