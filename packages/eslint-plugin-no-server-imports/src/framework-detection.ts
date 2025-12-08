/**
 * Framework Auto-Detection
 * ========================
 * Automatically detects the frontend framework being used and provides
 * optimal default configurations for the no-server-imports rule.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export type DetectedFramework = 'next' | 'astro' | 'sveltekit' | 'unknown';

export interface FrameworkDefaults {
  clientFilePatterns: string[];
  serverFilePatterns: string[];
}

/**
 * Framework-specific default configurations
 */
export const FRAMEWORK_DEFAULTS: Record<DetectedFramework, FrameworkDefaults> = {
  next: {
    clientFilePatterns: [
      '**/app/**',
      '**/src/app/**',
      '**/pages/**',
      '**/components/**',
    ],
    serverFilePatterns: [
      '**/*.server.ts',
      '**/*.server.tsx',
      '**/api/**',
      '**/server/**',
      '**/actions/**',
    ],
  },
  astro: {
    clientFilePatterns: [
      '**/src/pages/**',
      '**/src/components/**',
      '**/src/islands/**',
    ],
    serverFilePatterns: [
      '**/*.server.ts',
      '**/*.server.tsx',
      '**/server/**',
      '**/api/**/*.ts',
    ],
  },
  sveltekit: {
    clientFilePatterns: [
      '**/src/routes/**',
      '**/src/lib/components/**',
    ],
    serverFilePatterns: [
      '**/*.server.ts',
      '**/*.server.js',
      '**/+server.ts',
      '**/+server.js',
      '**/+page.server.ts',
      '**/+layout.server.ts',
    ],
  },
  unknown: {
    clientFilePatterns: [
      '**/routes/**',
      '**/pages/**',
      '**/components/**',
      '**/islands/**',
      '**/src/app/**',
    ],
    serverFilePatterns: [
      '**/*.server.ts',
      '**/*.server.tsx',
      '**/*.server.js',
      '**/server/**',
      '**/api/**',
      '**/_server/**',
    ],
  },
};

/**
 * Finds the root directory of the project by looking for package.json
 */
function findProjectRoot(startDir: string): string | null {
  let current = startDir;

  // Walk up the directory tree looking for package.json
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Checks if a config file exists with any common extension
 */
function configExists(dir: string, baseName: string): boolean {
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.mts'];
  return extensions.some(ext => existsSync(path.join(dir, `${baseName}${ext}`)));
}

/**
 * Package.json structure for dependency checking
 */
interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Reads package.json and checks for framework dependencies
 */
function checkPackageJsonDependencies(projectRoot: string): DetectedFramework {
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return 'unknown';
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(content) as PackageJson;
    const allDeps: Record<string, string> = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Check for framework dependencies (in order of specificity)
    if (allDeps['next']) {
      return 'next';
    }
    if (allDeps['@sveltejs/kit']) {
      return 'sveltekit';
    }
    if (allDeps['astro']) {
      return 'astro';
    }
  } catch {
    // Ignore parse errors
  }

  return 'unknown';
}

/**
 * Detects the framework by checking config files
 */
function checkConfigFiles(projectRoot: string): DetectedFramework {
  // Check for framework-specific config files (most reliable)
  if (configExists(projectRoot, 'next.config')) {
    return 'next';
  }
  if (configExists(projectRoot, 'svelte.config')) {
    return 'sveltekit';
  }
  if (configExists(projectRoot, 'astro.config')) {
    return 'astro';
  }

  return 'unknown';
}

// Cache the detection result to avoid repeated file system checks
let cachedFramework: DetectedFramework | null = null;
let cachedProjectRoot: string | null = null;

/**
 * Determines if a path is a directory
 */
function isDirectory(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Detects the framework being used in the project.
 *
 * Detection priority:
 * 1. Config files (most reliable): next.config.*, astro.config.*, svelte.config.*
 * 2. Package.json dependencies: "next", "astro", "@sveltejs/kit"
 *
 * @param filePath - Path to a file or directory in the project (used to find project root)
 * @returns The detected framework or 'unknown'
 */
export function detectFramework(filePath?: string): DetectedFramework {
  // Try to find project root from the file path or cwd
  // If filePath is a directory, use it directly; if it's a file, use its parent
  let startDir: string;
  if (!filePath) {
    startDir = process.cwd();
  } else if (isDirectory(filePath)) {
    startDir = filePath;
  } else {
    startDir = path.dirname(filePath);
  }
  const projectRoot = findProjectRoot(startDir) || process.cwd();

  // Return cached result if same project
  if (cachedProjectRoot === projectRoot && cachedFramework !== null) {
    return cachedFramework;
  }

  // Try config files first (most reliable)
  let framework = checkConfigFiles(projectRoot);

  // Fall back to package.json
  if (framework === 'unknown') {
    framework = checkPackageJsonDependencies(projectRoot);
  }

  // Cache the result
  cachedProjectRoot = projectRoot;
  cachedFramework = framework;

  return framework;
}

/**
 * Gets the default configuration for the detected framework.
 *
 * @param filePath - Path to a file in the project (used for detection)
 * @returns Framework-specific defaults
 */
export function getFrameworkDefaults(filePath?: string): FrameworkDefaults {
  const framework = detectFramework(filePath);
  return FRAMEWORK_DEFAULTS[framework];
}

/**
 * Clears the cached framework detection (useful for testing)
 */
export function clearFrameworkCache(): void {
  cachedFramework = null;
  cachedProjectRoot = null;
}
