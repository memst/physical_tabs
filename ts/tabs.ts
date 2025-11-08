import { WorkspaceStorage } from './workspaceStorage.js'
import { createWorkspacesSection } from './workspaceSection.js';

// Function to clean up inactive windows from workspaces
async function cleanupInactiveWindows(): Promise<WorkspaceStorage> {
    const result = await chrome.storage.local.get('workspaces');
    const workspaces: WorkspaceStorage = result.workspaces || {};
    const existingWindows = await chrome.windows.getAll();
    const existingWindowIds = new Set(existingWindows.map(w => w.id));
    let hasChanges = false;

    // Clean up each workspace's window list
    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
        if (!workspace.windows) workspace.windows = [];

        const activeWindows = workspace.windows.filter(windowId => existingWindowIds.has(windowId));
        if (activeWindows.length !== workspace.windows.length) {
            workspace.windows = activeWindows;
            hasChanges = true;
        }
    }

    if (hasChanges) {
        await chrome.storage.local.set({ workspaces });
    }

    return workspaces;
}



// Function to display workspaces and windows
async function displayWorkspacesAndWindows(): Promise<void> {
    const workspaces = await cleanupInactiveWindows();
    const windows = await chrome.windows.getAll({ populate: true });
    const container = document.getElementById('windows-container')!;
    container.innerHTML = ''; // Clear existing content

    container.appendChild(await createWorkspacesSection(displayWorkspacesAndWindows));

    // Create windows section
    const windowsSection = document.createElement('div');
    windowsSection.className = 'windows-section';
    const windowsTitle = document.createElement('h2');
    windowsTitle.textContent = 'All Windows';
    windowsSection.appendChild(windowsTitle);

    windows.forEach((window, index) => {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';

        const windowTitle = document.createElement('div');
        windowTitle.className = 'window-title';
        windowTitle.textContent = `Window ${window.id} (${window.tabs!.length} tabs)`;
        windowDiv.appendChild(windowTitle);

        window.tabs!.forEach(tab => {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'tab';

            // Favicon
            const favicon = document.createElement('img');
            favicon.src = tab.favIconUrl || 'chrome://favicon/';
            tabDiv.appendChild(favicon);

            // Tab title
            const title = document.createElement('span');
            title.className = 'tab-title';
            title.textContent = tab.title!;
            tabDiv.appendChild(title);

            // Tab URL
            const url = document.createElement('span');
            url.className = 'tab-url';
            url.textContent = tab.url!;
            tabDiv.appendChild(url);

            // Make the tab div clickable to focus that tab
            tabDiv.addEventListener('click', () => {
                chrome.windows.update(window.id!, { focused: true });
                chrome.tabs.update(tab.id!, { active: true });
            });

            windowDiv.appendChild(tabDiv);
        });

        windowsSection.appendChild(windowDiv);
    });

    container.appendChild(windowsSection);
}

// Initial load
document.addEventListener('DOMContentLoaded', displayWorkspacesAndWindows);

// Refresh every 5 seconds to keep the list updated
setInterval(displayWorkspacesAndWindows, 5000);

