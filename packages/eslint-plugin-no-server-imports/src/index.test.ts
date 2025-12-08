import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import plugin from './index';

// Configure RuleTester to use Vitest's lifecycle
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

// Suggestion counts for test assertions
// All violations: 1 suggestion (suggestServerOnlyMarker only)
// Dynamic import suggestion was removed - it doesn't fix the issue (still executes in client)
// No suggestions offered when file has 'use client' directive (conflicts with server-only)
const importSuggestions = 1;
const requireSuggestions = 1;
const reexportSuggestions = 1;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
});

// Run the RuleTester directly (not inside it blocks!)
// RuleTester creates its own describe/it blocks internally

ruleTester.run('no-server-imports - basic', plugin.rules['no-server-imports'], {
  valid: [
    // Server files should be ignored
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/lib/logger.server.ts',
    },
    {
      code: `import { readFile } from 'fs';`,
      filename: '/app/src/server/utils.ts',
    },
    {
      code: `import db from 'better-sqlite3';`,
      filename: '/app/src/api/users.ts',
    },

    // Client file with server-only marker
    {
      code: `import 'server-only';\nimport pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Side-effect import with server-only marker (regression test)
    {
      code: `import 'server-only';\nimport 'fs';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Re-export with server-only marker (regression test)
    {
      code: `import 'server-only';\nexport { default } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Export * with server-only marker (regression test)
    {
      code: `import 'server-only';\nexport * from 'fs';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Client file using server function with import INSIDE callback (scope-aware)
    {
      code: `import { createServerFn } from '@tanstack/start';\nimport pino from 'pino';\nconst fn = createServerFn().handler(() => { pino.info('server'); });`,
      filename: '/app/src/routes/index.tsx',
    },

    // Non-server modules in client files
    {
      code: `import React from 'react';`,
      filename: '/app/src/components/Button.tsx',
    },
    {
      code: `import { useState } from 'react';`,
      filename: '/app/src/routes/home.tsx',
    },

    // Files not matching client patterns (ignored)
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/lib/logger.ts',
    },

    // Dynamic imports inside functions (OK)
    {
      code: `async function log() { const pino = await import('pino'); }`,
      filename: '/app/src/routes/index.tsx',
    },

    // Type-only imports should be allowed (erased at compile time)
    {
      code: `import type { Logger } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },
    {
      code: `import type { Database } from 'better-sqlite3';`,
      filename: '/app/src/components/types.tsx',
    },

    // Inline type imports should be allowed
    {
      code: `import { type Logger } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },
    {
      code: `import { type Logger, type Level } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Type-only exports should be allowed
    {
      code: `export type { Logger } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Inline type exports should be allowed
    {
      code: `export { type Logger } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },

    // Server function with chained calls (import used inside)
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().handler(() => { pino.info('log'); });`,
      filename: '/app/src/routes/index.tsx',
    },

    // require('server-only') marker
    {
      code: `require('server-only');\nconst pino = require('pino');`,
      filename: '/app/src/routes/index.tsx',
    },

    // require inside server function callback is OK
    {
      code: `const fn = createServerFn().handler(() => { const pino = require('pino'); });`,
      filename: '/app/src/routes/index.tsx',
    },

    // Next.js app directory in src
    {
      code: `import pino from 'pino';`,
      filename: '/project/src/app/api/route.ts', // api is server pattern
    },
  ],

  invalid: [
    // pino in client file
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    {
      code: `import { logger } from 'pino';`,
      filename: '/app/src/components/Header.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Node.js built-ins in client file
    {
      code: `import fs from 'fs';`,
      filename: '/app/src/pages/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    {
      code: `import { readFile } from 'node:fs';`,
      filename: '/app/src/routes/file.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    {
      code: `import path from 'path';`,
      filename: '/app/src/components/FileViewer.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    {
      code: `import crypto from 'node:crypto';`,
      filename: '/app/src/routes/auth.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Database modules in client file
    {
      code: `import Database from 'better-sqlite3';`,
      filename: '/app/src/routes/users.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    {
      code: `import { PrismaClient } from '@prisma/client';`,
      filename: '/app/src/components/UserList.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Multiple server imports
    {
      code: `import pino from 'pino';\nimport fs from 'fs';`,
      filename: '/app/src/routes/index.tsx',
      errors: [
        { messageId: 'serverOnlyImport', suggestions: importSuggestions },
        { messageId: 'serverOnlyImport', suggestions: importSuggestions },
      ],
    },

    // Subpath imports
    {
      code: `import { promises } from 'fs/promises';`,
      filename: '/app/src/routes/file.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Side-effect imports (import 'module' with no specifiers)
    {
      code: `import 'fs';`,
      filename: '/app/src/routes/file.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    {
      code: `import 'pino';`,
      filename: '/app/src/components/Logger.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Islands (Astro pattern)
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/islands/Counter.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Re-exports
    {
      code: `export { default } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: reexportSuggestions }],
    },

    // Comment containing server function name should NOT bypass check
    {
      code: `// We use createServerFn elsewhere\nimport pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // String containing server function name should NOT bypass check
    {
      code: `const str = 'createServerFn';\nimport pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // require() calls should be caught
    {
      code: `const pino = require('pino');`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },
    {
      code: `const fs = require('fs');`,
      filename: '/app/src/components/FileReader.tsx',
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },

    // Mixed import and require
    {
      code: `import pino from 'pino';\nconst fs = require('fs');`,
      filename: '/app/src/routes/index.tsx',
      errors: [
        { messageId: 'serverOnlyImport', suggestions: importSuggestions },
        { messageId: 'serverOnlyRequire', suggestions: requireSuggestions },
      ],
    },

    // require outside server function should still error even if server function exists
    {
      code: `const pino = require('pino');\nconst fn = createServerFn().handler(() => {});`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },

    // Multiple import declarations for same module each report
    {
      code: `import pino from 'pino';\nimport { logger } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [
        { messageId: 'serverOnlyImport', suggestions: importSuggestions },
        { messageId: 'serverOnlyImport', suggestions: importSuggestions },
      ],
    },

    // Mixed type and value import (value part should error)
    {
      code: `import pino, { type Logger } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Mixed type and value in named imports
    {
      code: `import { type Logger, info } from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Next.js app directory in src - should catch client code
    {
      code: `import pino from 'pino';`,
      filename: '/project/src/app/page.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

ruleTester.run('no-server-imports - custom options', plugin.rules['no-server-imports'], {
  valid: [
    // Custom server file pattern
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/backend/logger.ts',
      options: [{ serverFilePatterns: ['**/backend/**'] }],
    },

    // Ignored files
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/__test__/index.tsx',
      options: [{ ignoreFiles: ['**/__test__/**'] }],
    },

    // Custom server function names (must be actual call with import used inside callback)
    {
      code: `import pino from 'pino';\nconst fn = myServerFn(() => { pino.info('log'); });`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverFunctionNames: ['myServerFn'] }],
    },
  ],

  invalid: [
    // Custom server modules
    {
      code: `import { myLogger } from 'my-server-logger';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverModules: ['my-server-logger'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Custom client file patterns
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/views/home.tsx',
      options: [{ clientFilePatterns: ['**/views/**'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // File path imports (like @/lib/logger)
    {
      code: `import { logger } from '@/lib/logger';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverModules: ['@/lib/logger'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Relative path imports
    {
      code: `import { db } from '../lib/database';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverModules: ['../lib/database'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Subpath of custom module
    {
      code: `import { query } from '@/lib/logger/utils';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverModules: ['@/lib/logger'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },

    // Custom server function name mentioned in comment should NOT allow
    {
      code: `// myServerFn is used elsewhere\nimport pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverFunctionNames: ['myServerFn'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

ruleTester.run('no-server-imports - server function scope detection', plugin.rules['no-server-imports'], {
  valid: [
    // Import used INSIDE server function callback - ALLOWED
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().handler(() => { pino(); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // Import used inside nested chained call
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().validator(() => {}).handler(() => { pino.info('test'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // SolidStart server$ with usage inside
    {
      code: `import pino from 'pino';\nconst fn = server$(() => { pino.info('server'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // Multiple imports, all used inside server function
    {
      code: `import pino from 'pino';\nimport fs from 'fs';\nconst fn = createServerFn().handler(() => { pino.info('log'); fs.readFile('x'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // action$ with usage inside
    {
      code: `import { db } from 'better-sqlite3';\nconst action = action$(() => { db.query('SELECT 1'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // loader$ with usage inside
    {
      code: `import pino from 'pino';\nconst loader = loader$(() => { return pino.info('loading'); });`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [
    // Server function exists but import NOT used inside it - BLOCKED
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().handler(() => { console.log('no pino here'); });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Import used OUTSIDE server function, even with server fn present
    {
      code: `import pino from 'pino';\npino.info('outside');\nconst fn = createServerFn().handler(() => {});`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Import used outside AND inside server function should still error
    {
      code: `import pino from 'pino';\npino.info('outside');\nconst fn = createServerFn().handler(() => { pino(); });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Multiple imports, only one used inside - the unused one is blocked
    {
      code: `import pino from 'pino';\nimport fs from 'fs';\nconst fn = createServerFn().handler(() => { pino.info('log'); });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }], // fs is not used inside
    },
    // Server function name as property access should NOT count
    {
      code: `import pino from 'pino';\nobj.createServerFn;`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Server function name as string literal
    {
      code: `import pino from 'pino';\nconst x = { createServerFn: true };`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Shadowing the import inside server callback should not allow it
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().handler(() => { const pino = 'client'; console.log(pino); });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // No server function at all
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

ruleTester.run('no-server-imports - edge cases', plugin.rules['no-server-imports'], {
  valid: [
    // Empty file
    {
      code: ``,
      filename: '/app/src/routes/empty.tsx',
    },

    // Only comments
    {
      code: `// This is a comment`,
      filename: '/app/src/routes/comment.tsx',
    },

    // Import with alias that looks like server module
    {
      code: `import { something as pino } from 'safe-module';`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [],
});

// NEW: Test require() variable tracking (bug fix)
ruleTester.run('no-server-imports - require variable tracking', plugin.rules['no-server-imports'], {
  valid: [
    // require() at top-level but variable ONLY used inside server callback - ALLOWED
    {
      code: `const fs = require('fs');\nconst fn = createServerFn().handler(() => { fs.readFile('test.txt'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // Destructured require with usage inside server callback
    {
      code: `const { readFile } = require('fs');\nconst fn = createServerFn().handler(() => { readFile('test.txt'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // Multiple variables from require, all used inside server scope
    {
      code: `const fs = require('fs');\nconst pino = require('pino');\nconst fn = createServerFn().handler(() => { fs.readFile('x'); pino.info('log'); });`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [
    // require() at top-level, variable used OUTSIDE server callback - BLOCKED
    {
      code: `const fs = require('fs');\nfs.readFile('test.txt');`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },
    // require() variable used both inside and outside - BLOCKED
    {
      code: `const fs = require('fs');\nfs.readFile('outside');\nconst fn = createServerFn().handler(() => { fs.readFile('inside'); });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },
    // Destructured require, variable used outside
    {
      code: `const { readFile } = require('fs');\nreadFile('test.txt');`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },
  ],
});

// NEW: Test reportUnusedImports option
ruleTester.run('no-server-imports - reportUnusedImports option', plugin.rules['no-server-imports'], {
  valid: [
    // Unused import with reportUnusedImports: false - ALLOWED (let no-unused-vars handle it)
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ reportUnusedImports: false }],
    },
    // Unused require with reportUnusedImports: false
    {
      code: `const fs = require('fs');`,
      filename: '/app/src/routes/index.tsx',
      options: [{ reportUnusedImports: false }],
    },
  ],

  invalid: [
    // Unused import with reportUnusedImports: true (default) - BLOCKED
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ reportUnusedImports: true }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Default behavior (reportUnusedImports defaults to true)
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// NEW: Test Next.js serverExternalPackages integration
ruleTester.run('no-server-imports - serverExternalPackages option', plugin.rules['no-server-imports'], {
  valid: [
    // Package not in serverExternalPackages - allowed
    {
      code: `import { something } from 'my-safe-package';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverExternalPackages: ['my-server-pkg'] }],
    },
  ],

  invalid: [
    // Package in serverExternalPackages - blocked (using custom package not in defaults)
    {
      code: `import myPkg from 'my-server-pkg';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverExternalPackages: ['my-server-pkg'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Subpath of serverExternalPackages - blocked
    {
      code: `import { util } from 'my-server-pkg/utils';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverExternalPackages: ['my-server-pkg'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// NEW: Test file selection mode
ruleTester.run('no-server-imports - mode option', plugin.rules['no-server-imports'], {
  valid: [
    // 'client-only' mode (default): non-client files are ignored
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/lib/logger.ts', // Not a client file
      options: [{ mode: 'client-only' }],
    },
    // 'all-non-server' mode: server files still ignored
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/server/logger.ts', // Server file
      options: [{ mode: 'all-non-server' }],
    },
  ],

  invalid: [
    // 'all-non-server' mode: non-client, non-server files ARE checked
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/lib/logger.ts', // Not explicitly client, but not server either
      options: [{ mode: 'all-non-server' }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // 'all-non-server' mode: client files still checked
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ mode: 'all-non-server' }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test export * declarations
ruleTester.run('no-server-imports - export all', plugin.rules['no-server-imports'], {
  valid: [
    // Type-only export all should be allowed
    {
      code: `export type * from 'pino';`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [
    // export * from server module - BLOCKED
    {
      code: `export * from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: reexportSuggestions }],
    },
    // export * from fs - BLOCKED
    {
      code: `export * from 'fs';`,
      filename: '/app/src/components/utils.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: reexportSuggestions }],
    },
  ],
});

// Test namespace imports
ruleTester.run('no-server-imports - namespace imports', plugin.rules['no-server-imports'], {
  valid: [
    // Namespace import used inside server callback - ALLOWED
    {
      code: `import * as fs from 'fs';\nconst fn = createServerFn().handler(() => { fs.readFile('x'); });`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [
    // Namespace import used outside server callback - BLOCKED
    {
      code: `import * as fs from 'fs';\nfs.readFile('x');`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Unused namespace import - BLOCKED (default reportUnusedImports: true)
    {
      code: `import * as pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test async server callbacks
ruleTester.run('no-server-imports - async callbacks', plugin.rules['no-server-imports'], {
  valid: [
    // Async server callback - ALLOWED
    {
      code: `import fs from 'fs';\nconst fn = createServerFn().handler(async () => { await fs.promises.readFile('x'); });`,
      filename: '/app/src/routes/index.tsx',
    },
    // Async with await inside - ALLOWED
    {
      code: `import pino from 'pino';\nconst fn = server$(async () => { const result = await fetch('/api'); pino.info(result); });`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [
    // Async callback but import used outside - BLOCKED
    {
      code: `import pino from 'pino';\npino.info('outside');\nconst fn = createServerFn().handler(async () => { });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test option toggling (checkServerOnlyMarker, checkServerFunctions)
ruleTester.run('no-server-imports - option toggling', plugin.rules['no-server-imports'], {
  valid: [
    // checkServerFunctions: false with unused import and reportUnusedImports: false
    // Since no server scopes are created, import is unused, but we allow that
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().handler(() => { console.log('no pino'); });`,
      filename: '/app/src/routes/index.tsx',
      options: [{ checkServerFunctions: false, reportUnusedImports: false }],
    },
  ],

  invalid: [
    // checkServerOnlyMarker: false - 'server-only' marker is ignored
    {
      code: `import 'server-only';\nimport pino from 'pino';`,
      filename: '/app/src/routes/index.tsx',
      options: [{ checkServerOnlyMarker: false }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // checkServerFunctions: false - server function doesn't create safe scope
    // So pino.info() is seen as client-side usage
    {
      code: `import pino from 'pino';\nconst fn = createServerFn().handler(() => { pino.info('log'); });`,
      filename: '/app/src/routes/index.tsx',
      options: [{ checkServerFunctions: false }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test combined options
ruleTester.run('no-server-imports - combined options', plugin.rules['no-server-imports'], {
  valid: [
    // mode: all-non-server + reportUnusedImports: false
    {
      code: `import pino from 'pino';`,
      filename: '/app/src/lib/logger.ts',
      options: [{ mode: 'all-non-server', reportUnusedImports: false }],
    },
    // serverExternalPackages + used inside server callback
    {
      code: `import myPkg from 'my-native-pkg';\nconst fn = createServerFn().handler(() => { myPkg.init(); });`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverExternalPackages: ['my-native-pkg'] }],
    },
  ],

  invalid: [
    // mode: all-non-server + serverExternalPackages
    {
      code: `import myPkg from 'my-native-pkg';`,
      filename: '/app/src/lib/utils.ts',
      options: [{ mode: 'all-non-server', serverExternalPackages: ['my-native-pkg'] }],
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test createIsomorphicFn (another server function variant)
ruleTester.run('no-server-imports - createIsomorphicFn', plugin.rules['no-server-imports'], {
  valid: [
    // createIsomorphicFn with usage inside callback
    {
      code: `import pino from 'pino';\nconst fn = createIsomorphicFn().server(() => { pino.info('log'); });`,
      filename: '/app/src/routes/index.tsx',
    },
  ],

  invalid: [
    // createIsomorphicFn but import unused in callback
    {
      code: `import pino from 'pino';\nconst fn = createIsomorphicFn().server(() => { console.log('no pino'); });`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test real-world patterns
ruleTester.run('no-server-imports - real world patterns', plugin.rules['no-server-imports'], {
  valid: [
    // Database query in server action (TanStack Start pattern)
    {
      code: `import { db } from '@prisma/client';\nconst getUsers = createServerFn().handler(async () => {\n  return db.user.findMany();\n});`,
      filename: '/app/src/routes/users.tsx',
      options: [{ serverModules: ['@prisma/client'] }],
    },
    // Correct pattern: create logger INSIDE server callback
    {
      code: `import pino from 'pino';\nexport const loader = loader$(async () => {\n  const logger = pino();\n  logger.info('Loading data');\n  return { data: 'test' };\n});`,
      filename: '/app/src/routes/index.tsx',
    },
    // File system access in API route simulation
    {
      code: `import fs from 'fs';\nconst readConfig = createServerFn().handler(() => {\n  return JSON.parse(fs.readFileSync('config.json', 'utf-8'));\n});`,
      filename: '/app/src/routes/config.tsx',
    },
  ],

  invalid: [
    // Accidental top-level logger initialization (common mistake!)
    // pino() at top level is a client-side call
    {
      code: `import pino from 'pino';\nconst logger = pino();\nexport const loader = loader$(async () => {\n  logger.info('Loading data');\n});`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Accidental top-level usage (common mistake)
    {
      code: `import pino from 'pino';\nconst logger = pino(); // This runs on client!\nexport const getServerData = createServerFn().handler(() => {\n  logger.info('server');\n});`,
      filename: '/app/src/routes/index.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
    // Importing for type but using value
    {
      code: `import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();`,
      filename: '/app/src/components/UserList.tsx',
      errors: [{ messageId: 'serverOnlyImport', suggestions: importSuggestions }],
    },
  ],
});

// Test require with serverExternalPackages
ruleTester.run('no-server-imports - require with serverExternalPackages', plugin.rules['no-server-imports'], {
  valid: [
    // require of serverExternalPackage inside server callback - ALLOWED
    {
      code: `const fn = createServerFn().handler(() => { const pkg = require('my-native-pkg'); });`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverExternalPackages: ['my-native-pkg'] }],
    },
  ],

  invalid: [
    // require of serverExternalPackage at top level - BLOCKED
    {
      code: `const pkg = require('my-native-pkg');`,
      filename: '/app/src/routes/index.tsx',
      options: [{ serverExternalPackages: ['my-native-pkg'] }],
      errors: [{ messageId: 'serverOnlyRequire', suggestions: requireSuggestions }],
    },
  ],
});
