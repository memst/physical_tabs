<script lang="ts">
    import { onMount, tick } from "svelte";
    import WorkspaceList from "../lib/WorkspaceList.svelte";
    import WindowTabList from "../lib/WindowTabList.svelte";
    import SavedWindowItem from "../lib/SavedWindowItem.svelte";
    import {
        type WorkspaceStorage,
    } from "../lib/workspaceStorage";
    import { getDirectoryHandle, deleteFile } from "../lib/db";
    import {
        type SavedWindowFile,
        parseFile,
        compareSavedWindowFile,
    } from "../lib/windowFile";

    let windows: chrome.windows.Window[] = $state([]);
    let workspaceListComp: WorkspaceList;
    let showModal = $state(false);
    let importText = $state("");
    let savedFiles: SavedWindowFile[] = $state([]);
    let refreshInProgress = false;
    let refreshQueued = false;

    async function cleanupInactiveWindows(): Promise<WorkspaceStorage> {
        const result = await chrome.storage.local.get("workspaces");
        const workspaces: WorkspaceStorage = result.workspaces || {};
        const existingWindows = await chrome.windows.getAll();
        const existingWindowIds = new Set(existingWindows.map((w) => w.id));
        let hasChanges = false;

        for (const [workspaceId, workspace] of Object.entries(workspaces)) {
            if (!workspace.windows) workspace.windows = [];
            const activeWindows = workspace.windows.filter((window) =>
                existingWindowIds.has(window.id),
            );
            if (activeWindows.length !== workspace.windows.length) {
                workspace.windows = activeWindows;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await chrome.storage.local.set({ workspaces });
        }
        return workspaces;
    }

    async function loadFiles() {
        const handle = await getDirectoryHandle();
        if (!handle) {
            savedFiles = [];
            return;
        }

        const entries: SavedWindowFile[] = [];
        await handle.requestPermission();
        for await (const [name, entry] of handle.entries()) {
            if (name === ".DS_Store") continue;
            if (entry.kind === "file") {
                const file = await entry.getFile();
                const savedWindow = await parseFile(file);
                entries.push(savedWindow);
            }
        }
        savedFiles = entries.sort(compareSavedWindowFile);
    }

    async function refresh() {
        if (refreshInProgress) {
            refreshQueued = true;
            return;
        }
        refreshInProgress = true;

        try {
            await cleanupInactiveWindows();
            await loadFiles();
            windows = await chrome.windows.getAll({ populate: true });
            if (workspaceListComp) {
                await workspaceListComp.refresh();
            }
        } finally {
            refreshInProgress = false;
            if (refreshQueued) {
                refreshQueued = false;
                void refresh();
            }
        }
    }

    onMount(() => {
        void refresh();

        const handleWindowChange = () => {
            void refresh();
        };
        const handleTabUpdated = (
            _tabId: number,
            changeInfo: chrome.tabs.TabChangeInfo,
        ) => {
            if (
                changeInfo.status === "complete" ||
                changeInfo.title !== undefined ||
                changeInfo.url !== undefined ||
                changeInfo.pinned !== undefined
            ) {
                void refresh();
            }
        };
        const handleStorageChange = (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string,
        ) => {
            if (areaName === "local" && changes.workspaces) {
                void refresh();
            }
        };
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                void refresh();
            }
        };

        chrome.windows.onCreated.addListener(handleWindowChange);
        chrome.windows.onRemoved.addListener(handleWindowChange);
        chrome.tabs.onCreated.addListener(handleWindowChange);
        chrome.tabs.onRemoved.addListener(handleWindowChange);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);
        chrome.storage.onChanged.addListener(handleStorageChange);
        window.addEventListener("focus", handleWindowChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            chrome.windows.onCreated.removeListener(handleWindowChange);
            chrome.windows.onRemoved.removeListener(handleWindowChange);
            chrome.tabs.onCreated.removeListener(handleWindowChange);
            chrome.tabs.onRemoved.removeListener(handleWindowChange);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
            chrome.storage.onChanged.removeListener(handleStorageChange);
            window.removeEventListener("focus", handleWindowChange);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    });

    function focusTab(windowId: number, tabId: number) {
        chrome.windows.update(windowId, { focused: true });
        chrome.tabs.update(tabId, { active: true });
    }

    function openImportModal() {
        showModal = true;
        void tick().then(() => {
            document.getElementById("import-urls")?.focus();
        });
    }

    function closeImportModal() {
        showModal = false;
    }

    function parseUrls(text: string): string[] {
        const lines = text.split("\n");
        const urls: string[] = [];
        const urlRegex = /(https?:\/\/[^\s]+)/;

        for (const line of lines) {
            const match = line.match(urlRegex);
            if (match) {
                urls.push(match[0]);
            }
        }
        return urls;
    }

    function importTabs() {
        const urls = parseUrls(importText);
        if (urls.length > 0) {
            void chrome.windows.create({ url: urls });
            closeImportModal();
            importText = "";
        } else {
            alert("No valid URLs found!");
        }
    }

    function handleDelete(filename: string) {
        deleteFile(filename)
            .then(loadFiles)
            .catch((err) => alert("Failed to delete file: " + err.message));
    }
