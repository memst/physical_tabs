<script lang="ts">
  import { onMount } from "svelte";
  import { createWorkspace } from "../lib/workspaceStorage";
  import { getDirectoryHandle, saveDirectoryHandle } from "../lib/db";

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
    console.log("Saving current window");
    const tabs = await chrome.tabs.query({ currentWindow: true });
    // Filter out our extension tabs
    const tabs_to_save = tabs.filter(
      (tab) => !tab.url?.startsWith(`chrome-extension://${chrome.runtime.id}`),
    );
    const new_tabs = tabs_to_save.map((tab) => [tab.title || "", tab.url!]);
    const final_tabs =
      additionalTabs?.concat(new_tabs as string[][]) || new_tabs;
    const jsonContent = JSON.stringify(final_tabs, null, 2);

    if (currentHandle) {
      try {
        const verifyPermission = async (handle: FileSystemDirectoryHandle) => {
          const options: FileSystemHandlePermissionDescriptor = {
            mode: "readwrite",
          };
          if ((await handle.queryPermission(options)) === "granted")
            return true;
          if ((await handle.requestPermission(options)) === "granted")
            return true;
          return false;
        };

        if (await verifyPermission(currentHandle)) {
          const name =
            filename ||
            `tabs_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
          const finalName = name.endsWith(".json") ? name : `${name}.json`;

          const fileHandle = await currentHandle.getFileHandle(finalName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(jsonContent);
          await writable.close();

          const originalText = saveButtonText;
          saveButtonText = "Saved!";
          setTimeout(() => {
            saveButtonText = originalText;
          }, 1500);

          chrome.tabs.remove(tabs_to_save.map((tab) => tab.id!));
          return;
        }
      } catch (err) {
        console.error("Failed to save to folder:", err);
        alert("Failed to save to folder. Falling back to download.");
      }
    }

    // Fallback to download
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
      {
        url,
        filename: filename || "tabs.json",
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          alert("Download failed: " + chrome.runtime.lastError.message);
          return;
        }
        // Monitor download to close tabs
        const onChanged = ({ id, state }: chrome.downloads.DownloadDelta) => {
          if (id === downloadId && state && state.current === "complete") {
            chrome.downloads.onChanged.removeListener(onChanged);
            chrome.tabs.remove(tabs_to_save.map((tab) => tab.id!));
          }
        };
        chrome.downloads.onChanged.addListener(onChanged);
      },
    );
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
    chrome.tabs.create({ url: "src/tabs/index.html", active: true });
  }

  async function handleMakeWorkspace() {
    const workspace = await createWorkspace();
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.tabs.create({
      windowId: currentWindow.id,
      url: `src/workspace/index.html?id=${workspace.workspaceId}`,
      pinned: true,
      active: true,
      index: 0,
    });
  }

  async function handleCreateWorkspace() {
    const workspace = await createWorkspace();
    const newWindow = await chrome.windows.create({
      focused: true,
      state: "normal",
    });
    await chrome.tabs.create({
      windowId: newWindow.id,
      url: `src/workspace/index.html?id=${workspace.workspaceId}`,
      pinned: true,
      active: true,
      index: 0,
    });
  }

  async function onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const urls = JSON.parse(text);
      if (!Array.isArray(urls)) throw new Error("Invalid file format");
      for (const el of urls) {
        if (Array.isArray(el) && el.length === 2 && typeof el[1] === "string") {
          chrome.tabs.create({ url: el[1] });
        } else {
          // Handle legacy format if needed, but existing code threw error for non-arrays-of-length-2 generally,
          // except restore logic had stringent check.
          throw new Error("Invalid tab format!");
        }
      }
    } catch (err: any) {
      alert("Error loading file: " + err.message);
    }
    // Clear input
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
          break; // existing logic broke here
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

<h3>Tab Saver</h3>

<button on:click={handleSave}>{saveButtonText}</button>
<button on:click={handleRestore}>📂 Restore Tabs</button>
<button on:click={handleAppend}>💾📂 Append Tabs</button>

<div class="separator"></div>

<button on:click={handleManage}>🔍 Show All Windows & Tabs</button>
<button on:click={handleMakeWorkspace}>✨ Make this a Managed Window</button>
<button on:click={handleCreateWorkspace}>✨ Create a Managed Window</button>

<div class="separator"></div>

<button on:click={setFolder}>📁 Set Backup Folder</button>
<div class="folder-status">{folderStatus}</div>

<input
  type="file"
  accept=".json"
  bind:this={fileInput}
  on:change={onFileChange}
/>
<input
  type="file"
  accept=".json"
  bind:this={appendInput}
  on:change={onAppendChange}
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
