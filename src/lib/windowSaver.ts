import { getDirectoryHandle } from "./db";
import type { SavedWindowFile } from "./windowFile";

type TabSnapshot = {
    title?: string;
    url?: string;
    id?: number;
};

function isExtensionTab(tab: TabSnapshot): boolean {
    return tab.url?.startsWith(`chrome-extension://${chrome.runtime.id}`) ?? false;
}

function toSavedTabs(tabs: TabSnapshot[]): string[][] {
    return tabs
        .filter((tab): tab is TabSnapshot & { url: string } => {
            return typeof tab.url === "string" && !isExtensionTab(tab);
        })
        .map((tab) => [tab.title ?? "", tab.url]);
}

function getClosableTabIds(tabs: TabSnapshot[]): number[] {
    return tabs
        .filter(
            (tab): tab is TabSnapshot & { url: string; id: number } =>
                typeof tab.url === "string" &&
                !isExtensionTab(tab) &&
                typeof tab.id === "number",
        )
        .map((tab) => tab.id);
}

function normalizeFilename(filename?: string): string {
    const baseName = filename || `tabs_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    return baseName.endsWith(".json") ? baseName : `${baseName}.json`;
}

async function hasReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const options: FileSystemHandlePermissionDescriptor = {
        mode: "readwrite",
    };

    if ((await handle.queryPermission(options)) === "granted") return true;
    if ((await handle.requestPermission(options)) === "granted") return true;
    return false;
}

async function writeJsonFile(
    handle: FileSystemDirectoryHandle,
    filename: string,
    content: string,
): Promise<void> {
    const fileHandle = await handle.getFileHandle(filename, {
        create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

async function closeTabs(tabs: TabSnapshot[]): Promise<void> {
    const ids = getClosableTabIds(tabs);
    if (ids.length > 0) {
        await chrome.tabs.remove(ids);
    }
}

export async function saveTabs(
    tabs: TabSnapshot[],
    options: {
        filename?: string;
        additionalTabs?: string[][];
        closeTabs?: boolean;
        handle?: FileSystemDirectoryHandle | null;
    } = {},
): Promise<void> {
    const savedTabs = toSavedTabs(tabs);
    const finalTabs = [...(options.additionalTabs ?? []), ...savedTabs];
    const jsonContent = JSON.stringify(finalTabs, null, 2);
    const closeTabsRequested = options.closeTabs ?? false;
    const tabsToClose = closeTabsRequested ? tabs : [];

    let handle = options.handle;
    if (!handle) {
        handle = await getDirectoryHandle();
    }

    if (handle) {
        try {
            if (await hasReadWritePermission(handle)) {
                await writeJsonFile(handle, normalizeFilename(options.filename), jsonContent);
                await closeTabs(tabsToClose);
                return;
            }
        } catch (err) {
            console.error("Failed to save to folder:", err);
        }
    }

    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
        {
            url,
            filename: normalizeFilename(options.filename),
            saveAs: true,
        },
        (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Download failed: " + chrome.runtime.lastError.message);
                URL.revokeObjectURL(url);
                return;
            }

            if (options.closeTabs) {
                const onChanged = ({ id, state }: chrome.downloads.DownloadDelta) => {
                    if (id === downloadId && state?.current === "complete") {
                        chrome.downloads.onChanged.removeListener(onChanged);
                        URL.revokeObjectURL(url);
                        void closeTabs(tabsToClose);
                    }
                };
                chrome.downloads.onChanged.addListener(onChanged);
            } else {
                URL.revokeObjectURL(url);
            }
        },
    );
}

export async function appendTabsToFile(file: SavedWindowFile): Promise<void> {
    const currentWindow = await chrome.tabs.query({ currentWindow: true });

    await saveTabs(
        currentWindow.map((tab) => ({
            title: tab.title,
            url: tab.url,
            id: tab.id,
        })),
        {
            filename: file.filename,
            additionalTabs: file.tabs.map((tab) => [tab.title, tab.url]),
            closeTabs: false,
        },
    );
}
