/**
 * ESLint Plugin: eslint-plugin-no-server-imports
 * ===============================================
 * Prevents server-only module imports in client code.
 * Catches bundling issues in your editor instead of at build time.
 *
 * @author Jag Reehal [@jagreehal] <jag@jagreehal.com>
 * @license MIT
 */

import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import picomatch from 'picomatch';

/** Default server-only modules that should not be imported in client code */
const DEFAULT_SERVER_MODULES = [
  // Logging
  'pino',
  'pino-pretty',
  'pino-roll',
  'winston',
  'bunyan',
  // Database
  'better-sqlite3',
  'pg',
  'mysql2',
  'mongodb',
  'mongoose',
  'prisma',
  '@prisma/client',
  'drizzle-orm',
  'kysely',
  '@libsql/client',
  'libsql',
  '@mikro-orm/core',
  '@mikro-orm/knex',
  'sqlite3',
  // Authentication & Security
  'argon2',
  '@node-rs/argon2',
  'bcrypt',
  '@node-rs/bcrypt',
  'oslo',
  // AWS SDK
  '@aws-sdk/client-s3',
  '@aws-sdk/s3-presigned-post',
  'aws-crt',
  // Monitoring & Observability
  '@appsignal/nodejs',
  '@highlight-run/node',
  '@sentry/profiling-node',
  'dd-trace',
  'newrelic',
  '@statsig/statsig-node-core',
  // AI & ML
  '@huggingface/transformers',
  '@xenova/transformers',
  'chromadb-default-embed',
  'onnxruntime-node',
  // Blockchain
  '@blockfrost/blockfrost-js',
  '@jpg-store/lucid-cardano',
  // Build Tools & Compilers
  '@swc/core',
  'autoprefixer',
  'postcss',
  'prettier',
  'typescript',
  'ts-node',
  'ts-morph',
  'webpack',
  'eslint',
  // Testing
  'cypress',
  'jest',
  'playwright',
  'playwright-core',
  'puppeteer',
  'puppeteer-core',
  // Browser Automation
  '@sparticuz/chromium',
  '@sparticuz/chromium-min',
  // Content & Document Generation
  '@react-pdf/renderer',
  'mdx-bundler',
  'next-mdx-remote',
  'next-seo',
  'shiki',
  'vscode-oniguruma',
  // Image Processing
  'canvas',
  'sharp',
  // Utilities
  'config',
  'keyv',
  'node-cron',
  'rimraf',
  'thread-stream',
  // Runtime & Framework
  '@alinea/generated',
  '@zenstackhq/runtime',
  'express',
  'firebase-admin',
  'htmlrewriter',
  // Native Node.js addons
  'cpu-features',
  'isolated-vm',
  'node-pty',
  'node-web-audio-api',
  'websocket',
  'zeromq',
  // Module System Patchers
  'import-in-the-middle',
  'require-in-the-middle',
  // DOM & Browser APIs
  'jsdom',
  // Database (additional)
  'ravendb',
  // Node.js built-ins
  'fs',
  'node:fs',
  'fs/promises',
  'node:fs/promises',
  'path',
  'node:path',
  'crypto',
  'node:crypto',
  'child_process',
  'node:child_process',
  'os',
  'node:os',
  'net',
  'node:net',
  'dns',
  'node:dns',
  'cluster',
  'node:cluster',
  'worker_threads',
  'node:worker_threads',
];

/** Default file patterns that indicate server-only code */
const DEFAULT_SERVER_FILE_PATTERNS = [
  '**/*.server.ts',
  '**/*.server.tsx',
  '**/*.server.js',
  '**/server/**',
  '**/api/**',
  '**/_server/**',
];

/** Default file patterns that indicate client code */
const DEFAULT_CLIENT_FILE_PATTERNS = [
  '**/routes/**',
  '**/pages/**',
  '**/components/**',
  '**/islands/**',
  '**/src/app/**', // Next.js app directory (in src)
  // Note: For Next.js root-level app/, users should configure clientFilePatterns
  // We can't use '**/app/**' as it's too broad and matches paths like '/myapp/src/...'
];

