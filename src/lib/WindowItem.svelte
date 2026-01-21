<script lang="ts">
    import TabItem from "./TabItem.svelte";

    export let window: chrome.windows.Window;
    export let onTabClick: (windowId: number, tabId: number) => void;
</script>

<div class="window">
    <div class="window-title">
        Window {window.id} ({window.tabs?.length || 0} tabs)
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
    }
</style>
