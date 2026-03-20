<script lang="ts">
  import { onMount } from "svelte";
  import {
    getWorkspaces,
    getWindowWorkspace,
    deleteEmptyWorkspaces,
    removeWindowFromWorkspace,
    refreshWorkspaceStorage,
    type WorkspaceStorage,
  } from "./workspaceStorage";
  import WindowTabList from "./WindowTabList.svelte";

  let {
    onChange,
  }: {
    onChange: () => Promise<void>;
  } = $props();

  let workspaces = $state<WorkspaceStorage>({});
  let emptyCount = $state(0);

  export async function refresh() {
    workspaces = await refreshWorkspaceStorage();
    emptyCount = Object.values(workspaces).filter(
      (w) => !w.windows || w.windows.length === 0,
    ).length;
  }

  onMount(() => {
    void refresh();
  });

  async function deleteWorkspace(workspaceId: string) {
    const workspaces = await getWorkspaces();
    if (!workspaces[workspaceId]) return;

    delete workspaces[workspaceId];
    await chrome.storage.local.set({ workspaces });
    await onChange();
  }

  async function addToWorkspace(workspaceId: string) {
    try {
      const currentWindow = await chrome.windows.getCurrent({ populate: true });
      const currentWorkspace = await getWindowWorkspace(currentWindow);
      if (currentWorkspace) {
        const [oldWorkspaceId, tabId] = currentWorkspace;
        await removeWindowFromWorkspace(currentWindow.id!, oldWorkspaceId);
        await chrome.tabs.update(tabId, {
          url: `src/workspace/index.html?id=${workspaceId}`,
        });
      } else {
        await chrome.tabs.create({
          windowId: currentWindow.id,
          url: `src/workspace/index.html?id=${workspaceId}`,
          pinned: true,
          active: false,
          index: 0,
        });
      }
      await onChange();
    } catch (err) {
      console.error("Failed to add current window to workspace", err);
    }
  }

  async function purgeEmpty() {
    const changed = await deleteEmptyWorkspaces();
    if (changed) {
      await onChange();
    }
  }
</script>

<div class="workspaces-section">
  <h2>Workspaces</h2>

  {#each Object.entries(workspaces) as [workspaceId, workspace]}
    <div class="workspace-item">
      <div class="workspace-header">
        <span class="workspace-title">{workspace.name || workspaceId}</span>
        <span class="workspace-details">
          {workspace.windows?.length || 0} windows • Created: {new Date(
            workspace.created,
          ).toLocaleDateString()}
        </span>

        <button
          type="button"
          class="add-workspace-window"
          onclick={() => addToWorkspace(workspaceId)}
        >
          ➕ Add current window
        </button>

        {#if workspace.windows?.length === 0}
          <button
            type="button"
            class="delete-workspace"
            onclick={() => deleteWorkspace(workspaceId)}
          >
            🗑️ Delete
          </button>
        {/if}
      </div>
      <WindowTabList
        windows={workspace.windows}
        title="Workspace Windows"
      />
    </div>
  {/each}

  {#if emptyCount > 0}
    <div style="margin-top: 12px;">
      <button type="button" class="delete-empty-workspaces" onclick={purgeEmpty}>
        🧹 Delete {emptyCount} empty workspace{emptyCount > 1 ? "s" : ""}
      </button>
    </div>
  {/if}
</div>

<style>
  .workspaces-section {
    margin-bottom: 20px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px;
  }
  .workspace-item {
    background-color: white;
    padding: 12px;
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .workspace-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .workspace-title {
    font-weight: bold;
    font-size: 1.1em;
  }
  .workspace-details {
    color: #666;
    font-size: 0.9em;
    flex: 1 1 100%;
  }
  button {
    padding: 5px 10px;
    cursor: pointer;
  }
  .delete-workspace {
    background-color: #ffeba7;
    border: 1px solid #ddd;
  }
  .delete-workspace:hover {
    background-color: #ffd7d7;
  }
</style>
