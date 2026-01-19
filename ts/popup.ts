
import { createWorkspace, Workspace, WorkspaceStorage } from "./workspaceStorage.js"
import { getDirectoryHandle, saveDirectoryHandle } from "./db.js";

// Folder Management
let currentHandle: FileSystemDirectoryHandle | null = null;
const statusDiv = document.getElementById('folderStatus');

async function updateFolderStatus() {
    try {
        const handle = await getDirectoryHandle();
        if (handle) {
            currentHandle = handle;
            if (statusDiv) statusDiv.textContent = `Folder: ${currentHandle.name}`;
        }
    } catch (e) {
        console.error("Failed to load handle:", e);
    }
}
updateFolderStatus();

document.getElementById('setFolder')?.addEventListener('click', async () => {
    try {
        const handle = await window.showDirectoryPicker();
        currentHandle = handle;
        await saveDirectoryHandle(handle);
        if (statusDiv) statusDiv.textContent = `Folder: ${handle.name}`;
    } catch (err) {
        console.log("Folder selection cancelled or failed", err);
    }
});

async function saveCurrentWindow(additionaTabs?: string[][], filename?: string) {
    console.log("Saving current window");
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabs_to_save = tabs.filter(tab => !(tab.url?.startsWith("chrome-extension://icbcnjlaegndjabnjbaeihnnmidbfigk")))
    const new_tabs = tabs_to_save.map(tab => [tab.title || "", tab.url!]);
    const final_tabs = additionaTabs?.concat(new_tabs) || new_tabs;
    const jsonContent = JSON.stringify(final_tabs, null, 2);

    // Try saving to folder if handle exists
    if (currentHandle) {
        try {
            // Verify permission
            const verifyPermission = async (handle: FileSystemDirectoryHandle) => {
                const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
                if ((await handle.queryPermission(options)) === 'granted') return true;
                if ((await handle.requestPermission(options)) === 'granted') return true;
                return false;
            };

            if (await verifyPermission(currentHandle)) {
                const name = filename || `tabs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                // Add .json if missing
                const finalName = name.endsWith('.json') ? name : `${name}.json`;

                const fileHandle = await currentHandle.getFileHandle(finalName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();

                // Visual feedback
                const btn = document.getElementById('save');
                if (btn) {
                    const original = btn.textContent;
                    btn.textContent = "Saved!";
                    setTimeout(() => { if (original) btn.textContent = original; }, 1500);
                }

                // Close tabs (replicating original behavior)
                chrome.tabs.remove(tabs_to_save.map(tab => tab.id!));
                return;
            }
        } catch (err) {
            console.error("Failed to save to folder:", err);
            alert("Failed to save to folder. Falling back to download.");
        }
    }

    // Fallback to original download behavior
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    let downloadId: number | undefined = undefined;

    function onChanged({ id, state }: chrome.downloads.DownloadDelta): void {
        if (id === downloadId && state && state.current === "complete") {
            chrome.downloads.onChanged.removeListener(onChanged);
            chrome.tabs.remove(tabs_to_save.map(tab => tab.id!))
        }
    }

    chrome.downloads.onChanged.addListener(onChanged);
    console.log("Added listener");

    chrome.downloads.download({
        url,
        filename: filename || 'tabs.json',
        saveAs: true
    })
        .then(id => {
            console.log("Download started with ID: ", id);
            downloadId = id
        })
        .catch(err => {
            alert("Download failed: " + err);
            return undefined;
        });

}

// Handle save tabs (current window only)
document.getElementById('save')!.addEventListener('click', async () => {
    // If folder is set, we can skip the prompt if we want, OR ask for name.
    // The requirement says "automatically saves all json tab files into that folder".
    // I'll keep the prompt to allow naming, but it's not strictly "automatic" if prompt exists.
    // However, "whenever user asks to export... automatically written to that folder" implies using that folder instead of picking one.
    // I will keep the name prompt.

    // Ask the user for a filename
    const rawName = window.prompt('Enter a name for the saved tabs (without extension):', 'tabs_window');
    // If the user cancelled the prompt, do nothing
    if (rawName === null) return;

    // Sanitize: lowercase, replace non-alphanumerics with underscores, collapse underscores
    let name = rawName.toLowerCase();
    name = name.replace(/[^a-z0-9]+/g, '_');
    name = name.replace(/_+/g, '_');
    name = name.replace(/^_+|_+$/g, '');
    if (!name) name = 'tabs';

    // Ensure prefix and suffix
    if (!name.startsWith('tabs_')) name = `tabs_${name}`;
    if (!name.endsWith('.json')) name = `${name}.json`;

    await saveCurrentWindow(undefined, name);
});

// Handle restore tabs
document.getElementById('load')!.addEventListener('click', () => {
    document.getElementById('fileInput')!.click();
});


document.getElementById('fileInput')!.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
        const urls = JSON.parse(text);
        if (!Array.isArray(urls)) throw new Error("Invalid file format");
        for (const el of urls) {
            if (Array.isArray(el) && el.length === 2) {
                chrome.tabs.create({ url: el[1] });
            } else {
                throw new Error("Invalid tab format!");
            }
        }
    } catch (err: any) {
        alert("Error loading file: " + err.message);
    }
});

document.getElementById('append')!.addEventListener('click', () => {
    document.getElementById('appendInput')!.click();
});

document.getElementById('appendInput')!.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const text = await file.text();

    var old_tabs = [];
    try {
        const urls = JSON.parse(text);
        if (!Array.isArray(urls)) throw new Error("Invalid file format");
        for (const el of urls) {
            var tab: string[] | null = null;
            if (typeof el === 'string') {
                tab = ["", el];
            } else if (Array.isArray(el) && el.length === 2) {
                tab = el;
            } else {
                console.error("Invalid tab format", el);
                break;
            }
            old_tabs.push(tab);
        }


    } catch (err: any) {
        alert("Error loading file: " + err.message);
    }

    saveCurrentWindow(old_tabs, file.name);

});

// Handle showing the tab manager
document.getElementById('manage')!.addEventListener('click', () => {
    chrome.tabs.create({
        url: 'tabs.html',
        active: true
    });
});


document.getElementById('makeWorkspace')!.addEventListener('click', async () => {
    const workspace = await createWorkspace();

    const currentWindow = await chrome.windows.getCurrent();

    // Create the pinned workspace tab in the new window
    await chrome.tabs.create({
        windowId: currentWindow.id,
        url: `workspace.html?id=${workspace.workspaceId}`,
        pinned: true,
        active: true,
        index: 0  // This ensures it's the leftmost tab
    });
});


// Handle creating a managed window
document.getElementById('createWorkspace')!.addEventListener('click', async () => {

    const workspace = await createWorkspace();

    // Create a new window
    const newWindow = await chrome.windows.create({
        focused: true,
        state: 'normal'
    });

    // Create the pinned workspace tab in the new window
    await chrome.tabs.create({
        windowId: newWindow.id,
        url: `workspace.html?id=${workspace.workspaceId}`,
        pinned: true,
        active: true,
        index: 0  // This ensures it's the leftmost tab
    });
});

