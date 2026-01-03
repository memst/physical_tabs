# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome Manifest V3 extension for managing browser tabs and workspaces. Users can save/restore tabs to JSON files, create named workspaces, and organize multiple windows with persistent tracking.

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript to JavaScript (one-time)
pnpm build

# Watch mode for development (auto-recompile on changes)
pnpm watch
```

After building, load the extension in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this repository directory

## Code Architecture

### TypeScript Module System

- **Source**: `ts/` directory contains TypeScript source files
- **Output**: `dist/` directory contains compiled ES modules (gitignored)
- **Critical import pattern**: All imports use `.js` extension (e.g., `import { foo } from './bar.js'`) even though source files are `.ts`. This is required for ES modules to work in the browser after compilation.
- **Module loading**: All HTML pages use `<script type="module">` to handle ES module `export` statements
- **TypeScript config**: Target ES2024, ESNext modules, strict mode enabled

### Entry Points

1. **popup.html** → `dist/popup.js` - Main extension popup with save/restore/workspace buttons
2. **tabs.html** → `dist/tabs.js` - Full-page tab manager (refreshes every 5 seconds)
3. **workspace.html** → `dist/workspace.js` - Pinned tab in workspace windows, loaded with `?id=<workspaceId>` parameter

### Core Modules

**workspaceStorage.ts** - Central storage management
- Interfaces: `Workspace`, `WorkspaceStorage`
- Uses TypeScript branded types pattern: `type WorkspaceId = Distinct<string, 'WorkspaceId'>`
- Key functions:
  - `getWorkspaces()` - Retrieves all workspaces from chrome.storage.local
  - `createWorkspace()` - Generates unique ID (`ws_<timestamp>_<random>`)
  - `getWindowWorkspace(window)` - Scans pinned tabs for workspace.html URLs
  - `refreshWorkspaceStorage()` - Rebuilds window associations from scratch
  - `deleteEmptyWorkspaces()` - Removes workspaces with no active windows

**workspaceSection.ts** - Shared UI component
- Exports `createWorkspacesSection(redrawCallback)`
- Creates DOM elements for workspace list with management controls
- Used by both tabs.html and workspace.html for consistency

**popup.ts** - Main extension logic
- Tab save/restore with JSON file download/upload
- Workspace creation in new or current window
- Filename sanitization for saved tabs

**tabs.ts** - Tab manager page
- Displays all windows and tabs with favicons
- Workspace overview and management
- Runs `cleanupInactiveWindows()` on load to remove closed window references

**workspace.ts** - Workspace window page
- Registers current window with workspace on load
- Editable workspace naming with persistence
- Displays workspace metadata

## Key Features & Implementation

### Tab Saving and Restoration

**Save Current Window**:
- Filters out extension tabs (hardcoded extension ID check in popup.ts:9)
- Converts to `[title, url]` pairs in JSON format
- Downloads file, then closes saved tabs only after download completes
- Uses download listener pattern to prevent data loss if cancelled

**Filename Sanitization** (popup.ts:50-59):
```javascript
// Lowercase, replace non-alphanumeric with underscores
name = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
// Enforce tabs_ prefix and .json suffix
if (!name.startsWith('tabs_')) name = `tabs_${name}`;
if (!name.endsWith('.json')) name = `${name}.json`;
```

**Restore Tabs**:
- Parses JSON file and creates tabs from URLs
- Validates array structure before creating tabs

**Append Mode**:
- Merges uploaded tabs with current window tabs before saving
- Handles both `[title, url]` and plain URL string formats

### Workspace Management

**Workspace Creation**:
- Generates unique IDs: `ws_<timestamp>_<random>`
- Stores metadata in chrome.storage.local: `{created, lastAccessed, name, workspaceId, windows: []}`
- Each workspace tracks associated window IDs array

**Window Tracking**:
- Windows associate with workspaces by having a pinned `workspace.html?id=<workspaceId>` tab
- When workspace.html loads, it reads ID from URL params and adds current window ID to workspace.windows array
- Workspace tabs are always pinned at index 0 (leftmost position)

**Workspace Naming**:
- Editable via input field in workspace.html
- Saves on button click or Enter key press
- Updates document title and shows visual "Saved!" indicator

**Cleanup Logic**:
- tabs.html: `cleanupInactiveWindows()` removes references to closed windows
- workspaceStorage.ts: `refreshWorkspaceStorage()` clears all window arrays and rebuilds from currently open windows
- Empty workspaces can be deleted individually or in bulk

### Tab Manager Page

- Lists all Chrome windows with tabs (favicons, titles, URLs)
- Click any tab to focus that window and activate the tab
- Workspace overview section with window counts and creation dates
- "Add current window" button reassigns workspace or creates pinned tab
- Auto-refresh every 5 seconds to reflect changes

## Chrome Extension APIs

**Permissions** (manifest.json):
- `tabs`, `windows`, `storage`, `downloads`

**Common Patterns**:
```javascript
// Query tabs
const tabs = await chrome.tabs.query({ currentWindow: true });

// Get all windows with tabs
const windows = await chrome.windows.getAll({ populate: true });

// Storage operations (atomic but not transactional)
const result = await chrome.storage.local.get('workspaces');
await chrome.storage.local.set({ workspaces });

// Create pinned workspace tab at leftmost position
await chrome.tabs.create({
  windowId: windowId,
  url: `workspace.html?id=${workspaceId}`,
  pinned: true,
  active: true,
  index: 0
});

// Download with completion listener
chrome.downloads.onChanged.addListener(onChanged);
downloadId = await chrome.downloads.download({
  url: blobUrl,
  filename: 'tabs.json',
  saveAs: true
});
```

## Important Implementation Details

**Download-Then-Close Pattern** (popup.ts:16-21):
- Listener waits for download completion before closing tabs
- Prevents premature tab closure if user cancels save dialog
- downloadId is captured in closure for listener cleanup

**Window-Workspace Association**:
- Association is determined by presence of pinned workspace.html tab
- `getWindowWorkspace()` scans only pinned tabs for efficiency
- If workspace tab found without ID, it's automatically removed

**Storage Cleanup**:
- No centralized background script for event handling
- Cleanup runs on-demand when pages load (tabs.html, workspace.html)
- `refreshWorkspaceStorage()` rebuilds associations from scratch
- Storage operations are atomic but may need retry logic for high concurrency

**Module Syntax**:
- TypeScript compiles with `export` statements
- HTML pages must use `<script type="module">` to load compiled JS
- Without `type="module"`, browser throws syntax errors on `export` keyword

## Challenges & Solutions

**Module Syntax Errors**: Resolved by adding `type="module"` to script tags for ES module support.

**Window Tracking**: Implemented cleanup to handle closed windows and prevent stale references. Multiple cleanup strategies: on-load cleanup in tabs.html, refresh from scratch in refreshWorkspaceStorage().

**Filename Sanitization**: Regex patterns ensure valid, consistent filenames (lowercase, underscores, proper prefix/suffix).

**Concurrent Access**: Storage operations are atomic but not transactional. Current implementation assumes single-user sequential operations. High concurrency scenarios may need optimistic locking or retry logic.

**Extension Tab Filtering**: Hardcoded extension ID in popup.ts:9 for filtering. This ID is specific to the development environment and would need updating for production.
