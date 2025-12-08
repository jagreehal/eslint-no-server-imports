// BAD EXAMPLE: Common Mistakes
// This file shows mistakes developers commonly make

// MISTAKE 1: Importing server modules at component level
// ESLint Error: Server-only module "fs" imported in client code
import fs from 'fs';

// MISTAKE 2: Importing logging libraries at top level
// ESLint Error: Server-only module "pino" imported in client code
import pino from 'pino';

// MISTAKE 3: Creating logger instance at module scope
// This runs when the module loads - which happens on the client!
const logger = pino();

export default function CommonMistakes() {
  // MISTAKE 4: Using server modules in component body
  // This code would crash in the browser
  const config = fs.readFileSync('config.json', 'utf-8');

  // MISTAKE 5: Logging in component (runs on client)
  logger.info('Component rendered');

  return (
    <div>
      <h1>Common Mistakes - All of these trigger ESLint errors</h1>

      <h2>What went wrong:</h2>
      <ol>
        <li>Imported &apos;fs&apos; - Node.js built-in, doesn&apos;t exist in browser</li>
        <li>Imported &apos;pino&apos; - Server-side logging library</li>
        <li>Created logger at module scope - runs during client bundle</li>
        <li>Used fs.readFileSync in component - crashes in browser</li>
      </ol>

      <h2>How to fix:</h2>
      <ul>
        <li>Move server code to Server Actions (&apos;use server&apos;)</li>
        <li>Use API routes for server operations</li>
        <li>Use dynamic imports inside server functions</li>
        <li>Use type-only imports for TypeScript types</li>
      </ul>

      <pre>Config length: {config.length}</pre>
    </div>
  );
}
