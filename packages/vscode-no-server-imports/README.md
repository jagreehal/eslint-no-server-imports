# No Server Imports – VS Code Extension

Think of this extension as the friendly status light for `eslint-plugin-no-server-imports`. It sits in your VS Code status bar, figures out which framework you're working in, and gives you one-click shortcuts to the docs or detection commands - so you know why the ESLint rule is yelling before you even open the Problems tab.

## TL;DR

```bash
code --install-extension jagreehal.vscode-no-server-imports
```

Status bar shows your framework (Next.js/Astro/SvelteKit). Commands give quick access to docs and detection. Works with the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) to surface violations instantly.

## What it does

- **Framework detection** - Sniffs your repo for `next.config`, `astro.config`, or `svelte.config` (plus package.json fallbacks) and shows the result in the status bar
- **Multi-root aware** - Every workspace folder tracks its own framework and indicator
- **Handy commands** - Re-run detection, peek at the current status, or jump straight to the plugin docs
- **Respectful sidekick** - Relies on the official ESLint extension to surface actual lint errors; this just adds context so you're never guessing

## Requirements

You still need the heavy lifters:

1. [ESLint for VS Code](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
2. `eslint-plugin-no-server-imports` configured in your project (`eslint.config.*` or `.eslintrc.*`)

Without those two, this extension can't do much besides tell you which framework it detected.

## Installation

### Marketplace

Open the Extensions panel and search for **"No Server Imports"**. Click install, reload if prompted, done.

### Local VSIX

1. Build or download `vscode-no-server-imports-1.0.0.vsix`
2. Install it: `code --install-extension vscode-no-server-imports-1.0.0.vsix`

Great for testing local tweaks (`pnpm run package` from this folder will emit the VSIX).

## Commands

All commands are prefixed with "No Server Imports" in the Command Palette (`⇧⌘P` / `Ctrl+Shift+P`):

- **Show Status** - Pops a quick info box with the detected framework, relevant globs, and doc links
- **Detect Framework** - Forces a re-scan (helpful after adding config files or switching branches)
- **Open Documentation** - Launches the plugin docs in your default browser, scoped to the detected framework when possible

## Configuration

| Setting | Default | What it does |
| --- | --- | --- |
| `noServerImports.showStatusBarItem` | `true` | Hide the status bar indicator if you prefer a cleaner UI. Commands still work. |

## Supported Frameworks

- **Next.js** - App Router or Pages Router
- **Astro** - Islands, hybrid routes, all the things
- **SvelteKit** - `+page`, `+server`, and friends
- Anything else falls back to "Unknown" so you know detection didn't find a match

## How it fits with ESLint

1. ESLint (with `eslint-plugin-no-server-imports`) reports the actual violations
2. This extension watches for files/configs to deduce which framework you're in
3. The status bar shows "Next.js", "Astro", "SvelteKit", or "Unknown" with a tappable icon
4. When the ESLint rule fires, you already know which preset/globs it's using - and the commands give you a shortcut to dive deeper

No background linting, no replacement for ESLint - just clarity.

## Related links

- [`eslint-plugin-no-server-imports`](https://github.com/jagreehal/eslint-plugin-no-server-imports) - the rule itself
- [ESLint VS Code extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) - required for lint results

## License

MIT