/** Configuration options for the no-server-imports rule */
export interface RuleOptions {
  /** Additional server-only modules to check (merged with defaults) */
  serverModules?: string[];
  /** Additional server-only file patterns to check (merged with defaults) */
  serverFilePatterns?: string[];
  /** File patterns that indicate client code (overrides defaults if provided) */
  clientFilePatterns?: string[];
  /** File patterns to completely ignore */
  ignoreFiles?: string[];
  /** Whether to check for 'server-only' import marker */
  checkServerOnlyMarker?: boolean;
  /** Whether to check for server function usage (createServerFn, etc.) */
  checkServerFunctions?: boolean;
  /** Server function names to check for */
  serverFunctionNames?: string[];
  /** Whether to report unused server-only imports (default: true) */
  reportUnusedImports?: boolean;
  /** File selection mode: 'client-only' checks only clientFilePatterns, 'all-non-server' checks all except server files */
  mode?: 'client-only' | 'all-non-server';
  /** Next.js serverExternalPackages - merged into serverModules (for Next.js projects) */
  serverExternalPackages?: string[];
}

type MessageIds =
  | 'serverOnlyImport'
  | 'serverOnlyRequire'
  | 'suggestServerOnlyMarker';
type Options = [RuleOptions?];

const createRule = ESLintUtils.RuleCreator(
  () => 'https://github.com/jagreehal/eslint-plugin-no-server-imports#readme'
);

/**
 * Checks if an import declaration has any value (non-type) specifiers.
 * Returns false if ALL specifiers are type-only imports.
 */
function hasValueImportSpecifiers(node: TSESTree.ImportDeclaration): boolean {
  // If the whole import is type-only, no value specifiers
  if (node.importKind === 'type') {
    return false;
  }

  // If no specifiers (side-effect import like `import 'module'`), it's a value import
  if (node.specifiers.length === 0) {
    return true;
  }

  // Check if ANY specifier is a value import (not type-only)
  return node.specifiers.some((specifier) => {
    // Default imports and namespace imports don't have importKind
    if (specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
      return true; // Default imports are always value imports
    }
    if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
      return true; // Namespace imports are always value imports
    }
    // For named imports, check if it's a type import
    if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
      return specifier.importKind !== 'type';
    }
    return true;
  });
}

/**
 * Checks if an export declaration has any value (non-type) specifiers.
 * Returns false if ALL specifiers are type-only exports.
 */
function hasValueExportSpecifiers(node: TSESTree.ExportNamedDeclaration): boolean {
  // If the whole export is type-only, no value specifiers
  if (node.exportKind === 'type') {
    return false;
  }

  // If no specifiers but has source (re-export), check the specifiers
  if (node.specifiers.length === 0) {
    return true; // `export * from 'module'` is a value export
  }

  // Check if ANY specifier is a value export (not type-only)
  return node.specifiers.some((specifier) => {
    return specifier.exportKind !== 'type';
  });
}

/**
 * Gets the local names of value imports from an import declaration
 */
function getValueImportNames(node: TSESTree.ImportDeclaration): string[] {
  if (node.importKind === 'type') {
    return [];
  }

  const names: string[] = [];
  for (const specifier of node.specifiers) {
    switch (specifier.type) {
      case AST_NODE_TYPES.ImportDefaultSpecifier:
      case AST_NODE_TYPES.ImportNamespaceSpecifier: {
        names.push(specifier.local.name);
        break;
      }
      case AST_NODE_TYPES.ImportSpecifier: {
        if (specifier.importKind !== 'type') {
          names.push(specifier.local.name);
        }
        break;
      }
    }
  }
  return names;
}

/**
 * Checks if a node is inside a given scope (function/arrow function)
 */
