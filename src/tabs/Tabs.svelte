<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import WorkspaceList from "../lib/WorkspaceList.svelte";
    import WindowTabList from "../lib/WindowTabList.svelte";
    import {
        type WorkspaceStorage,
        refreshWorkspaceStorage,
    } from "../lib/workspaceStorage";

    let windows: chrome.windows.Window[] = [];
    let workspaceListComp: WorkspaceList;
    let showModal = false;
    let importText = "";

    // Cleanup inactive windows logic (ported from tabs.ts)
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

    async function refresh() {
        await cleanupInactiveWindows();

        refreshWorkspaceStorage();
        windows = await chrome.windows.getAll({ populate: true });
        if (workspaceListComp) workspaceListComp.refresh();
    }

    let interval: number;

    onMount(() => {
        refresh();
        interval = window.setInterval(refresh, 5000);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });

    function focusTab(windowId: number, tabId: number) {
        chrome.windows.update(windowId, { focused: true });
        chrome.tabs.update(tabId, { active: true });
    }

    function openImportModal() {
        showModal = true;
        setTimeout(() => {
            document.getElementById("import-urls")?.focus();
        }, 50);
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
            chrome.windows.create({ url: urls });
            closeImportModal();
            importText = "";
        } else {
            alert("No valid URLs found!");
        }
    }
</script>

<div class="container">
    <h2>
        Chrome Windows and Tabs
        <button class="import-btn" on:click={openImportModal}
            >Import Tabs</button
        >
    </h2>

    <WorkspaceList bind:this={workspaceListComp} onChange={refresh} />

    <WindowTabList {windows} onTabClick={focusTab} />

    {#if showModal}
        <div class="modal" on:click|self={closeImportModal}>
            <div class="modal-content">
                <span class="close" on:click={closeImportModal}>&times;</span>
                <h3 style="margin-top: 0;">Import List of Tabs</h3>
                <p>Paste your list of URLs below:</p>
                <textarea
                    id="import-urls"
                    bind:value={importText}
                    rows="10"
                    placeholder="1. https://example.com&#10;2. https://google.com"
                >
                </textarea>
                <button class="import-action-btn" on:click={importTabs}
                    >Open in New Window</button
                >
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
    /* Modal Styles */
    .modal {
        display: block;
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.4);
    }
    .modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 500px;
    }
    .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
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
