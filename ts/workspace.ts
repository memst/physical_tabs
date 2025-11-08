
import { WorkspaceStorage } from './workspaceStorage.js'
import { createWorkspacesSection } from './workspaceSection.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Get workspace ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('id');

    if (!workspaceId) {
        document.getElementById('window-info')!.textContent = 'Error: No workspace ID provided';
        return;
    }

    const currentWindow = await chrome.windows.getCurrent();

    // Get workspace data from storage
    const result = await chrome.storage.local.get('workspaces');
    const workspaces: WorkspaceStorage = result.workspaces || {};
    const workspace = workspaces[workspaceId];

    if (!workspace) {
        document.getElementById('window-info')!.textContent = 'Error: Workspace not found';
        return;
    }

    if (!currentWindow.id) {
        document.getElementById('window-info')!.textContent = 'Error: Unable to get current window ID';
        return;
    }

    // Register this window with the workspace if not already registered
    if (!workspace.windows.includes(currentWindow.id)) {
        workspace.windows.push(currentWindow.id);
        await chrome.storage.local.set({ workspaces });
    }

    // Update window info
    const windowInfo = document.getElementById('window-info')!;
    windowInfo.style.whiteSpace = 'pre-line';
    windowInfo.innerHTML = `
        <div style="margin-bottom: 10px"><strong>Workspace ID:</strong> ${workspaceId}</div>
        <div style="margin-bottom: 10px"><strong>Window ID:</strong> ${currentWindow.id}</div>
        <div style="margin-bottom: 10px"><strong>Created:</strong> ${new Date(workspace.created).toLocaleString()}</div>
        <div style="margin-bottom: 10px"><strong>Active Windows:</strong> ${workspace.windows.length}</div>
    `;

    const workspacesContainer = document.getElementById('workspaces-container')!;
    async function redrawWorkspaces() {
        workspacesContainer.innerHTML = '';
        workspacesContainer.appendChild(await createWorkspacesSection(redrawWorkspaces));
    }
    await redrawWorkspaces();

    // Setup workspace name input
    const nameInput = document.getElementById('workspaceName') as HTMLInputElement;
    const saveButton = document.getElementById('saveWorkspaceName') as HTMLButtonElement;
    const savedIndicator = document.getElementById('savedIndicator') as HTMLSpanElement;

    // Set initial name
    nameInput.value = workspace.name || '';

    const workspaceIdnn = workspaceId;

    // Handle name saving
    async function saveWorkspaceName() {
        const newName = nameInput.value.trim();

        // Update storage
        workspaces[workspaceIdnn] = {
            ...workspace,
            name: newName,
            lastAccessed: Date.now()
        };

        await chrome.storage.local.set({ workspaces });

        // Show saved indicator
        savedIndicator.classList.add('show');
        setTimeout(() => {
            savedIndicator.classList.remove('show');
        }, 2000);

        // Update window title if name is set
        document.title = newName ? `${newName} - Workspace Manager` : 'Workspace Manager';
    }

    // Save on button click
    saveButton.addEventListener('click', saveWorkspaceName);

    // Save on Enter key
    nameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            saveWorkspaceName();
        }
    });

    // Set initial window title
    document.title = workspace.name ? `${workspace.name} - Workspace Manager` : 'Workspace Manager';
});
