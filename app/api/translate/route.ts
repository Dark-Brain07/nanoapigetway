import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const langCodeMap: Record<string, string> = {
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Chinese: 'zh',
  Japanese: 'ja',
  Hindi: 'hi',
  Arabic: 'ar',
  Russian: 'ru',
  Portuguese: 'pt',
  Bangla: 'bn',
  Bengali: 'bn',
  Italian: 'it',
};

async function handleTranslation(req: NextRequest) {
  const authResult = await protectWithX402(req, '/api/translate');
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('text') || '').trim();
  const targetLang = searchParams.get('targetLang') || 'Spanish';

  if (!text) {
    return NextResponse.json(
      { error: 'Parameter text is required for translation' },
      { status: 400 }
    );
  }

  const code = langCodeMap[targetLang] || targetLang.toLowerCase().slice(0, 2);

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${code}`,
      {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Translation upstream returned HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json.responseData || !json.responseData.translatedText) {
      throw new Error('Upstream translation returned invalid payload');
    }

    const translated = json.responseData.translatedText;

    return NextResponse.json(
      {
        originalText: text,
        targetLanguage: targetLang,
        translation: translated,
        matchQuality: json.responseData.match,
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
    console.error('[Translate API] Translation failure:', error);
    return NextResponse.json(
      { error: error.message || 'Translation service failure' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleTranslation(req);
}

export async function POST(req: NextRequest) {
  return handleTranslation(req);
}
