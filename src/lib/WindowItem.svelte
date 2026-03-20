<script lang="ts">
    import TabItem from "./TabItem.svelte";
    import { saveTabs } from "./windowSaver";

    let {
        window,
        onTabClick,
    }: {
        window: chrome.windows.Window;
        onTabClick?: (windowId: number, tabId: number) => void;
    } = $props();

    async function onSave() {
        const tabs = window.tabs ?? [];
        if (tabs.length === 0) return;

        const tabsForSaver = tabs.map((t) => ({
            title: t.title,
            url: t.url,
            id: t.id,
        }));

        await saveTabs(tabsForSaver, {
            filename: window.id !== undefined ? `window_${window.id}` : "window",
            closeTabs: false,
        });
    }
</script>

<div class="window">
    <div class="window-title">
        <span>Window {window.id} ({window.tabs?.length || 0} tabs)</span>
        <button type="button" onclick={onSave} class="save-btn">Save</button>
    </div>
    {#each window.tabs || [] as tab (tab.id ?? tab.url ?? tab.title)}
        <TabItem
            title={tab.title!}
            url={tab.url!}
            faviconUrl={tab.favIconUrl}
            onClick={
                window.id !== undefined &&
                tab.id !== undefined &&
                onTabClick
                    ? () => onTabClick(window.id!, tab.id!)
                    : undefined
            }
        />
    {/each}
</div>

<style>
    .window {
        border: 1px solid #ccc;
        margin-bottom: 16px;
        padding: 12px 14px;
        border-radius: 8px;
    }
    .window-title {
        font-weight: bold;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .save-btn {
        padding: 5px 10px;
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
