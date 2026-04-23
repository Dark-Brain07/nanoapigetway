import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text') || 'Hello, the future is agentic.';
  const apiKey = process.env.GEMINI_API_KEY;

  const targetLang = searchParams.get('targetLang') || 'Spanish';

  if (!apiKey || apiKey === 'placeholder' || apiKey.includes('get_free_from')) {
    return NextResponse.json({ 
      mock: true, 
      translations: { [targetLang]: `Mock Translation of: ${text}` } 
    });
  }

  try {
    const prompt = `Translate exactly the following short text into ${targetLang}. 
    Return strictly a raw JSON object (no markdown formatting, no backticks, just the JSON) where the key is "${targetLang}" and the value is the translated text.
    Text to translate: "${text}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Low temp for strictly accurate translations
        }
      })
    });
    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean potential markdown blocks
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let translations = {};
    try {
       translations = JSON.parse(rawText);
    } catch(e) {
       console.error("Failed to parse Gemini output:", rawText);
       translations = { "Error": "Could not parse translation output" };
    }

    return NextResponse.json({ translations });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate translations" }, { status: 500 });
  }
}
