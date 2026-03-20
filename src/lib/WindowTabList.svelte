<script lang="ts">
    import WindowItem from "./WindowItem.svelte";

    let {
        windows,
        title = "All Windows",
        onTabClick,
    }: {
        windows: chrome.windows.Window[];
        title?: string;
        onTabClick?: (windowId: number, tabId: number) => void;
    } = $props();
</script>

<div class="windows-section">
    <h2>{title}</h2>
    {#each windows as window (window.id)}
        <WindowItem {window} {onTabClick} />
    {/each}
</div>

<style>
    .windows-section {
        margin-top: 20px;
    }

    h2 {
        margin: 0 0 12px;
    }
</style>
