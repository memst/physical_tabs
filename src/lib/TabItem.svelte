<script lang="ts">
    import { getFavicon } from "./faviconCache";

    let {
        title,
        url,
        faviconUrl,
        onClick,
    }: {
        title: string;
        url: string;
        faviconUrl?: string;
        onClick?: () => void;
    } = $props();

    let displayFavicon = $state<string | null>(null);
    $effect(() => {
        getFavicon(url, faviconUrl).then((favicon) => {
            displayFavicon = favicon;
        });
    });
</script>

<div class="tab" onclick={onClick}>
    <img src={displayFavicon} alt="" />
    <span class="tab-title">{title}</span>
    <span class="tab-url">{url}</span>
</div>

<style>
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
