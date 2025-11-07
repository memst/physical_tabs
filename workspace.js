document.addEventListener('DOMContentLoaded', async () => {
    // Get workspace ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('id');

    if (!workspaceId) {
        document.getElementById('window-info').textContent = 'Error: No workspace ID provided';
        return;
    }

    const currentWindow = await chrome.windows.getCurrent();

    // Get workspace data from storage
    const result = await chrome.storage.local.get('workspaces');
    const workspaces = result.workspaces || {};
    const workspace = workspaces[workspaceId];

    if (!workspace) {
        document.getElementById('window-info').textContent = 'Error: Workspace not found';
        return;
    }

    document.getElementById('window-info').textContent =
        `Workspace ID: ${workspaceId}\nWindow ID: ${currentWindow.id}\nCreated: ${new Date(workspace.created).toLocaleString()}`;
});