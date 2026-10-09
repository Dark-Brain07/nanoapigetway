import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function handleSummary(req: NextRequest) {
  const authResult = await protectWithX402(req, '/api/ai-summary');
  if (!authResult.success) {
    return authResult.response;
  }

  let textToSummarize = '';
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      textToSummarize = body.text || '';
    } catch {
      textToSummarize = '';
    }
  } else {
    const { searchParams } = new URL(req.url);
    textToSummarize = searchParams.get('text') || '';
  }

  if (!textToSummarize) {
    return NextResponse.json(
      { error: 'Parameter text is required for AI summarization' },
      { status: 400 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  try {
    let summaryText = '';

    // Try Groq first for ultra-fast, live real-time LLM inference (openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b)
    if (groqKey && groqKey !== 'placeholder' && !groqKey.includes('get_free_from')) {
      for (const model of ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'user',
                  content: `Summarize the following text concisely and accurately in 2-3 sentences:\n\n${textToSummarize}`,
                },
              ],
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            summaryText = groqData.choices?.[0]?.message?.content || '';
            if (summaryText) break;
          }
        } catch (e) {
          console.warn(`[AI Summary] Groq (${model}) error:`, e);
        }
      }
    }

    // Try Gemini if Groq wasn't configured or returned empty
    if (!summaryText && geminiKey && geminiKey !== 'placeholder' && !geminiKey.includes('get_free_from')) {
      for (const model of ['gemini-flash-latest', 'gemini-pro-latest']) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000),
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Summarize the following text concisely and accurately in 2-3 sentences:\n\n${textToSummarize}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (summaryText) break;
          }
        } catch (e) {
          console.warn(`[AI Summary] Gemini (${model}) error:`, e);
        }
      }
    }

    if (!summaryText) {
      return NextResponse.json(
        {
          error: 'External AI inference provider returned empty response or credentials require configuration',
          code: 'AI_PROVIDER_ERROR',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        summary: summaryText,
        originalLength: textToSummarize.length,
        summaryLength: summaryText.length,
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
    console.error('[AI Summary API] Error executing summary:', error);
    return NextResponse.json(
      { error: error.message || 'AI summarization pipeline failure' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleSummary(req);
}

export async function POST(req: NextRequest) {
  return handleSummary(req);
}
