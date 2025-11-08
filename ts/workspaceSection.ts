import { WorkspaceStorage, getWindowWorkspace, deleteEmptyWorkspaces, removeWindowFromWorkspace, getWorkspaces } from "./workspaceStorage.js";

// Function to delete a workspace
async function deleteWorkspace(workspaceId: string, redrawCallback: () => Promise<void>): Promise<void> {
    const result = await chrome.storage.local.get('workspaces');
    const workspaces: WorkspaceStorage = result.workspaces || {};

    delete workspaces[workspaceId];
    await chrome.storage.local.set({ workspaces });
    await redrawCallback();
}

export async function createWorkspacesSection(redrawCallback: () => Promise<void>) {
    // Create workspaces section
    const workspacesSection = document.createElement('div');
    workspacesSection.className = 'workspaces-section';
    const workspacesTitle = document.createElement('h2');
    workspacesTitle.textContent = 'Workspaces';
    workspacesSection.appendChild(workspacesTitle);

    const workspaces = await getWorkspaces();
    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
        const workspaceDiv = document.createElement('div');
        workspaceDiv.className = 'workspace-item';

        const header = document.createElement('div');
        header.className = 'workspace-header';

        const title = document.createElement('span');
        title.className = 'workspace-title';
        title.textContent = workspace.name || workspaceId;
        header.appendChild(title);

        const details = document.createElement('span');
        details.className = 'workspace-details';
        details.textContent = `${workspace.windows.length} windows • Created: ${new Date(workspace.created).toLocaleDateString()}`;
        header.appendChild(details);

        // Button: add the current window to this workspace
        const addButton = document.createElement('button');
        addButton.textContent = '➕ Add current window';
        addButton.className = 'add-workspace-window';
        addButton.onclick = async () => {
            try {
                const currentWindow = await chrome.windows.getCurrent({ populate: true });
                const currentWorkspace = await getWindowWorkspace(currentWindow);
                if (currentWorkspace) {
                    const [oldWorkspaceId, tabId] = currentWorkspace;
                    removeWindowFromWorkspace(currentWindow.id!, oldWorkspaceId);

                    chrome.tabs.update(
                        tabId,
                        {
                            url: `workspace.html?id=${workspaceId}`
                        }
                    )
                }
                else {
                    // Create a pinned workspace tab in the current window (leftmost)
                    await chrome.tabs.create({
                        windowId: currentWindow.id,
                        url: `workspace.html?id=${workspaceId}`,
                        pinned: true,
                        active: false,
                        index: 0
                    });
                }
            } catch (err) {
                console.error('Failed to add current window to workspace', err);
            }
        };
        header.appendChild(addButton);

        if (workspace.windows.length === 0) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '🗑️ Delete';
            deleteButton.className = 'delete-workspace';
            deleteButton.onclick = () => deleteWorkspace(workspaceId, redrawCallback);
            header.appendChild(deleteButton);
        }

        workspaceDiv.appendChild(header);
        workspacesSection.appendChild(workspaceDiv);
    }

    // Button to delete all empty workspaces (no registered windows)
    const emptyCount = Object.values(workspaces).filter(w => !w.windows || w.windows.length === 0).length;
    if (emptyCount > 0) {
        const purgeDiv = document.createElement('div');
        purgeDiv.style.marginTop = '12px';
        const purgeButton = document.createElement('button');
        purgeButton.textContent = `🧹 Delete ${emptyCount} empty workspace${emptyCount > 1 ? 's' : ''}`;
        purgeButton.className = 'delete-empty-workspaces';
        purgeButton.onclick = async () => {
            const changed = await deleteEmptyWorkspaces();
            if (changed) {
                await redrawCallback();
            }
        };
        purgeDiv.appendChild(purgeButton);
        workspacesSection.appendChild(purgeDiv);
    }

    return workspacesSection;


}