import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectFramework,
  getFrameworkDefaults,
  clearFrameworkCache,
  FRAMEWORK_DEFAULTS,
} from './framework-detection';

describe('framework-detection', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = path.join(tmpdir(), `eslint-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    clearFrameworkCache();
  });

  afterEach(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
    clearFrameworkCache();
  });

  describe('detectFramework', () => {
    it('detects Next.js from next.config.js', () => {
      writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const result = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result).toBe('next');
    });

    it('detects Next.js from next.config.ts', () => {
      writeFileSync(path.join(tempDir, 'next.config.ts'), 'export default {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const result = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result).toBe('next');
    });

    it('detects Next.js from next.config.mjs', () => {
      writeFileSync(path.join(tempDir, 'next.config.mjs'), 'export default {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const result = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result).toBe('next');
    });

    it('detects Astro from astro.config.mjs', () => {
      writeFileSync(path.join(tempDir, 'astro.config.mjs'), 'export default {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const result = detectFramework(path.join(tempDir, 'src/pages/index.astro'));
      expect(result).toBe('astro');
    });

    it('detects SvelteKit from svelte.config.js', () => {
      writeFileSync(path.join(tempDir, 'svelte.config.js'), 'module.exports = {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const result = detectFramework(path.join(tempDir, 'src/routes/+page.svelte'));
      expect(result).toBe('sveltekit');
    });

    it('detects Next.js from package.json dependencies', () => {
      writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0', react: '^18.0.0' },
        })
      );

      const result = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result).toBe('next');
    });

    it('detects Astro from package.json dependencies', () => {
      writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { astro: '^4.0.0' },
        })
      );

      const result = detectFramework(path.join(tempDir, 'src/pages/index.astro'));
      expect(result).toBe('astro');
    });

    it('detects SvelteKit from package.json devDependencies', () => {
      writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { '@sveltejs/kit': '^2.0.0' },
        })
      );

      const result = detectFramework(path.join(tempDir, 'src/routes/+page.svelte'));
      expect(result).toBe('sveltekit');
    });

    it('returns unknown when no framework detected', () => {
      writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { react: '^18.0.0' },
        })
      );

      const result = detectFramework(path.join(tempDir, 'src/app.tsx'));
      expect(result).toBe('unknown');
    });

    it('prefers config file over package.json', () => {
      // Create Next.js config but Astro in package.json
      writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { astro: '^4.0.0' },
        })
      );

      const result = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result).toBe('next');
    });

    it('caches detection results', () => {
      writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      // First call
      const result1 = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result1).toBe('next');

      // Remove the config file
      rmSync(path.join(tempDir, 'next.config.js'));

      // Second call should still return cached result
      const result2 = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result2).toBe('next');

      // After clearing cache, should return unknown
      clearFrameworkCache();
      const result3 = detectFramework(path.join(tempDir, 'src/page.tsx'));
      expect(result3).toBe('unknown');
    });
  });

  describe('getFrameworkDefaults', () => {
    it('returns Next.js defaults for Next.js projects', () => {
      writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const defaults = getFrameworkDefaults(path.join(tempDir, 'src/page.tsx'));
      expect(defaults).toEqual(FRAMEWORK_DEFAULTS.next);
    });

    it('returns Astro defaults for Astro projects', () => {
      writeFileSync(path.join(tempDir, 'astro.config.mjs'), 'export default {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const defaults = getFrameworkDefaults(path.join(tempDir, 'src/pages/index.astro'));
      expect(defaults).toEqual(FRAMEWORK_DEFAULTS.astro);
    });

    it('returns SvelteKit defaults for SvelteKit projects', () => {
      writeFileSync(path.join(tempDir, 'svelte.config.js'), 'module.exports = {}');
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const defaults = getFrameworkDefaults(path.join(tempDir, 'src/routes/+page.svelte'));
      expect(defaults).toEqual(FRAMEWORK_DEFAULTS.sveltekit);
    });

    it('returns unknown defaults for unknown projects', () => {
      writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const defaults = getFrameworkDefaults(path.join(tempDir, 'src/app.tsx'));
      expect(defaults).toEqual(FRAMEWORK_DEFAULTS.unknown);
    });
  });

  describe('FRAMEWORK_DEFAULTS', () => {
    it('has client and server patterns for Next.js', () => {
      expect(FRAMEWORK_DEFAULTS.next.clientFilePatterns).toContain('**/app/**');
      expect(FRAMEWORK_DEFAULTS.next.clientFilePatterns).toContain('**/pages/**');
      expect(FRAMEWORK_DEFAULTS.next.serverFilePatterns).toContain('**/api/**');
    });

    it('has client and server patterns for Astro', () => {
      expect(FRAMEWORK_DEFAULTS.astro.clientFilePatterns).toContain('**/src/pages/**');
      expect(FRAMEWORK_DEFAULTS.astro.clientFilePatterns).toContain('**/src/islands/**');
      expect(FRAMEWORK_DEFAULTS.astro.serverFilePatterns).toContain('**/*.server.ts');
    });

    it('has client and server patterns for SvelteKit', () => {
      expect(FRAMEWORK_DEFAULTS.sveltekit.clientFilePatterns).toContain('**/src/routes/**');
      expect(FRAMEWORK_DEFAULTS.sveltekit.serverFilePatterns).toContain('**/+server.ts');
    });

    it('has fallback patterns for unknown', () => {
      expect(FRAMEWORK_DEFAULTS.unknown.clientFilePatterns.length).toBeGreaterThan(0);
      expect(FRAMEWORK_DEFAULTS.unknown.serverFilePatterns.length).toBeGreaterThan(0);
    });
  });
});
