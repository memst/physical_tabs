<script lang="ts">
  import { onMount } from "svelte";
  import { createWorkspace } from "../lib/workspaceStorage";
  import { getDirectoryHandle, saveDirectoryHandle } from "../lib/db";
  import { parseFile } from "../lib/windowFile";
  import { saveTabs } from "../lib/windowSaver";

  let currentHandle: FileSystemDirectoryHandle | null = null;
  let folderStatus = "Folder: Not set";
  let saveButtonText = "💾 Save Tabs";

  let fileInput: HTMLInputElement;
  let appendInput: HTMLInputElement;

  onMount(async () => {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        currentHandle = handle;
        folderStatus = `Folder: ${currentHandle.name}`;
      }
    } catch (e) {
      console.error("Failed to load handle:", e);
    }
  });

  async function setFolder() {
    try {
      const handle = await window.showDirectoryPicker();
      currentHandle = handle;
      await saveDirectoryHandle(handle);
      folderStatus = `Folder: ${handle.name}`;
    } catch (err) {
      console.log("Folder selection cancelled or failed", err);
    }
  }

  async function saveCurrentWindow(
    additionalTabs?: string[][],
    filename?: string,
  ) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabsForSaver = tabs.map((tab) => ({
      title: tab.title,
      url: tab.url,
      id: tab.id,
    }));

    const originalText = saveButtonText;
    saveButtonText = "Saving...";

    try {
      await saveTabs(tabsForSaver, {
        filename,
        additionalTabs,
        closeTabs: true,
        handle: currentHandle,
      });
      saveButtonText = "Saved!";
    } catch (err: any) {
      saveButtonText = "Save Tabs";
      alert("Failed to save tabs: " + err.message);
    } finally {
      setTimeout(() => {
        saveButtonText = originalText;
      }, 1500);
    }
  }

  async function handleSave() {
    const rawName = window.prompt(
      "Enter a name for the saved tabs (without extension):",
      "tabs_window",
    );
    if (rawName === null) return;

    let name = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!name) name = "tabs";
    if (!name.startsWith("tabs_")) name = `tabs_${name}`;
    if (!name.endsWith(".json")) name = `${name}.json`;

    await saveCurrentWindow(undefined, name);
  }

  function handleRestore() {
    fileInput.click();
  }

  function handleAppend() {
    appendInput.click();
  }

  function handleManage() {
    void chrome.tabs.create({ url: "src/tabs/index.html", active: true });
  }

  async function openWorkspaceWindow(windowId?: number) {
    const workspace = await createWorkspace();
    const url = `src/workspace/index.html?id=${workspace.workspaceId}`;

    if (windowId != null) {
      await chrome.tabs.create({
        windowId,
        url,
        pinned: true,
        active: true,
        index: 0,
      });
      return;
    }

    const newWindow = await chrome.windows.create({
      focused: true,
      state: "normal",
    });
    await chrome.tabs.create({
      windowId: newWindow.id,
      url,
      pinned: true,
      active: true,
      index: 0,
    });
  }

  async function handleMakeWorkspace() {
    const currentWindow = await chrome.windows.getCurrent();
    await openWorkspaceWindow(currentWindow.id ?? undefined);
  }

  async function handleCreateWorkspace() {
    await openWorkspaceWindow();
  }

  async function onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const windowFile = await parseFile(file);
      for (const tab of windowFile.tabs) {
        await chrome.tabs.create({ url: tab.url });
      }
    } catch (err: any) {
      alert("Error loading file: " + err.message);
    }
    (event.target as HTMLInputElement).value = "";
  }

  async function onAppendChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();

    const old_tabs: string[][] = [];
    try {
      const urls = JSON.parse(text);
      if (!Array.isArray(urls)) throw new Error("Invalid file format");
      for (const el of urls) {
        let tab: string[] | null = null;
        if (typeof el === "string") {
          tab = ["", el];
        } else if (Array.isArray(el) && el.length === 2) {
          tab = el as string[];
        } else {
          console.error("Invalid tab format", el);
          continue;
        }
        if (tab) old_tabs.push(tab);
      }
    } catch (err: any) {
      alert("Error loading file: " + err.message);
      return;
    }
    await saveCurrentWindow(old_tabs, file.name);
    (event.target as HTMLInputElement).value = "";
  }
</script>

<h3>Physical Tabs</h3>

<button onclick={handleSave}>{saveButtonText}</button>
<button onclick={handleRestore}>📂 Restore Tabs</button>
<button onclick={handleAppend}>💾📂 Append Tabs</button>

<div class="separator"></div>

<button onclick={handleManage}>🔍 Show All Windows & Tabs</button>
<button onclick={handleMakeWorkspace}>✨ Make this a Managed Window</button>
<button onclick={handleCreateWorkspace}>✨ Create a Managed Window</button>

<div class="separator"></div>

<button
  onclick={() => void chrome.tabs.create({ url: "src/preferences/index.html" })}
  >⚙️ Settings</button
>

<div class="separator"></div>

<button onclick={setFolder}>📁 Set Backup Folder</button>
<div class="folder-status">{folderStatus}</div>

<input
  type="file"
  accept=".json"
  bind:this={fileInput}
  onchange={onFileChange}
/>
<input
  type="file"
  accept=".json"
  bind:this={appendInput}
  onchange={onAppendChange}
/>

<style>
  :global(body) {
    font-family: sans-serif;
    width: 250px;
    padding: 10px;
    margin: 0;
  }
  button {
    display: block;
    margin: 8px 0;
    width: 100%;
    padding: 8px;
    cursor: pointer;
  }
  button:hover {
    background-color: #f0f0f0;
  }
  input[type="file"] {
    display: none;
  }
  .folder-status {
    font-size: 0.8em;
    color: #666;
    text-align: center;
    margin-top: 5px;
  }
  .separator {
    height: 1px;
    background-color: #eee;
    margin: 10px 0;
  }
</style>
