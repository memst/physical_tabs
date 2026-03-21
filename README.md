# Physical Tabs

Physical Tabs is a Chrome extension for saving, restoring, and organizing browser tabs and windows.

## What It Does

- Save open tabs to a file
- Restore tabs from a saved file
- Keep backups in a user-selected local folder
- Organize windows into named workspaces
- View and manage open windows and tabs
- Import a list of URLs and open them in a new window

## Tech Stack

- Svelte
- TypeScript
- Vite
- Chrome Extension Manifest V3

## Development

Install dependencies:

```bash
pnpm install
```

Build the extension:

```bash
pnpm build
```

For local development with rebuilds on file changes:

```bash
pnpm dev:watch
```

## Load In Chrome

1. Run `pnpm build` or `pnpm dev:watch`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Click Load unpacked
5. Select the `dist/` folder

## Project Structure

- `src/popup/`: extension popup UI
- `src/tabs/`: tabs page
- `src/workspace/`: workspace page
- `src/preferences/`: preferences UI
- `src/lib/`: shared logic and storage helpers
