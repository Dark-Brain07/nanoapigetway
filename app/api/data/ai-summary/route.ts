import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text') || 'Example text to summarize';
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey.includes('get_free_from')) {
    return NextResponse.json({ mock: true, summary: "Mock AI Summary of: " + text.substring(0, 50) + "..." });
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Summarize this text: " + text }] }] })
    });
    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return NextResponse.json({ summary: "Summary failed: " + data.error.message });
    }
    
    return NextResponse.json({ summary: data.candidates?.[0]?.content?.parts?.[0]?.text || "Summary failed" });
  } catch (error) {
    console.error("Summary fetch error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
