type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };

export type WorkspaceId = Distinct<string, 'WorkspaceId'>;
export type TabId = Distinct<number, 'TabId'>;

export interface Workspace extends Record<string, unknown> {
    created: number;
    lastAccessed: number;
    name?: string;
    workspaceId: string;
    windows: number[];
}

export type WorkspaceStorage = Record<string, Workspace>;

export async function getWorkspaces(): Promise<WorkspaceStorage> {
    const result = await chrome.storage.local.get('workspaces');
    const workspaces = result.workspaces || {};
    return workspaces
}
export async function createWorkspace() {
    const workspaceId = 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const workspaces = await getWorkspaces();

    const workspace: Workspace = {
        created: Date.now(),
        lastAccessed: Date.now(),
        name: `Workspace ${workspaceId}`,  // Default name
        workspaceId: workspaceId,
        windows: []  // Initialize empty windows array
    }
    // Create new workspace data
    workspaces[workspaceId] = workspace;
    await chrome.storage.local.set({ workspaces });
    return workspace;

}

export async function getWindowWorkspace(window: chrome.windows.Window): Promise<[WorkspaceId, TabId] | null> {
    for (const tab of window.tabs || []) {
        if (!tab.pinned) break;
        if (!tab.url) continue;

        const url = new URL(tab.url);
        if (url.pathname.endsWith('/workspace.html') || url.pathname.endsWith('workspace.html')) {
            const workspaceId = url.searchParams.get('id');
            if (workspaceId == null) { await chrome.tabs.remove(tab.id!); }
            else return [workspaceId as WorkspaceId, tab.id as TabId];
        }
    }
    return null;

}

export async function refreshWorkspaceStorage(): Promise<WorkspaceStorage> {
    const workspaces = (await getWorkspaces());
    for (const workspace of Object.values(workspaces)) {
        workspace.windows = [];
    }
    const windows = await chrome.windows.getAll({ populate: true });
    windows.forEach(async window => {
        const workspaceId = (await getWindowWorkspace(window))?.[0];
        if (workspaceId !== undefined) {
            workspaces[workspaceId].windows.push(window.id!);
        }
    }
    );
    await chrome.storage.local.set({ workspaces: workspaces });
    return workspaces;
}

export async function removeWindowFromWorkspace(windowId: number, workspaceId: WorkspaceId): Promise<void> {
    const workspaces = await getWorkspaces();
    const workspace = workspaces[workspaceId];
    if (!workspace) return;
    if (workspace.windows.includes(windowId)) {
        const index = workspace.windows.indexOf(windowId);
        workspace.windows.splice(index, 1);
        await chrome.storage.local.set({ workspaces });
    }
}

export async function deleteEmptyWorkspaces(): Promise<boolean> {
    var changed = false;
    const workspaces = await getWorkspaces();
    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
        if (workspace.windows.length === 0) {
            delete workspaces[workspaceId];
            changed = true;
        }
    }
    await chrome.storage.local.set({ workspaces });
    return changed;
}
