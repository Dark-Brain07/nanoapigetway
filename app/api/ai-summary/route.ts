import { withX402 } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';

const handler = async (req: NextRequest) => {
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
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Summarize this text: " + text }] }]
      })
    });
    const data = await response.json();
    return NextResponse.json({ summary: data.candidates?.[0]?.content?.parts?.[0]?.text || "Summary failed" });
  } catch (error) {
    return NextResponse.json({ summary: "Failed to generate summary" });
  }
};

export const GET = withX402(
  handler,
  (process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  {
    price: '$0.005',
    network: 'base-sepolia',
    config: { description: 'AI text summarization - 1 call' },
  }
);
