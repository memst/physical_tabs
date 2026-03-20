<script lang="ts">
    import TabItem from "./TabItem.svelte";
    import { type SavedWindowFile, restoreAsWindow } from "./windowFile";
    import { appendTabsToFile } from "./windowSaver";

    let { file, onDelete }: { file: SavedWindowFile; onDelete?: () => void } =
        $props();

    const collapseKey = (filename: string) => `collapse_${filename}`;

    function readCollapseState(filename: string): boolean {
        return localStorage.getItem(collapseKey(filename)) === "true";
    }

    function writeCollapseState(filename: string, value: boolean): void {
        localStorage.setItem(collapseKey(filename), String(value));
    }

    let isCollapsed = $state(false);

    $effect(() => {
        isCollapsed = readCollapseState(file.filename);
    });

    function toggleCollapse() {
        isCollapsed = !isCollapsed;
        writeCollapseState(file.filename, isCollapsed);
    }

    async function onRestore(e: MouseEvent) {
        e.stopPropagation();
        await restoreAsWindow(file);
    }

    async function onRestoreAndDelete(e: MouseEvent) {
        e.stopPropagation();
        await restoreAsWindow(file);
        onDelete?.();
    }

    async function onAppend(e: MouseEvent) {
        e.stopPropagation();
        await appendTabsToFile(file);
    }
</script>

<div class="window">
    <div class="window-header">
        <button
            type="button"
            class="title-button"
            onclick={toggleCollapse}
            aria-expanded={!isCollapsed}
        >
            <span class="arrow">{isCollapsed ? "▶" : "▼"}</span>
            <span class="title-text">
                <span class="window-name">{file.title || "Window"}</span>
                <span class="tab-count">{file.tabs?.length || 0} tabs</span>
                <span class="filename">{file.filename}</span>
            </span>
        </button>
        <div class="actions">
            <button type="button" onclick={onAppend} class="append-btn">
                Append
            </button>
            <button
                type="button"
                onclick={onRestoreAndDelete}
                class="restore-del-btn"
                title="Restore and Delete"
            >
                Restore & Delete
            </button>
            <button type="button" onclick={onRestore} class="restore-btn">
                Restore
            </button>
        </div>
    </div>
    {#if !isCollapsed}
        <div class="tabs-list">
            {#each file.tabs || [] as tab (tab.url)}
                <TabItem title={tab.title} url={tab.url} />
            {/each}
        </div>
    {/if}
</div>

<style>
    .window {
        border: 1px solid #ccc;
        margin-bottom: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        background-color: white;
    }
    .window-header {
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .title-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        user-select: none;
        text-align: left;
    }
    .tabs-list {
        margin-top: 10px;
        border-top: 1px solid #eee;
        padding-top: 8px;
    }
    .arrow {
        display: inline-block;
        width: 15px;
        font-size: 0.8em;
    }
    .restore-btn {
        padding: 5px 10px;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8em;
    }
    .restore-btn:hover {
        background-color: #45a049;
    }
    .filename {
        color: #888;
        font-weight: normal;
        font-size: 0.9em;
    }
    .title-text {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
    }
    .window-name {
        font-size: 1rem;
    }
    .tab-count {
        color: #444;
        font-size: 0.9em;
    }
    .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }
    .restore-del-btn {
        padding: 5px 10px;
        background-color: #d32f2f;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8em;
    }
    .restore-del-btn:hover {
        background-color: #b71c1c;
    }
    .append-btn {
        padding: 5px 10px;
        background-color: #ff9800;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8em;
    }
    .append-btn:hover {
        background-color: #fb8c00;
    }
</style>
