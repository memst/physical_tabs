<script lang="ts">
    import WindowItem from "./WindowItem.svelte";

    export let windows: chrome.windows.Window[];
    export let onTabClick: (windowId: number, tabId: number) => void;
</script>

<div class="windows-section">
    <h2>All Windows</h2>
    {#each windows as window}
        <WindowItem {window} {onTabClick} />
    {/each}
</div>
