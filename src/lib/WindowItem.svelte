<script lang="ts">
    import TabItem from "./TabItem.svelte";
    import { saveTabs } from "./windowSaver";

    export let window: chrome.windows.Window;
    export let onTabClick: (windowId: number, tabId: number) => void;

    async function onSave() {
        // Transform tabs for saver
        if (!window.tabs) return;

        const tabsForSaver = window.tabs.map((t) => ({
            title: t.title,
            url: t.url,
            id: t.id,
        }));

        await saveTabs(tabsForSaver, {
            filename: `window_${window.id}`,
            closeTabs: false,
        });
    }
</script>

<div class="window">
    <div class="window-title">
        <span>Window {window.id} ({window.tabs?.length || 0} tabs)</span>
        <button onclick={onSave} class="save-btn">Save</button>
    </div>
    {#each window.tabs || [] as tab}
        <TabItem
            title={tab.title!}
            url={tab.url!}
            faviconUrl={tab.favIconUrl}
            onClick={() => onTabClick(window.id!, tab.id!)}
        />
    {/each}
</div>

<style>
    .window {
        border: 1px solid #ccc;
        margin-bottom: 20px;
        padding: 10px;
        border-radius: 5px;
    }
    .window-title {
        font-weight: bold;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .save-btn {
        padding: 4px 8px;
        background-color: #2196f3;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8em;
    }
    .save-btn:hover {
        background-color: #1976d2;
    }
</style>