function isNodeInsideScope(node: TSESTree.Node, scopeNode: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (current === scopeNode) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Checks if a node is a directive prologue (e.g., 'use client', 'use strict')
 */
function isDirectivePrologue(node: TSESTree.Statement): boolean {
  return (
    node.type === AST_NODE_TYPES.ExpressionStatement &&
    node.expression.type === AST_NODE_TYPES.Literal &&
    typeof node.expression.value === 'string'
  );
}

/**
 * Checks if the file has a 'use client' directive
 */
function hasUseClientDirective(sourceCode: TSESLint.SourceCode): boolean {
  const ast = sourceCode.ast;
  if (!ast.body || ast.body.length === 0) return false;

  for (const node of ast.body) {
    if (!isDirectivePrologue(node)) break;
    const expr = (node as TSESTree.ExpressionStatement).expression as TSESTree.Literal;
    if (expr.value === 'use client') return true;
  }
  return false;
}

/**
 * Finds the best node to insert the server-only marker before
 * Respects shebangs, file comments, directive prologues, and existing imports
 *
 * @param sourceCode - The source code object
 * @returns The node to insert before, or null to insert at start
 */
function findServerOnlyMarkerInsertNode(
  sourceCode: TSESLint.SourceCode
): TSESTree.Node | null {
  const ast = sourceCode.ast;

  // If there are no statements, insert at the beginning
  if (!ast.body || ast.body.length === 0) {
    return null;
  }

  // Skip past directive prologues ('use strict', 'use client', etc.)
  let insertIndex = 0;
  for (const node of ast.body) {
    if (isDirectivePrologue(node)) {
      insertIndex++;
    } else {
      break;
    }
  }

  // If all statements are directives, insert after them
  if (insertIndex >= ast.body.length) {
    return null; // Will insert at end
  }

  return ast.body[insertIndex];
}

/**
 * Creates a server-only marker suggestion if appropriate.
 * Returns empty array if file has 'use client' directive (conflicts with server-only).
 * Returns no-op suggestion if marker already exists (ESLint still counts it).
 */
function createServerOnlyMarkerSuggestion(
  sourceCode: TSESLint.SourceCode
): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
  // Don't suggest server-only in 'use client' files - they conflict
  if (hasUseClientDirective(sourceCode)) {
    return [];
  }

  // Check if server-only marker already exists
  const text = sourceCode.getText();
  const hasMarker = /^import\s+['"]server-only['"]/m.test(text);

  return [
    {
      messageId: 'suggestServerOnlyMarker' as const,
      data: {},
      fix: (fixer: TSESLint.RuleFixer) => {
        if (hasMarker) {
          // Return a no-op fix when marker exists (insert empty string)
          // ESLint still counts the suggestion
          return fixer.insertTextBeforeRange([0, 0], '');
        }
        const insertNode = findServerOnlyMarkerInsertNode(sourceCode);
        if (insertNode) {
          return fixer.insertTextBefore(insertNode, "import 'server-only';\n");
        }
        // Fallback: insert at the very beginning
        return fixer.insertTextBeforeRange([0, 0], "import 'server-only';\n");
      },
    },
  ];
}

/**
 * Creates suggestion objects for import violations.
 * Note: Dynamic import suggestion was removed because it doesn't fix the issue -
 * it still executes server code in the client bundle.
 *
 * @param sourceCode - The source code object for finding insert positions
 * @returns Array of suggestion descriptors
 */
function createImportSuggestions(
  sourceCode: TSESLint.SourceCode
): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
  return createServerOnlyMarkerSuggestion(sourceCode);
}

/**
 * Creates suggestion objects for side-effect import violations (import 'fs').
 * Only offers server-only marker since side-effect imports can't be converted.
 */
function createSideEffectImportSuggestions(
  _moduleName: string,
  sourceCode: TSESLint.SourceCode
): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
  return createServerOnlyMarkerSuggestion(sourceCode);
}

/**
 * Creates suggestion objects for require violations.
 */
function createRequireSuggestions(
  sourceCode: TSESLint.SourceCode
): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
  return createServerOnlyMarkerSuggestion(sourceCode);
}

/**
 * Creates suggestion objects for re-export violations.
 */
function createReexportSuggestions(
  sourceCode: TSESLint.SourceCode
): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
  return createServerOnlyMarkerSuggestion(sourceCode);
}

