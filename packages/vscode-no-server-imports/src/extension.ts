/**
 * VS Code Extension: No Server Imports
 * =====================================
 * Enhances the ESLint experience for the no-server-imports rule.
 *
 * Features:
 * - Status bar indicator showing detected framework
 * - Commands to check status and open documentation
 * - Works alongside the ESLint VS Code extension
 * - Multi-workspace support
 * - Structured logging
 */

import * as vscode from 'vscode';
import { existsSync, readFileSync, statSync } from 'fs';
import * as path from 'path';

// ============================================================================
// Framework Detection (self-contained to keep extension bundle small)
// ============================================================================

type DetectedFramework = 'next' | 'astro' | 'sveltekit' | 'unknown';

// Cache for framework detection results
let cachedFramework: DetectedFramework | null = null;
let cachedProjectRoot: string | null = null;

function isDirectory(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function findProjectRoot(startDir: string): string | null {
  let current = startDir;
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

function configExists(dir: string, baseName: string): boolean {
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.mts'];
  return extensions.some(ext => existsSync(path.join(dir, `${baseName}${ext}`)));
}

function detectFramework(filePath?: string): DetectedFramework {
  let startDir: string;
  if (!filePath) {
    startDir = process.cwd();
  } else if (isDirectory(filePath)) {
    startDir = filePath;
  } else {
    startDir = path.dirname(filePath);
  }
  const projectRoot = findProjectRoot(startDir) || process.cwd();

  if (cachedProjectRoot === projectRoot && cachedFramework !== null) {
    return cachedFramework;
  }

  // Check config files first
  if (configExists(projectRoot, 'next.config')) {
    cachedFramework = 'next';
  } else if (configExists(projectRoot, 'svelte.config')) {
    cachedFramework = 'sveltekit';
  } else if (configExists(projectRoot, 'astro.config')) {
    cachedFramework = 'astro';
  } else {
    // Fall back to package.json
    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['next']) cachedFramework = 'next';
        else if (deps['@sveltejs/kit']) cachedFramework = 'sveltekit';
        else if (deps['astro']) cachedFramework = 'astro';
        else cachedFramework = 'unknown';
      } else {
        cachedFramework = 'unknown';
      }
    } catch {
      cachedFramework = 'unknown';
    }
  }

  cachedProjectRoot = projectRoot;
  return cachedFramework;
}

function clearFrameworkCache(): void {
  cachedFramework = null;
  cachedProjectRoot = null;
}

/**
 * Framework information for display in the UI
 */
interface FrameworkInfo {
  name: string;
  icon: string;
  docUrl: string;
}

/**
 * Framework metadata for UI display
 */
const FRAMEWORK_INFO: Record<DetectedFramework, FrameworkInfo> = {
  next: {
    name: 'Next.js',
    // Using 'symbol-event' - valid Codicon for Next.js (event-driven framework)
    icon: '$(symbol-event)',
    docUrl: 'https://github.com/jagreehal/eslint-plugin-no-server-imports#nextjs',
  },
  astro: {
    name: 'Astro',
    // Using 'star' - valid Codicon, represents Astro's star logo
    icon: '$(star)',
    docUrl: 'https://github.com/jagreehal/eslint-plugin-no-server-imports#astro',
  },
  sveltekit: {
    name: 'SvelteKit',
    // Using 'symbol-color' - valid Codicon for SvelteKit (colorful framework)
    icon: '$(symbol-color)',
    docUrl: 'https://github.com/jagreehal/eslint-plugin-no-server-imports#sveltekit',
  },
  unknown: {
    name: 'Unknown',
    // Using 'question' - valid Codicon for unknown/undetected framework
    icon: '$(question)',
    docUrl: 'https://github.com/jagreehal/eslint-plugin-no-server-imports#readme',
  },
};

/**
 * Logging utility with levels
 */
