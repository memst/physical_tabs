# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome Manifest V3 extension for managing browser tabs and workspaces. It allows users to:
1.  **Save Tabs**: Export current tabs to JSON files.
2.  **Persistent Backup**: Automatically save tabs to a user-selected local folder using the File System Access API.
3.  **Workspaces**: Organize windows into named workspaces with persistent tracking.
4.  **Import**: Batch open URLs from a text list.
5.  **Tab Manager**: Visualize and manage open windows and tabs.

**Tech Stack**:
-   **Framework**: Svelte 4/5 + TypeScript
-   **Build Tool**: Vite + @crxjs/vite-plugin
-   **Manifest**: V3

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Development (HMR)
pnpm dev

# Build for Production
pnpm build
```

After building, load the `dist/` directory in Chrome (`chrome://extensions` > "Load unpacked").

## Code Architecture

### Source Structure (`src/`)

-   **`src/lib/`**: Shared utilities and business logic.
    -   `db.ts`: IndexedDB wrapper for persistent `FileSystemDirectoryHandle` storage.
    -   `workspaceStorage.ts`: Workspace data management (Chrome Storage Local).
    -   `WorkspaceList.svelte`: Reusable UI component for listing workspaces.
-   **`src/popup/`**: Extension popup.
    -   `Popup.svelte`: Main UI for saving, restoring, and setting backup folder.
-   **`src/tabs/`**: Full-page tab manager (`tabs.html`).
    -   `Tabs.svelte`: Lists all windows/tabs, handles import.
-   **`src/workspace/`**: Workspace manager (`workspace.html`).
    -   `Workspace.svelte`: Managed window UI, workspace renaming.

### Key Features & Implementation

#### 1. Svelte + Vite Migration
The project was migrated from vanilla TypeScript to Svelte + Vite.
-   **Entry Points**: Defined in `vite.config.ts` (`popup`, `tabs`, `workspace`).
-   **CRXJS**: Handles manifest generation and hot reloading for extension context.
-   **Components**: Logic moved from monolytic `.ts` files to declarative `.svelte` components.

#### 2. Persistent Folder Backup (`src/lib/db.ts`)
-   **Goal**: Save tab exports to a specific local folder without repeated prompts.
-   **Tech**: File System Access API + IndexedDB.
-   **Flow**:
    1.  User clicks "Set Backup Folder" (`window.showDirectoryPicker`).
    2.  Handle is stored in IndexedDB (`db.ts`).
    3.  Future saves check for handle, request permission (`mode: 'readwrite'`), and write directly.
    4.  Fallback to `chrome.downloads` if no folder is set or permission denied.

#### 3. Workspace Management (`src/lib/workspaceStorage.ts`)
-   **Storage**: `chrome.storage.local`.
-   **Data Model**: `{ workspaces: { [id]: { name, windows: [windowId], created } } }`.
-   **Tracking**: A pinned tab (`workspace.html?id=...`) identifies a window as belonging to a workspace.
-   **Cleanup**: `cleanupInactiveWindows()` removes closed window IDs from storage.

#### 4. Tab Import
-   **UI**: Generic modal in `Tabs.svelte`.
-   **Logic**: Parses text for `https?://` patterns and opens them in a new window via `chrome.windows.create({ url: urls })`.

## Chrome Extension Patterns

-   **Permissions**: `tabs`, `windows`, `storage`, `downloads`.
-   **File System Access**: No manifest permission needed; relies on user gesture + runtime prompt.
-   **ES Modules**: Vite compiles everything to ES modules in `dist/`.

## Recent Changes
-   **Migrated to Svelte**: Refactored `popup.ts`, `tabs.ts`, `workspace.ts` into Svelte components.
-   **Removed Legacy**: Deleted old `ts/` directory and root HTML files.
-   **Added Persistent Storage**: Implemented `src/lib/db.ts` for folder handles.

## Chrome Extension Development Notes

### HTML File Paths
After the Svelte migration, all HTML files are built under `dist/src/`:
- `dist/src/popup/index.html`
- `dist/src/tabs/index.html`
- `dist/src/workspace/index.html`

When referencing these from `chrome.tabs.create()` calls, use the `src/` prefix:
```typescript
chrome.tabs.create({ url: "src/tabs/index.html", active: true });
chrome.tabs.create({ url: `src/workspace/index.html?id=${workspaceId}`, active: true });
```

### Development Workflow

**Don't use:** `pnpm dev` - Starts Vite's dev server (localhost:5173) which doesn't work for Chrome extensions.

**Use instead:** `pnpm dev:watch` - Continuously rebuilds production files to `dist/` on file changes.

#### Setup:
1. Run `pnpm dev:watch` in terminal
2. Load unpacked extension from `dist/` folder in Chrome (`chrome://extensions/`)
3. Make changes to source files
4. Click reload button in Chrome extensions page to see changes

### Known Build Warnings
The build shows accessibility warnings from `src/tabs/Tabs.svelte`:
- Click handlers on `<div>` elements should have ARIA roles and keyboard event handlers
- These are warnings only and don't prevent the extension from working