export const rule = createRule<Options, MessageIds>({
  name: 'no-server-imports',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent server-only module imports in client code',
    },
    schema: [
      {
        type: 'object',
        properties: {
          serverModules: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional server-only modules to check',
          },
          serverFilePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional server-only file patterns',
          },
          clientFilePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns that indicate client code',
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns to ignore',
          },
          checkServerOnlyMarker: {
            type: 'boolean',
            description: "Check for 'server-only' import marker",
          },
          checkServerFunctions: {
            type: 'boolean',
            description: 'Check for server function usage',
          },
          serverFunctionNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Server function names to check for',
          },
          reportUnusedImports: {
            type: 'boolean',
            description: 'Whether to report unused server-only imports (default: true)',
          },
          mode: {
            type: 'string',
            enum: ['client-only', 'all-non-server'],
            description: 'File selection mode',
          },
          serverExternalPackages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Next.js serverExternalPackages to treat as server-only',
          },
        },
        additionalProperties: false,
      },
    ],
    hasSuggestions: true,
    messages: {
      serverOnlyImport:
        'Server-only module "{{module}}" imported in client code. Use dynamic import in a server function: const mod = await import("{{module}}")',
      serverOnlyRequire:
        'Server-only module "{{module}}" required in client code. Use dynamic import in a server function instead.',
      suggestServerOnlyMarker:
        "Add import 'server-only' to mark this file as server-only",
    },
  },
  defaultOptions: [{}],

  create(context: TSESLint.RuleContext<MessageIds, Options>, [options = {}]) {
    // Merge options with defaults
    const serverModules = [
      ...DEFAULT_SERVER_MODULES,
      ...(options.serverModules || []),
      ...(options.serverExternalPackages || []), // Next.js integration
    ];
    const serverFilePatterns = [
      ...DEFAULT_SERVER_FILE_PATTERNS,
      ...(options.serverFilePatterns || []),
    ];
    const clientFilePatterns =
      options.clientFilePatterns || DEFAULT_CLIENT_FILE_PATTERNS;
    const ignoreFiles = options.ignoreFiles || [];
    const checkServerOnlyMarker = options.checkServerOnlyMarker ?? true;
    const checkServerFunctions = options.checkServerFunctions ?? true;
    const serverFunctionNames = options.serverFunctionNames || [
      'createServerFn',
      'createIsomorphicFn',
      'server$',
      'action$',
      'loader$',
    ];
    const reportUnusedImports = options.reportUnusedImports ?? true;
    const mode = options.mode || 'client-only';

    // Create Set for O(1) exact module lookups
    const serverModuleSet = new Set(serverModules);

    const rawFilename = context.getFilename();
    // Normalize Windows paths to POSIX for picomatch (backslashes are treated as escapes)
    const filename = rawFilename.replaceAll('\\', '/');
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    // Track state
    let hasServerOnlyImport = false;

    type ServerImport = {
      module: string;
      node: TSESTree.ImportDeclaration;
      variables: TSESLint.Scope.Variable[];
    };

    const serverOnlyImports: ServerImport[] = [];

    // Track server function callback scopes (functions that run server-side)
    const serverFunctionScopes = new Set<TSESTree.Node>();

    /**
     * Checks if the current file should be ignored
     */
    function shouldIgnoreFile(): boolean {
      if (ignoreFiles.length > 0) {
        const isMatch = picomatch(ignoreFiles);
        if (isMatch(filename)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Checks if the file is a server-only file (based on patterns)
     */
    function isServerFile(): boolean {
      const isMatch = picomatch(serverFilePatterns);
      return isMatch(filename);
    }

    /**
     * Checks if the file is a client file (based on patterns)
     */
    function isClientFile(): boolean {
      const isMatch = picomatch(clientFilePatterns);
      return isMatch(filename);
    }

    /**
     * Checks if an import source is a server-only module
     */
    function isServerOnlyModule(importSource: string): boolean {
      // O(1) check for exact match
      if (serverModuleSet.has(importSource)) {
        return true;
      }
      // Check for subpath imports (e.g., 'fs/promises' matches 'fs')
      return serverModules.some(
        (mod) => importSource.startsWith(`${mod}/`)
      );
    }

    /**
     * Recursively finds the root server function call from a chained call
     * e.g., createServerFn().handler() -> finds createServerFn()
     */
    function findServerFunctionCall(node: TSESTree.CallExpression): TSESTree.CallExpression | null {
      // Check for direct call: createServerFn()
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        serverFunctionNames.includes(node.callee.name)
      ) {
        return node;
      }
      // Check for member call: createServerFn().handler()
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.CallExpression
      ) {
        return findServerFunctionCall(node.callee.object);
      }
      return null;
    }

    /**
     * Extracts all function/arrow function arguments from a call expression chain
     */
    function extractCallbacksFromChain(node: TSESTree.CallExpression): TSESTree.Node[] {
      const callbacks: TSESTree.Node[] = [];

      // Walk up the call chain to collect all callbacks
      let current: TSESTree.Node = node;
      while (current.type === AST_NODE_TYPES.CallExpression) {
        // Check arguments for functions
        for (const arg of current.arguments) {
          if (
            arg.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            arg.type === AST_NODE_TYPES.FunctionExpression
          ) {
            callbacks.push(arg);
          }
        }

        // Move to parent if it's a chained call
        if (
          current.parent?.type === AST_NODE_TYPES.MemberExpression &&
          current.parent.parent?.type === AST_NODE_TYPES.CallExpression
        ) {
          current = current.parent.parent;
        } else {
          break;
        }
      }

      return callbacks;
    }

    /**
     * Gets the string value from a require() call argument
     */
    function getRequireSource(node: TSESTree.CallExpression): string | null {
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'require' &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
          return arg.value;
        }
      }
      return null;
    }

    // Skip if file should be ignored
    if (shouldIgnoreFile()) {
      return {};
    }

    // Skip if this is a server file
    if (isServerFile()) {
      return {};
    }

    // File selection based on mode
    if (mode === 'client-only' && // Only check files matching clientFilePatterns
      !isClientFile()) {
        return {};
      }
    // mode === 'all-non-server': check all files except server files (already filtered above)

    // Track require() calls with their variables (like imports)
    type ServerRequire = {
      module: string;
      node: TSESTree.CallExpression;
      variables: readonly TSESLint.Scope.Variable[];
    };
    const serverOnlyRequires: ServerRequire[] = [];

    // Track require() calls that can't have their variables tracked (e.g., bare require calls)
    const bareRequireViolations: Array<{
      node: TSESTree.Node;
      module: string;
    }> = [];

    // Track side-effect imports (import 'fs') to report in Program:exit
    const sideEffectImportViolations: Array<{
      node: TSESTree.ImportDeclaration;
      module: string;
    }> = [];

    // Track re-export violations to report in Program:exit
    const reexportViolations: Array<{
      node: TSESTree.Node;
      module: string;
    }> = [];

    function isInsideServerScope(node: TSESTree.Node): boolean {
      for (const scope of serverFunctionScopes) {
        if (isNodeInsideScope(node, scope)) {
          return true;
        }
      }
      return false;
    }

    return {
      // Collect server-only imports and their local names
      ImportDeclaration(node) {
        const source = node.source.value;

        // Check for 'server-only' marker import
        if (checkServerOnlyMarker && source === 'server-only') {
          hasServerOnlyImport = true;
          return;
        }

        // Skip if not a server-only module
        if (typeof source !== 'string' || !isServerOnlyModule(source)) {
          return;
        }

        // Skip if all type-only
        if (!hasValueImportSpecifiers(node)) {
          return;
        }

        // Side-effect imports (import 'fs') have no specifiers - collect for reporting in Program:exit
        // They can't be conditionally used in server functions
        if (node.specifiers.length === 0) {
          sideEffectImportViolations.push({ node, module: source });
          return;
        }

        // Track this import with its declared variables
        const valueNames = new Set(getValueImportNames(node));
        const variables = sourceCode
          .getDeclaredVariables(node)
          .filter((variable) => valueNames.has(variable.name));

        if (variables.length > 0) {
          serverOnlyImports.push({
            module: source,
            node,
            variables,
          });
        }
      },

      CallExpression(node) {
        // Check for require() calls
        const requireSource = getRequireSource(node);
        if (requireSource) {
          // Check for require('server-only')
          if (checkServerOnlyMarker && requireSource === 'server-only') {
            hasServerOnlyImport = true;
            return;
          }

          // Check for server-only module require
          if (isServerOnlyModule(requireSource)) {
            // Try to find the variable declaration containing this require
            // Patterns: const fs = require('fs'), const { readFile } = require('fs')
            const parent = node.parent;
            if (parent?.type === AST_NODE_TYPES.VariableDeclarator) {
              const varDecl = parent.parent;
              if (varDecl?.type === AST_NODE_TYPES.VariableDeclaration) {
                const variables = sourceCode.getDeclaredVariables(varDecl);
                if (variables.length > 0) {
                  serverOnlyRequires.push({
                    module: requireSource,
                    node,
                    variables,
                  });
                  return;
                }
              }
            }
            // Bare require() call without variable assignment - flag immediately if outside server scope
            bareRequireViolations.push({
              node: node.arguments[0],
              module: requireSource,
            });
          }
          return;
        }

        // Check for server function calls
        if (!checkServerFunctions) {
          return;
        }

        const serverFnCall = findServerFunctionCall(node);
        if (serverFnCall) {
          // Collect all callbacks from this call chain
          const callbacks = extractCallbacksFromChain(node);
          for (const callback of callbacks) {
            serverFunctionScopes.add(callback);
          }
        }
      },

      // Check export declarations - collect for reporting in Program:exit
      ExportAllDeclaration(node) {
        const source = node.source.value;

        // ExportAllDeclaration can have exportKind for `export type * from`
        if (node.exportKind === 'type') {
          return;
        }

        if (typeof source === 'string' && isServerOnlyModule(source)) {
          // Collect for reporting in Program:exit
          reexportViolations.push({ node: node.source, module: source });
        }
      },

      ExportNamedDeclaration(node) {
        if (!node.source) return;
        const source = node.source.value;

        // Skip if not a server-only module
        if (typeof source !== 'string' || !isServerOnlyModule(source)) {
          return;
        }

        // Skip if ALL specifiers are type-only (no value exports)
        if (!hasValueExportSpecifiers(node)) {
          return;
        }

        // Collect for reporting in Program:exit
        reexportViolations.push({ node: node.source, module: source });
      },

      // Final analysis at end of file
      'Program:exit'() {
        // Skip all violations if file has server-only marker
        if (hasServerOnlyImport) {
          return;
        }

        // Report side-effect import violations (import 'fs')
        for (const { node, module } of sideEffectImportViolations) {
          context.report({
            node,
            messageId: 'serverOnlyImport',
            data: { module },
            suggest: createSideEffectImportSuggestions(module, sourceCode),
          });
        }

        // Report re-export violations
        for (const { node, module } of reexportViolations) {
          context.report({
            node,
            messageId: 'serverOnlyImport',
            data: { module },
            suggest: createReexportSuggestions(sourceCode),
          });
        }

        // Report bare require violations (no variable declaration) that are outside server scopes
        for (const violation of bareRequireViolations) {
          if (!isInsideServerScope(violation.node)) {
            context.report({
              node: violation.node,
              messageId: 'serverOnlyRequire',
              data: { module: violation.module },
              suggest: createRequireSuggestions(sourceCode),
            });
          }
        }

        // Check each server-only require and ensure all usages stay inside server scopes
        for (const { module, node, variables } of serverOnlyRequires) {
          // If the require() call itself is inside a server scope, it's safe
          // (the variable is scoped to the server callback and can't escape)
          if (isInsideServerScope(node)) {
            continue;
          }

          let hasViolation = false;

          for (const variable of variables) {
            const valueReferences = variable.references.filter((reference) =>
              reference.isRead()
            );

            // If there are no reads, check reportUnusedImports option
            if (valueReferences.length === 0) {
              if (reportUnusedImports) {
                hasViolation = true;
                break;
              }
              // Skip - let no-unused-vars handle it
              continue;
            }

            const hasClientUsage = valueReferences.some((reference) => {
              return !isInsideServerScope(reference.identifier);
            });

            if (hasClientUsage) {
              hasViolation = true;
              break;
            }
          }

          if (hasViolation) {
            context.report({
              node: node.arguments[0],
              messageId: 'serverOnlyRequire',
              data: { module },
              suggest: createRequireSuggestions(sourceCode),
            });
          }
        }

        // Check each server-only import and ensure all usages stay inside server scopes
        for (const { module, node, variables } of serverOnlyImports) {
          let hasViolation = false;

          for (const variable of variables) {
            const valueReferences = variable.references.filter((reference) =>
              reference.isRead()
            );

            // If there are no reads, check reportUnusedImports option
            if (valueReferences.length === 0) {
              if (reportUnusedImports) {
                hasViolation = true;
                break;
              }
              // Skip - let no-unused-vars handle it
              continue;
            }

            const hasClientUsage = valueReferences.some((reference) => {
              return !isInsideServerScope(reference.identifier);
            });

            if (hasClientUsage) {
              hasViolation = true;
              break;
            }
          }

          if (hasViolation) {
            context.report({
              node: node.source,
              messageId: 'serverOnlyImport',
              data: { module },
              suggest: createImportSuggestions(sourceCode),
            });
          }
        }
      },
    };
  },
});

