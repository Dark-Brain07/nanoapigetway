import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!message) {
      return NextResponse.json({ reply: "Please provide a message.", tokensUsed: 0 });
    }

    // --- AUTOMATIC ROUTER LOGIC ---
    // If the message contains complex keywords or is long, route to Gemini (best for reasoning)
    // Otherwise route to Groq (blazing fast for simple chat)
    const isComplex = /code|debug|write|math|calculate|explain|function|error|compile|build|script|architecture/i.test(message) || message.length > 150;

    let reply = "No reply available.";
    let tokensUsed = 0;
    let modelUsed = "";

    if (isComplex && geminiKey && !geminiKey.includes('placeholder')) {
      // --- ROUTE TO GEMINI ---
      modelUsed = "Gemini 1.5 Flash";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.warn("Gemini API Error:", data.error.message);
        // Fallback to Groq if Groq is available
        if (groqKey) {
           return await routeToGroq(message, groqKey);
        }
        return NextResponse.json({ reply: "Gemini error: " + data.error.message, tokensUsed: 0 });
      }
      
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply available.";
      tokensUsed = data.usageMetadata?.totalTokenCount || reply.length;
      
    } else if (groqKey) {
      // --- ROUTE TO GROQ ---
      return await routeToGroq(message, groqKey);
    } else {
      // --- FALLBACK MOCK ---
      return NextResponse.json({ 
        reply: "Mock Agentic Reply: " + message + "\n\n(Please configure API keys)",
        tokensUsed: 15
      });
    }

    return NextResponse.json({ reply, tokensUsed });
  } catch (error) {
    console.warn("Chat fetch error:", error);
    return NextResponse.json({ reply: "An error occurred processing your message.", tokensUsed: 0 });
  }
}

async function routeToGroq(message: string, apiKey: string) {
  const modelUsed = "Llama 3 (via Groq)";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: message }],
      max_tokens: 500
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    console.warn("Groq API Error:", data.error.message);
    return NextResponse.json({ reply: "Groq error: " + data.error.message, tokensUsed: 0 });
  }
  
  const reply = data.choices?.[0]?.message?.content || "No reply available.";
  const tokensUsed = data.usage?.total_tokens || reply.length;
  
  return NextResponse.json({ reply, tokensUsed });
}