</script>

<div class="container">
    <h2>
        Chrome Windows and Tabs
        <button class="import-btn" onclick={openImportModal}>
            Import Tabs
        </button>
        <button
            class="import-btn"
            onclick={() =>
                chrome.tabs.create({ url: "src/preferences/index.html" })}
        >
            ⚙️ Settings
        </button>
        <button class="import-btn" onclick={loadFiles}>Load Files</button>
    </h2>

    <div class="files-section">
        <h2>Saved Files (DB)</h2>
        <div class="file-list">
            {#each savedFiles as file}
                <SavedWindowItem
                    {file}
                    onDelete={() => handleDelete(file.filename)}
                />
            {/each}
        </div>
    </div>

    <WorkspaceList bind:this={workspaceListComp} onChange={refresh} />

    <WindowTabList {windows} onTabClick={focusTab} />

    {#if showModal}
        <div class="modal" role="presentation">
            <button
                type="button"
                class="modal-backdrop"
                aria-label="Close import modal"
                onclick={closeImportModal}
            ></button>
            <div
                class="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-dialog-title"
            >
                <button
                    type="button"
                    class="close"
                    aria-label="Close import modal"
                    onclick={closeImportModal}
                >
                    &times;
                </button>
                <h3 id="import-dialog-title" style="margin-top: 0;">
                    Import List of Tabs
                </h3>
                <p>Paste your list of URLs below:</p>
                <textarea
                    id="import-urls"
                    bind:value={importText}
                    rows="10"
                    placeholder="1. https://example.com&#10;2. https://google.com"
                >
                </textarea>
                <button class="import-action-btn" onclick={importTabs}>
                    Open in New Window
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    :global(body) {
        font-family: sans-serif;
        margin: 20px;
    }
    .import-btn {
        float: right;
        margin-top: 5px;
        font-size: 0.6em;
        padding: 5px 10px;
        cursor: pointer;
    }
    .files-section {
        margin-top: 20px;
        padding: 10px;
        background-color: #f5f5f5;
        border-radius: 5px;
    }
    .modal {
        display: grid;
        place-items: center;
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }
    .modal-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background-color: rgba(0, 0, 0, 0.4);
        cursor: pointer;
    }
    .modal-content {
        position: relative;
        z-index: 1;
        background-color: #fefefe;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 500px;
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
    }
    .close {
        appearance: none;
        background: transparent;
        border: none;
        color: #aaa;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        line-height: 1;
        margin-left: auto;
        padding: 0;
    }
    .close:hover,
    .close:focus {
        color: black;
        text-decoration: none;
        cursor: pointer;
    }
    textarea {
        width: 100%;
        box-sizing: border-box;
        resize: vertical;
        margin-bottom: 10px;
    }
    .import-action-btn {
        padding: 8px 16px;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
