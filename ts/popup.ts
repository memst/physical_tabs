
console.log("test");
import { createWorkspace, Workspace, WorkspaceStorage } from "./workspaceStorage.js"

// ...existing code...
// Handle save tabs (current window only)
document.getElementById('save')!.addEventListener('click', async () => {
    // Query only tabs from the current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urls = tabs.map(tab => tab.url);

    const blob = new Blob([JSON.stringify(urls, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url,
        filename: 'tabs.json',
        saveAs: true
    });
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
        for (const url of urls) {
            chrome.tabs.create({ url });
        }
    } catch (err: any) {
        alert("Error loading file: " + err.message);
    }
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

