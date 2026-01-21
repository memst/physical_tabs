<script lang="ts">
    import TabItem from "./TabItem.svelte";
    import type { SavedWindowFile } from "./windowFile";

    let { file }: { file: SavedWindowFile } = $props();
</script>

<div class="window">
    <div class="window-title">
        📄 {file.filename} ({file.tabs?.length || 0} tabs)
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
    }
</style>