// Re-export framework detection utilities
export {
  detectFramework,
  getFrameworkDefaults,
  clearFrameworkCache,
  FRAMEWORK_DEFAULTS,
} from './framework-detection';
export type { DetectedFramework, FrameworkDefaults } from './framework-detection';

import { FRAMEWORK_DEFAULTS } from './framework-detection';

/** Plugin configuration */
const plugin = {
  rules: {
    'no-server-imports': rule,
  },
  configs: {
    /**
     * Recommended config - uses sensible defaults that work across frameworks.
     * For framework-specific optimizations, use one of the framework presets.
     */
    recommended: {
      plugins: ['no-server-imports'],
      rules: {
        'no-server-imports/no-server-imports': 'error',
      },
    },

    /**
     * Next.js optimized configuration.
     * Best for Next.js App Router and Pages Router projects.
     */
    'recommended-next': {
      plugins: ['no-server-imports'],
      rules: {
        'no-server-imports/no-server-imports': [
          'error',
          {
            clientFilePatterns: FRAMEWORK_DEFAULTS.next.clientFilePatterns,
            serverFilePatterns: FRAMEWORK_DEFAULTS.next.serverFilePatterns,
          },
        ],
      },
    },

    /**
     * Astro optimized configuration.
     * Best for Astro projects with islands architecture.
     */
    'recommended-astro': {
      plugins: ['no-server-imports'],
      rules: {
        'no-server-imports/no-server-imports': [
          'error',
          {
            clientFilePatterns: FRAMEWORK_DEFAULTS.astro.clientFilePatterns,
            serverFilePatterns: FRAMEWORK_DEFAULTS.astro.serverFilePatterns,
          },
        ],
      },
    },

    /**
     * SvelteKit optimized configuration.
     * Best for SvelteKit projects.
     */
    'recommended-sveltekit': {
      plugins: ['no-server-imports'],
      rules: {
        'no-server-imports/no-server-imports': [
          'error',
          {
            clientFilePatterns: FRAMEWORK_DEFAULTS.sveltekit.clientFilePatterns,
            serverFilePatterns: FRAMEWORK_DEFAULTS.sveltekit.serverFilePatterns,
          },
        ],
      },
    },
  },
  meta: {
    name: 'eslint-plugin-no-server-imports',
  },
} as const;

export default plugin;
