import { withX402 } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
};

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('text') || 'Hello, the future is agentic.').trim();
  const targetLang = searchParams.get('targetLang') || 'Spanish';
  const code = langCodeMap[targetLang] || 'es';

  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${code}`);
    if (res.ok) {
      const json = await res.json();
      if (json.responseData && json.responseData.translatedText) {
        const translated = json.responseData.translatedText;
        return NextResponse.json({
          translation: translated,
          translations: { [targetLang]: translated }
        });
      }
    }
  } catch (error) {
    console.warn("Translation handler error:", error);
  }

  return NextResponse.json({
    translation: `${text} (${targetLang})`,
    translations: { [targetLang]: `${text} (${targetLang})` }
  });
};

export const GET = withX402(
  handler,
  (process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  {
    price: '$0.003',
    network: 'base-sepolia',
    config: { description: 'AI text translation - 1 call' },
  }
);
