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
    let faviconRequestId = 0;

    $effect(() => {
        const requestId = ++faviconRequestId;
        displayFavicon = null;

        void getFavicon(url, faviconUrl)
            .then((favicon) => {
                if (requestId === faviconRequestId) {
                    displayFavicon = favicon;
                }
            })
            .catch(() => {
                if (requestId === faviconRequestId) {
                    displayFavicon = null;
                }
            });
    });
</script>

<button
    type="button"
    class="tab"
    onclick={onClick}
    disabled={!onClick}
>
    {#if displayFavicon}
        <img src={displayFavicon} alt="" />
    {/if}
    <span class="tab-copy">
        <span class="tab-title">{title}</span>
        <span class="tab-url">{url}</span>
    </span>
</button>

<style>
    .tab {
        appearance: none;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        text-align: left;
    }
    .tab:hover {
        background-color: #f0f0f0;
    }
    .tab:disabled {
        cursor: default;
        opacity: 1;
    }
    .tab img {
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
    }
    .tab-copy {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 10px;
        flex: 1;
    }
    .tab-title {
        font-weight: bold;
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
