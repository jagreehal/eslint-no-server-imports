// This file should trigger ESLint errors - importing server-only modules in a +page.ts that can be bundled client-side
import fs from 'fs';
import pino from 'pino';

// This would break at runtime if bundled for client
export async function load() {
  const logger = pino();
  const data = fs.readFileSync('package.json', 'utf-8');
  logger.info('This should not work in client code');
  
  return {
    dataLength: data.length,
  };
}




