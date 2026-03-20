import { saveDirectoryHandle, getDirectoryHandle } from "./db";

export async function saveTabs(
    tabs: { title?: string, url?: string, id?: number }[],
    options: {
        filename?: string,
        additionalTabs?: string[][],
        closeTabs?: boolean,
        handle?: FileSystemDirectoryHandle | null
    } = {}
): Promise<void> {
    console.log("Saving window...");

    // Filter out our extension tabs
    const extensionId = chrome.runtime.id;
    const active_tabs = tabs.filter(
        (tab) => !tab.url?.startsWith(`chrome-extension://${extensionId}`),
    );

    const new_tabs = active_tabs.map((tab) => [tab.title || "", tab.url!]);
    const final_tabs =
        options.additionalTabs?.concat(new_tabs as string[][]) || new_tabs;
    const jsonContent = JSON.stringify(final_tabs, null, 2);

    let handle = options.handle;
    if (!handle) {
        handle = await getDirectoryHandle();
    }

    if (handle) {
        try {
            const verifyPermission = async (handle: FileSystemDirectoryHandle) => {
                const opts: FileSystemHandlePermissionDescriptor = {
                    mode: "readwrite",
                };
                if ((await handle.queryPermission(opts)) === "granted")
                    return true;
                if ((await handle.requestPermission(opts)) === "granted")
                    return true;
                return false;
            };

            if (await verifyPermission(handle)) {
                const name =
                    options.filename ||
                    `tabs_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
                const finalName = name.endsWith(".json") ? name : `${name}.json`;

                const fileHandle = await handle.getFileHandle(finalName, {
                    create: true,
                });
                const writable = await fileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();

                if (options.closeTabs) {
                    const idsToRemove = active_tabs.map(t => t.id).filter((id): id is number => id !== undefined);
                    if (idsToRemove.length > 0) {
                        chrome.tabs.remove(idsToRemove);
                    }
                }
                return;
            }
        } catch (err) {
            console.error("Failed to save to folder:", err);
            // Fallthrough to download
        }
    }

    // Fallback to download
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
        {
            url,
            filename: options.filename || "tabs.json",
            saveAs: true,
        },
        (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Download failed: " + chrome.runtime.lastError.message);
                return;
            }
            // Monitor download to close tabs
            if (options.closeTabs) {
                const onChanged = ({ id, state }: chrome.downloads.DownloadDelta) => {
                    if (id === downloadId && state && state.current === "complete") {
                        chrome.downloads.onChanged.removeListener(onChanged);
                        const idsToRemove = active_tabs.map(t => t.id).filter((id): id is number => id !== undefined);
                        if (idsToRemove.length > 0) {
                            chrome.tabs.remove(idsToRemove);
                        }
                    }
                };
                chrome.downloads.onChanged.addListener(onChanged);
            }
        },
    );
}

import type { SavedWindowFile } from "./windowFile";

export async function appendTabsToFile(file: SavedWindowFile): Promise<void> {
    const currentWindow = await chrome.tabs.query({ currentWindow: true });

    // Normalize current tabs to string array format [title, url] for compatibility with saveTabs 'additionalTabs' option
    // Wait, saveTabs handles 'additionalTabs' as string[][].
    // But we want to merge into the SavedWindowFile structure.

    // Actually, saveTabs overwrites. So we should construct the new full list of tabs.
    // The current saveTabs takes `tabs` (SavedTab-like) and `additionalTabs` (string[][]).

    // Let's reuse saveTabs but be smart about it.
    // 1. Existing tabs from file.
    // 2. New tabs from current window.

    // Re-map existing file tabs to the saveTabs input format
    const existingTabs = file.tabs.map(t => ({
        title: t.title,
        url: t.url
    }));

    // Current window tabs
    const newTabs = currentWindow.map(t => ({
        title: t.title || "",
        url: t.url || "",
        id: t.id
    }));

    // We can just pass `newTabs` as the primary tabs to saveTabs, 
    // and pass existing tabs as `additionalTabs`? 
    // saveTabs filters specific extension URLs from the main list. 
    // It blindly concatenates `additionalTabs`.

    // So if we assume the file content is already clean, we can convert it to string[][] and pass as additionalTabs.
    const additionalTabs = existingTabs.map(t => [t.title, t.url]);

    await saveTabs(newTabs, {
        filename: file.filename,
        additionalTabs: additionalTabs,
        closeTabs: false // Usually appending doesn't verify deletion of source tabs, but popup append DOES close.
        // User requested "similar to popup". Popup append closes tabs?
        // Let's check Popup.svelte logic.
    });

    // Wait, Popup.svelte append logic:
    // 220:     await saveCurrentWindow(old_tabs, file.name);
    // saveCurrentWindow calls saveTabs with closeTabs: true.
    // So yes, we should probably close them or make it optional.
    // For a dashboard button "Append this window to that file", typically you might expect it to just add them.
    // But if it's "Move these tabs to storage", closing is expected.
    // I'll make it NOT close tabs by default for the dashboard because it's less destructive/alarming.
}
