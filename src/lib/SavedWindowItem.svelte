<script lang="ts">
    import TabItem from "./TabItem.svelte";
    import { type SavedWindowFile, restoreAsWindow } from "./windowFile";

    let { file }: { file: SavedWindowFile } = $props();

    async function onRestore() {
        await restoreAsWindow(file);
    }
</script>

<div class="window">
    <div class="window-title">
        <span>
            {file.title || "Untitled Window"} ({file.tabs?.length || 0} tabs)
            <span class="filename">{file.filename}</span>
        </span>
        <button onclick={onRestore} class="restore-btn">Restore</button>
    </div>
    {#each file.tabs || [] as tab}
        <TabItem title={tab.title} url={tab.url} />
    {/each}
</div>

<style>
    .window {
        border: 1px solid #ccc;
        margin-bottom: 20px;
        padding: 10px;
        border-radius: 5px;
        background-color: white;
    }
    .window-title {
        font-weight: bold;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .restore-btn {
        padding: 4px 8px;
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
        margin-left: 8px;
        font-size: 0.9em;
    }
</style>