class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('No Server Imports');
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('DEBUG', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('INFO', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('WARN', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    this.log('ERROR', message, ...args);
  }

  /**
   * Internal logging method
   */
  private log(level: string, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    this.outputChannel.appendLine(formattedMessage);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose of the logger
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

const logger = new Logger();

// Status bar items per workspace folder
const statusBarItems = new Map<string, vscode.StatusBarItem>();
const frameworkCache = new Map<string, DetectedFramework>();

/**
 * Detects the framework for a given workspace folder
 * Uses the shared framework detection from eslint-plugin-no-server-imports
 *
 * @param workspaceFolder - The workspace folder to detect framework for
 * @returns The detected framework
 */
function detectFrameworkForWorkspace(
  workspaceFolder: vscode.WorkspaceFolder
): DetectedFramework {
  const folderPath = workspaceFolder.uri.fsPath;

  // Return cached result if available
  if (frameworkCache.has(folderPath)) {
    return frameworkCache.get(folderPath)!;
  }

  let framework: DetectedFramework = 'unknown';

  try {
    // Use shared framework detection - it takes a file path, so we use the folder path
    // The function will walk up from there to find the project root
    // Handle edge cases: symlinks, network drives, permission errors
    framework = detectFramework(folderPath);
    
    logger.debug(`Detected framework "${framework}" for workspace: ${folderPath}`);
  } catch (error) {
    // Handle various error types gracefully
    if (error instanceof Error) {
      // Permission errors, network errors, etc.
      if (error.message.includes('EACCES') || error.message.includes('permission')) {
        logger.warn('Permission denied during framework detection', error.message);
      } else if (error.message.includes('ENOENT')) {
        logger.debug('File not found during framework detection (expected for some paths)');
      } else {
        logger.warn('Framework detection failed', error.message);
      }
    } else {
      logger.warn('Framework detection failed with unknown error', error);
    }
    framework = 'unknown';
  }

  // Cache the result
  frameworkCache.set(folderPath, framework);

  return framework;
}

/**
 * Updates the status bar item for a specific workspace folder
 *
 * @param workspaceFolder - The workspace folder to update status bar for
 */
function updateStatusBarForWorkspace(workspaceFolder: vscode.WorkspaceFolder): void {
  const folderPath = workspaceFolder.uri.fsPath;
  let statusBarItem = statusBarItems.get(folderPath);

  if (!statusBarItem) {
    // Create new status bar item for this workspace
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      90
    );
    statusBarItems.set(folderPath, statusBarItem);
  }

  const framework = detectFrameworkForWorkspace(workspaceFolder);
  const info = FRAMEWORK_INFO[framework];

  // For multi-workspace, show folder name if more than one
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const folderName =
    workspaceFolders && workspaceFolders.length > 1
      ? ` ${workspaceFolder.name}`
      : '';

  statusBarItem.text = `${info.icon} ${info.name}${folderName}`;
  statusBarItem.tooltip = `No Server Imports: ${info.name} detected${folderName ? ` in ${workspaceFolder.name}` : ''}\nClick to show status`;
  statusBarItem.command = 'noServerImports.showStatus';

  const config = vscode.workspace.getConfiguration('noServerImports', workspaceFolder.uri);
  if (config.get('showStatusBarItem', true)) {
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

/**
 * Updates all status bar items for all workspace folders
 */
function updateAllStatusBars(): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  for (const folder of workspaceFolders) {
    updateStatusBarForWorkspace(folder);
  }
}

/**
 * Shows a status message with framework info for the active workspace
 */
async function showStatus(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    await vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  // Use the first workspace folder, or the one containing the active editor
  let activeFolder = workspaceFolders[0];
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const activeFileUri = activeEditor.document.uri;
    const folder = vscode.workspace.getWorkspaceFolder(activeFileUri);
    if (folder) {
      activeFolder = folder;
    }
  }

  const framework = detectFrameworkForWorkspace(activeFolder);
  const info = FRAMEWORK_INFO[framework];

  const folderName =
    workspaceFolders.length > 1 ? ` in ${activeFolder.name}` : '';

  const selection = await vscode.window.showInformationMessage(
    `No Server Imports: ${info.name} framework detected${folderName}`,
    'Open Documentation',
    'View ESLint Config',
    'Show Logs'
  );

  if (selection === 'Open Documentation') {
    vscode.env.openExternal(vscode.Uri.parse(info.docUrl));
  } else if (selection === 'View ESLint Config') {
    // Try to find and open eslint config in the active workspace
    const eslintConfigs = await vscode.workspace.findFiles(
      new vscode.RelativePattern(activeFolder, '**/eslint.config.{js,mjs,cjs,ts}'),
      '**/node_modules/**',
      1
    );

    if (eslintConfigs.length > 0) {
      const doc = await vscode.workspace.openTextDocument(eslintConfigs[0]);
      await vscode.window.showTextDocument(doc);
    } else {
      await vscode.window.showWarningMessage(
        'No ESLint config found. Create eslint.config.js to configure the rule.'
      );
    }
  } else if (selection === 'Show Logs') {
    logger.show();
  }
}

/**
 * Opens the documentation for the active workspace
 */
function openDocs(): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  // Use the first workspace folder, or the one containing the active editor
  let activeFolder = workspaceFolders[0];
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const activeFileUri = activeEditor.document.uri;
    const folder = vscode.workspace.getWorkspaceFolder(activeFileUri);
    if (folder) {
      activeFolder = folder;
    }
  }

  const framework = detectFrameworkForWorkspace(activeFolder);
  const info = FRAMEWORK_INFO[framework];
  vscode.env.openExternal(vscode.Uri.parse(info.docUrl));
}

/**
 * Activates the extension
 *
 * @param context - The extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  logger.info('No Server Imports extension activated');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('noServerImports.showStatus', showStatus)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('noServerImports.detectFramework', () => {
      // Clear cache to force re-detection
      clearFrameworkCache();
      frameworkCache.clear();
      updateAllStatusBars();
      showStatus();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('noServerImports.openDocs', openDocs)
  );

  // Update status bar on workspace change
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      logger.debug('Workspace folders changed', { added: e.added.length, removed: e.removed.length });

      // Remove status bar items for removed folders
      for (const folder of e.removed) {
        const statusBarItem = statusBarItems.get(folder.uri.fsPath);
        if (statusBarItem) {
          statusBarItem.dispose();
          statusBarItems.delete(folder.uri.fsPath);
        }
        frameworkCache.delete(folder.uri.fsPath);
      }

      // Clear cache and update for all folders
      clearFrameworkCache();
      updateAllStatusBars();
    })
  );

  // Update on configuration change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('noServerImports')) {
        logger.debug('Configuration changed');
        // Clear cache if relevant config changed
        clearFrameworkCache();
        frameworkCache.clear();
        updateAllStatusBars();
      }
    })
  );

  // Initial update
  updateAllStatusBars();
}

/**
 * Deactivates the extension
 */
export function deactivate(): void {
  logger.info('No Server Imports extension deactivated');

  // Clear cache
  clearFrameworkCache();
  frameworkCache.clear();

  // Dispose all status bar items
  for (const statusBarItem of statusBarItems.values()) {
    statusBarItem.dispose();
  }
  statusBarItems.clear();

  // Dispose logger
  logger.dispose();
}
