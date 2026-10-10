import { NextRequest, NextResponse } from 'next/server';
import { protectWithX402 } from '@/lib/x402Server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Authoritative x402 payment validation & Circle Gateway settlement
  const authResult = await protectWithX402(req, '/api/chat');
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || 'Hello';
    const conversationHistory = body.history || [];

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let replyText = '';

    // 1. Try Groq ultra-fast LPU inference first (openai/gpt-oss-20b ~2.5s, qwen/qwen3.8-27b ~4s)
    if (groqKey && groqKey !== 'placeholder' && !groqKey.includes('get_free_from')) {
      for (const model of ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b']) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'You are the NanoAPI Gateway Intelligent Agent on Arc Mainnet with Circle Gateway Nanopayments. Provide detailed, helpful, expert answers with code snippets and clear explanations.',
                },
                ...conversationHistory.map((h: any) => ({
                  role: h.role === 'assistant' ? 'assistant' : 'user',
                  content: h.text || h.content || '',
                })),
                { role: 'user', content: message },
              ],
              max_tokens: 2048,
            }),
          });
          clearTimeout(timeoutId);

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            replyText = groqData.choices?.[0]?.message?.content || '';
            if (replyText) break;
          } else {
            const errData = await groqRes.json().catch(() => ({}));
            console.warn(`[Chat API] Groq (${model}) returned status ${groqRes.status}:`, errData);
          }
        } catch (e) {
          console.warn(`[Chat API] Groq (${model}) error:`, e);
        }
      }
    }

    // 2. Try Gemini fallback (gemini-flash-latest / gemini-pro-latest)
    if (!replyText && geminiKey && geminiKey !== 'placeholder' && !geminiKey.includes('get_free_from')) {
      for (const model of ['gemini-flash-latest', 'gemini-pro-latest']) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  ...conversationHistory.map((h: any) => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.text || h.content || '' }],
                  })),
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `You are the NanoAPI Gateway Intelligent Agent. Answer the user prompt helpfully, thoroughly, and expertly:\n\n${message}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );
          clearTimeout(timeoutId);

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (replyText) break;
          }
        } catch (e) {
          console.warn(`[Chat API] Gemini (${model}) error:`, e);
        }
      }
    }

    if (!replyText) {
      replyText = `NanoAPI Agent: Received your query "${message}". External LLM API key required on server for deep generative model completion.`;
    }

    return NextResponse.json(
      {
        reply: replyText,
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
        },
      }
    );
  } catch (err: any) {
    console.error('[Chat API] Error executing chat completion:', err);
    return NextResponse.json(
      { error: err.message || 'Chat inference error' },
      { status: 502 }
    );
  }
}
