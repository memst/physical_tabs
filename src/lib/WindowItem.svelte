<script lang="ts">
    export let window: chrome.windows.Window;
    export let onTabClick: (windowId: number, tabId: number) => void;
</script>

<div class="window">
    <div class="window-title">
        Window {window.id} ({window.tabs?.length || 0} tabs)
    </div>
    {#each window.tabs || [] as tab}
        <div class="tab" on:click={() => onTabClick(window.id!, tab.id!)}>
            <img src={tab.favIconUrl || "chrome://favicon/"} alt="" />
            <span class="tab-title">{tab.title}</span>
            <span class="tab-url">{tab.url}</span>
        </div>
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
    .tab {
        display: flex;
        align-items: center;
        padding: 5px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
    }
    .tab:hover {
        background-color: #f0f0f0;
    }
    .tab img {
        width: 16px;
        height: 16px;
        margin-right: 10px;
    }
    .tab-title {
        font-weight: bold;
        margin-right: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
    }
    .tab-url {
        color: #666;
        font-size: 0.9em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-grow: 1;
    }
</style>
