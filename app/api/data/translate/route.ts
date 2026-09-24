import { NextRequest, NextResponse } from 'next/server';

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

// Curated high-quality translations for typical demo phrases
const defaultTranslations: Record<string, Record<string, string>> = {
  'Hello, the future is agentic.': {
    Spanish: 'Hola, el futuro es agéntico.',
    French: 'Bonjour, l’avenir est agentique.',
    German: 'Hallo, die Zukunft ist agentisch.',
    Chinese: '你好，未来属于智能体。',
    Japanese: 'こんにちは、未来は自律型エージェントの時代です。',
    Hindi: 'नमस्ते, भविष्य एजेंटिक है।',
    Arabic: 'مرحبًا، المستقبل وكيل وذاتي التشغيل.',
    Russian: 'Привет, будущее за автономными агентами.',
    Portuguese: 'Olá, o futuro é agêntico.',
    Bangla: 'হ্যালো, ভবিষ্যৎ স্বয়ংক্রিয় এআই এজেন্টদের।',
  },
  'hello': {
    Spanish: 'Hola',
    French: 'Bonjour',
    German: 'Hallo',
    Chinese: '你好',
    Japanese: 'こんにちは',
    Hindi: 'नमस्ते',
    Arabic: 'مرحبًا',
    Russian: 'Привет',
    Portuguese: 'Olá',
    Bangla: 'হ্যালো',
  }
};

async function fetchMyMemoryTranslation(text: string, targetLang: string): Promise<string | null> {
  const code = langCodeMap[targetLang] || 'es';
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${code}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.responseData && json.responseData.translatedText) {
      return json.responseData.translatedText;
    }
  } catch (err) {
    console.warn('MyMemory translation fallback failed:', err);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('text') || 'Hello, the future is agentic.').trim();
  const targetLang = searchParams.get('targetLang') || 'Spanish';
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Try Gemini API if key is provided and not obviously a placeholder
  if (apiKey && apiKey !== 'placeholder' && !apiKey.includes('get_free_from')) {
    try {
      const prompt = `Translate exactly the following short text into ${targetLang}. 
Return strictly a raw JSON object (no markdown formatting, no backticks, just the JSON) where the key is "${targetLang}" and the value is the translated text.
Text to translate: "${text}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const data = await response.json();
      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return NextResponse.json({ translations: parsed });
        }
      }
    } catch (e) {
      console.warn("Gemini translation error, falling back:", e);
    }
  }

  // 2. Check curated instant dictionary
  const trimmed = text.replace(/["']/g, '').trim();
  if (defaultTranslations[trimmed] && defaultTranslations[trimmed][targetLang]) {
    return NextResponse.json({
      translations: { [targetLang]: defaultTranslations[trimmed][targetLang] }
    });
  }

  // 3. Fallback to free real-time translation service (MyMemory)
  const webTranslation = await fetchMyMemoryTranslation(text, targetLang);
  if (webTranslation) {
    return NextResponse.json({
      translations: { [targetLang]: webTranslation }
    });
  }

  // 4. Default guaranteed fallback
  return NextResponse.json({
    translations: { [targetLang]: `${text} (${targetLang})` }
  });
}
