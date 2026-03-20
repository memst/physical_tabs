type SavedTabV3 = {
    title: string;
    url: string;
}

export type SavedTab = SavedTabV3;

type SavedWindowV3 = {
    version: "3";
    tabs: SavedTab[];
    title: string | null;
}
export type SavedWindow = SavedWindowV3;
export type SavedWindowFile = SavedWindowV3 & {
    filename: string;
}

function parseV1_V2(json: unknown[]): SavedWindowV3 {
    if (json.every((el) => typeof el === "string")) {
        return {
            version: "3",
            tabs: json.map((url) => ({
                title: "",
                url,
            })),
            title: null,
        };
    }

    if (
        json.every(
            (el): el is [unknown, string] =>
                Array.isArray(el) && el.length === 2 && typeof el[1] === "string",
        )
    ) {
        return {
            version: "3",
            tabs: json.map((el) => ({
                title: typeof el[0] === "string" ? el[0] : "",
                url: el[1],
            })),
            title: null,
        };
    }

    throw new Error("Unknown file format.");
}

function parseV3(json: Record<string, unknown>): SavedWindowV3 {
    if (!Array.isArray(json.tabs)) {
        throw new Error("Unsupported file format");
    }

    return {
        version: "3",
        tabs: json.tabs.map((tab) => {
            if (typeof tab !== "object" || tab === null || !("url" in tab)) {
                throw new Error("Unsupported file format");
            }

            const typedTab = tab as Record<string, unknown>;
            if (typeof typedTab.url !== "string") {
                throw new Error("Unsupported file format");
            }

            return {
                title: typeof typedTab.title === "string" ? typedTab.title : "",
                url: typedTab.url,
            };
        }),
        title: typeof json.title === "string" ? json.title : null,
    };
}

async function parseFileInternal(file: File): Promise<SavedWindow> {
    const text = await file.text();
    try {
        const json1 = JSON.parse(text);
        if (Array.isArray(json1)) {
            return parseV1_V2(json1);
        }
        const json2 = json1 as Record<string, unknown>;
        if (json2.version === "3") {
            return parseV3(json2);
        }
        throw new Error("Unsupported file format");
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error loading file ${file.name}: ${message}`);
        throw err;
    }
}

export async function parseFile(file: File): Promise<SavedWindowFile> {
    const window = await parseFileInternal(file);
    return {
        ...window,
        filename: file.name,
    };
}

export function compareSavedWindowFile(a: SavedWindowFile, b: SavedWindowFile): number {
    return a.filename.localeCompare(b.filename);
}

export async function restoreAsWindow(windowFile: SavedWindowFile): Promise<chrome.windows.Window> {
    const urls = windowFile.tabs.map(t => t.url);
    return chrome.windows.create({ url: urls, focused: true });
}

export function serialize(window: SavedWindow): string {
    return JSON.stringify(window, null, 2);
}

export function createSavedWindowFromChromeWindow(window: chrome.windows.Window): SavedWindow {
    const tabs: SavedTab[] = (window.tabs || [])
        .filter(
            (tab): tab is chrome.tabs.Tab & { url: string } =>
                typeof tab.url === "string" &&
                !tab.url.startsWith(`chrome-extension://${chrome.runtime.id}`),
        )
        .map((tab) => ({
            title: typeof tab.title === "string" ? tab.title : "",
            url: tab.url,
        }));

    return {
        version: "3",
        tabs,
        title: null
    };
}
