import { withX402 } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text') || 'hello';
  
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-fr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text })
    });
    const data = await response.json();
    if (data.error) {
       return NextResponse.json({ mock: true, translation: `Mock Translation of: ${text} to French (API Rate Limited)` });
    }
    return NextResponse.json({ translation: data[0]?.translation_text || "Translation failed" });
  } catch (error) {
    return NextResponse.json({ mock: true, translation: `Mock Translation of: ${text} to French` });
  }
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
