<script lang="ts">
  import { onMount } from "svelte";
  import {
    getWindowWorkspace,
    deleteEmptyWorkspaces,
    removeWindowFromWorkspace,
    refreshWorkspaceStorage,
    type WorkspaceStorage,
  } from "./workspaceStorage";
  import WindowTabList from "./WindowTabList.svelte";

  export let onChange: () => Promise<void>;

  let workspaces: WorkspaceStorage = {};
  let emptyCount = 0;

  export async function refresh() {
    workspaces = await refreshWorkspaceStorage();
    emptyCount = Object.values(workspaces).filter(
      (w) => !w.windows || w.windows.length === 0,
    ).length;
  }

  onMount(() => {
    refresh();
  });

  async function deleteWorkspace(workspaceId: string) {
    const result = await chrome.storage.local.get("workspaces");
    const ws = result.workspaces || {};
    delete ws[workspaceId];
    await chrome.storage.local.set({ workspaces: ws });
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
      // Give chrome a moment to update tab before refreshing might be nice, but onChange handles standard flow
      // Adding a delay might ensure the tab is fully created/updated if we rely on window listings immediately
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
          class="add-workspace-window"
          on:click={() => addToWorkspace(workspaceId)}
        >
          ➕ Add current window
        </button>

        {#if workspace.windows.length === 0}
          <button
            class="delete-workspace"
            on:click={() => deleteWorkspace(workspaceId)}
          >
            🗑️ Delete
          </button>
        {/if}
        <WindowTabList
          windows={workspace.windows}
          onTabClick={(windowId: number, tabId: number) => null}
        />
      </div>
    </div>
  {/each}

  {#if emptyCount > 0}
    <div style="margin-top: 12px;">
      <button class="delete-empty-workspaces" on:click={purgeEmpty}>
        🧹 Delete {emptyCount} empty workspace{emptyCount > 1 ? "s" : ""}
      </button>
    </div>
  {/if}
</div>

<style>
  .workspaces-section {
    margin-bottom: 20px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 5px;
  }
  .workspace-item {
    background-color: white;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .workspace-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .workspace-title {
    font-weight: bold;
    font-size: 1.1em;
  }
  .workspace-details {
    color: #666;
    font-size: 0.9em;
    flex-grow: 1;
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
