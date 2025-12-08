#!/usr/bin/env node
/**
 * Test script to verify the ESLint rule works correctly across all example apps.
 * 
 * This script:
 * 1. Runs ESLint on each example app
 * 2. Verifies that bad examples produce errors
 * 3. Verifies that good examples and server files don't produce errors
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestCase {
  app: string;
  file: string;
  shouldError: boolean;
  description: string;
}

const testCases: TestCase[] = [
  // Next.js
  {
    app: 'nextjs-example',
    file: 'src/app/bad-example.tsx',
    shouldError: true,
    description: 'Next.js: bad-example.tsx should error (server imports in client)',
  },
  {
    app: 'nextjs-example',
    file: 'src/app/common-mistakes.tsx',
    shouldError: true,
    description: 'Next.js: common-mistakes.tsx should error (common mistake patterns)',
  },
  {
    app: 'nextjs-example',
    file: 'src/app/good-example.tsx',
    shouldError: false,
    description: 'Next.js: good-example.tsx should NOT error (type-only imports)',
  },
  {
    app: 'nextjs-example',
    file: 'src/app/server-action-example.tsx',
    shouldError: false,
    description: 'Next.js: server-action-example.tsx should NOT error (server actions pattern)',
  },
  {
    app: 'nextjs-example',
    file: 'src/app/database-example.tsx',
    shouldError: false,
    description: 'Next.js: database-example.tsx should NOT error (type imports + server actions)',
  },
  {
    app: 'nextjs-example',
    file: 'src/app/api/route.ts',
    shouldError: false,
    description: 'Next.js: api/route.ts should NOT error (server route)',
  },
  // Astro
  {
    app: 'astro-example',
    file: 'src/pages/bad-example.astro',
    shouldError: true,
    description: 'Astro: bad-example.astro should error (server imports in client)',
  },
  {
    app: 'astro-example',
    file: 'src/pages/good-example.astro',
    shouldError: false,
    description: 'Astro: good-example.astro should NOT error (type-only imports)',
  },
  {
    app: 'astro-example',
    file: 'src/pages/api/test.server.ts',
    shouldError: false,
    description: 'Astro: test.server.ts should NOT error (server file)',
  },
  // SvelteKit
  {
    app: 'sveltekit-example',
    file: 'src/routes/bad-example/+page.svelte',
    shouldError: true,
    description: 'SvelteKit: bad-example/+page.svelte should error (server imports in client)',
  },
  {
    app: 'sveltekit-example',
    file: 'src/routes/bad-page/+page.ts',
    shouldError: true,
    description: 'SvelteKit: bad-page/+page.ts should error (server imports in universal load)',
  },
  {
    app: 'sveltekit-example',
    file: 'src/routes/good-example/+page.svelte',
    shouldError: false,
    description: 'SvelteKit: good-example/+page.svelte should NOT error (type-only imports)',
  },
  {
    app: 'sveltekit-example',
    file: 'src/routes/api/test/+server.ts',
    shouldError: false,
    description: 'SvelteKit: api/test/+server.ts should NOT error (server route)',
  },
];

interface TestResult {
  testCase: TestCase;
  passed: boolean;
  error?: string;
  eslintOutput?: string;
}

interface ESLintResult {
  filePath: string;
  messages: Array<{
    ruleId: string;
    severity: number;
    message: string;
  }>;
}

function runESLintOnApp(appName: string): ESLintResult[] {
  const appPath = join('apps', appName);
  
  try {
    // Run ESLint with JSON output format
    // Use --max-warnings 0 to ensure we get all errors
    const output = execSync(`pnpm --filter ${appName} lint --format json --max-warnings 0`, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    // ESLint JSON output is an array of results
    const results: ESLintResult[] = JSON.parse(output.trim());
    return results;
  } catch (error: any) {
    // ESLint returns non-zero exit code when there are errors
    // Try to parse the output anyway
    try {
      const output = (error.stdout || error.stderr || '').toString();
      
      // Try to extract JSON from output (might be mixed with other output)
      // Look for JSON array pattern
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const results: ESLintResult[] = JSON.parse(jsonMatch[0]);
        return results;
      }
      
      // If no JSON found, try to parse the whole output
      const results: ESLintResult[] = JSON.parse(output.trim());
      return results;
    } catch (parseError) {
      // If parsing fails completely, return empty array
      // This might happen if ESLint isn't configured properly
      console.warn(`Warning: Could not parse ESLint output for ${appName}`);
      return [];
    }
  }
}

function checkFileHasErrors(appName: string, filePath: string): boolean {
  const results = runESLintOnApp(appName);
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Find results for this specific file
  // ESLint returns absolute paths, so we need to check if the path ends with our file
  const fileResult = results.find((r) => {
    const normalizedResultPath = r.filePath.replace(/\\/g, '/');
    return normalizedResultPath.endsWith(normalizedPath) || normalizedResultPath.includes(normalizedPath);
  });
  
  if (!fileResult) {
    // File not linted (might be ignored or not exist)
    // Check if file actually exists
    const fullPath = join(process.cwd(), 'apps', appName, filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    return false;
  }
  
  // Check if there are any errors from our rule (severity 2 = error)
  const hasRuleError = fileResult.messages.some(
    (msg) => msg.ruleId === 'no-server-imports/no-server-imports' && msg.severity === 2
  );
  
  return hasRuleError;
}

function runTest(testCase: TestCase): TestResult {
  const filePath = testCase.file;
  
  try {
    const hasErrors = checkFileHasErrors(testCase.app, filePath);
    const passed = hasErrors === testCase.shouldError;
    
    return {
      testCase,
      passed,
      error: passed
        ? undefined
        : `Expected ${testCase.shouldError ? 'errors' : 'no errors'}, but got ${hasErrors ? 'errors' : 'no errors'}`,
    };
  } catch (error: any) {
    return {
      testCase,
      passed: false,
      error: error.message,
    };
  }
}

function main() {
  console.log('🧪 Testing ESLint rule across example apps...\n');
  console.log('Note: This will run ESLint on each app. Make sure dependencies are installed.\n');
  
  // Check if plugin is built
  const pluginDist = join('packages', 'eslint-plugin-no-server-imports', 'dist');
  if (!existsSync(pluginDist)) {
    console.error('❌ Plugin not built. Run "pnpm build" first.');
    process.exit(1);
  }
  
  const results: TestResult[] = [];
  
  // Group tests by app to run ESLint once per app
  const apps = new Set(testCases.map((tc) => tc.app));
  console.log(`Running ESLint on ${apps.size} apps...\n`);
  
  // Group test cases by app to optimize ESLint runs
  const testsByApp = new Map<string, TestCase[]>();
  for (const testCase of testCases) {
    if (!testsByApp.has(testCase.app)) {
      testsByApp.set(testCase.app, []);
    }
    testsByApp.get(testCase.app)!.push(testCase);
  }
  
  // Run tests grouped by app
  for (const [appName, appTests] of testsByApp) {
    console.log(`\n📦 Testing ${appName}...`);
    for (const testCase of appTests) {
      process.stdout.write(`  ${testCase.file}... `);
      const result = runTest(testCase);
      results.push(result);
      
      if (result.passed) {
        console.log('✅ PASS');
      } else {
        console.log('❌ FAIL');
        if (result.error) {
          console.log(`     ${result.error}`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));
  
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.testCase.description}`);
        if (r.error) {
          console.log(`    ${r.error}`);
        }
      });
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main();

