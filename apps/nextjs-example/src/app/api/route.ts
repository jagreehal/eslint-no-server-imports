// This file should NOT trigger ESLint errors - it's in the api directory (server-only)
import fs from 'fs';
import pino from 'pino';

export async function GET() {
  const logger = pino();
  const data = fs.readFileSync('package.json', 'utf-8');
  
  logger.info('Server-side logging is fine here');
  
  return Response.json({ message: 'Server route', dataLength: data.length });
}








