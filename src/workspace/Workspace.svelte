<script lang="ts">
  import { onMount } from 'svelte';
  import WorkspaceList from '../lib/WorkspaceList.svelte';
  import { type WorkspaceStorage } from '../lib/workspaceStorage';

  let workspaceId: string | null = null;
  let workspace: any = null;
  let currentWindowId: number | null = null;
  let workspaceName = '';
  let saved = false;
  let error = '';

  let workspaceListComp: WorkspaceList;

  async function init() {
      const urlParams = new URLSearchParams(window.location.search);
      workspaceId = urlParams.get('id');

      if (!workspaceId) {
          error = 'Error: No workspace ID provided';
          return;
      }

      try {
          const currentWindow = await chrome.windows.getCurrent();
          currentWindowId = currentWindow.id!;

          const result = await chrome.storage.local.get('workspaces');
          const workspaces: WorkspaceStorage = result.workspaces || {};
          workspace = workspaces[workspaceId];

          if (!workspace) {
              error = 'Error: Workspace not found';
              return;
          }

          if (!currentWindowId) {
              error = 'Error: Unable to get current window ID';
              return;
          }

          // Register window if needed
          if (!workspace.windows.includes(currentWindowId)) {
              workspace.windows.push(currentWindowId);
              workspaces[workspaceId] = workspace; 
              await chrome.storage.local.set({ workspaces });
          }

          workspaceName = workspace.name || '';
          updateTitle(workspaceName);

      } catch (err: any) {
          error = 'Error initializing workspace: ' + err.message;
          console.error(err);
      }
  }

  function updateTitle(name: string) {
      document.title = name ? `${name} - Workspace Manager` : 'Workspace Manager';
  }

  async function saveName() {
      if (!workspaceId || !workspace) return;
      
      const newName = workspaceName.trim();
      const result = await chrome.storage.local.get('workspaces');
      const workspaces = result.workspaces || {};

      if (workspaces[workspaceId]) {
           workspaces[workspaceId] = {
              ...workspaces[workspaceId],
              name: newName,
              lastAccessed: Date.now()
          };
          workspace = workspaces[workspaceId];
          await chrome.storage.local.set({ workspaces });
          
          updateTitle(newName);
          saved = true;
          setTimeout(() => saved = false, 2000);
          
          if (workspaceListComp) workspaceListComp.refresh();
      }
  }

  function handleKeypress(event: KeyboardEvent) {
      if (event.key === 'Enter') {
          saveName();
      }
  }

  function handleRefresh() {
      // Just refresh the list
      if (workspaceListComp) workspaceListComp.refresh();
      return Promise.resolve();
  }

  onMount(() => {
    init();
  });
</script>

<div class="container">
  {#if error}
      <div class="error">{error}</div>
  {:else if workspace}
      <div class="workspace-name">
          <input 
              type="text" 
              bind:value={workspaceName} 
              placeholder="Enter workspace name" 
              on:keypress={handleKeypress}
          >
          <button on:click={saveName}>Save</button>
          <span class="saved-indicator" class:show={saved}>✓ Saved</span>
      </div>

      <div class="window-info">
          <div style="margin-bottom: 10px"><strong>Workspace ID:</strong> {workspaceId}</div>
          <div style="margin-bottom: 10px"><strong>Window ID:</strong> {currentWindowId}</div>
          <div style="margin-bottom: 10px"><strong>Created:</strong> {new Date(workspace.created).toLocaleString()}</div>
          <div style="margin-bottom: 10px"><strong>Active Windows:</strong> {workspace.windows.length}</div>
      </div>

      <WorkspaceList bind:this={workspaceListComp} onChange={handleRefresh} />
  {:else}
      <div>Loading...</div>
  {/if}
</div>

<style>
  :global(body) {
      font-family: sans-serif;
      margin: 20px;
  }
  .error {
      color: red;
      font-weight: bold;
  }
  .window-info {
      font-size: 1.2em;
      margin-bottom: 20px;
  }
  .workspace-name {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
  }
  .workspace-name input {
      font-size: 1.2em;
      padding: 5px;
      border: 1px solid #ccc;
      border-radius: 4px;
  }
  .workspace-name button {
      padding: 5px 10px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
  }
  .workspace-name button:hover {
      background-color: #45a049;
  }
  .saved-indicator {
      color: #4CAF50;
      opacity: 0;
      transition: opacity 0.3s;
  }
  .saved-indicator.show {
      opacity: 1;
  }
</style>
