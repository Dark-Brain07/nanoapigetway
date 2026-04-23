import { paymentMiddleware } from 'x402-next';

const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

export const middleware = paymentMiddleware(
  (process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  {
    '/api/weather': {
      price: '$0.001',
      network: 'base-sepolia',
      config: { description: 'Real-time weather data - 1 call' },
    },
    '/api/news': {
      price: '$0.002',
      network: 'base-sepolia',
      config: { description: 'Latest news headlines - 1 call' },
    },
    '/api/crypto-price': {
      price: '$0.001',
      network: 'base-sepolia',
      config: { description: 'Live crypto prices - 1 call' },
    },
    '/api/ai-summary': {
      price: '$0.005',
      network: 'base-sepolia',
      config: { description: 'AI text summarization - 1 call' },
    },
    '/api/translate': {
      price: '$0.003',
      network: 'base-sepolia',
      config: { description: 'AI text translation - 1 call' },
    },
  },
  { url: `${appUrl}/api/facilitator` as `${string}://${string}` }
);

export const config = {
  matcher: ['/api/weather', '/api/news', '/api/crypto-price', '/api/ai-summary', '/api/translate'],
};
