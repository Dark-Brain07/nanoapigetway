import { NextRequest, NextResponse } from 'next/server';

// Lightweight middleware — only adds CORS headers, no heavy x402 import
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment');
  
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }
  
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
