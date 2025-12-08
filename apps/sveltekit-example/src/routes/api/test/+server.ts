// This file should NOT trigger ESLint errors - it's a +server.ts file (server-only)
import fs from 'fs';
import pino from 'pino';

export async function GET() {
  const logger = pino();
  const data = fs.readFileSync('package.json', 'utf-8');
  
  logger.info('Server-side logging is fine here');
  
  return new Response(JSON.stringify({ message: 'Server route', dataLength: data.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
}







