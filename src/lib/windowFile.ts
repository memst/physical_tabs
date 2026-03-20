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

function parseV1_V2(json: any[]): SavedWindowV3 {
    let tabs: SavedTab[];

    const isStringArray = json.every(el => typeof el === 'string');
    const isTupleArray = json.every(el => Array.isArray(el) && el.length === 2 && typeof el[1] === 'string');

    if (isTupleArray) {
        tabs = json.map(el => ({
            title: el[0],
            url: el[1]
        }));
    } else if (isStringArray) {
        tabs = json.map(el => ({
            title: "",
            url: el
        }));
    } else {
        throw new Error("Unknown file format.");
    }

    return {
        version: "3",
        tabs,
        title: null
    }
}

function parseV3(json: Record<string, any>): SavedWindowV3 {
    return {
        version: "3",
        tabs: json.tabs,
        title: json.title || null
    }
}

async function parseFileInternal(file: File): Promise<SavedWindow> {
    const text = await file.text();
    try {
        const json1 = JSON.parse(text);
        if (Array.isArray(json1)) {
            return parseV1_V2(json1);
        }
        const json2: Record<string, any> = json1;
        if (json2.version === "3") {
            return parseV3(json2);
        }
        throw new Error("Unsupported file format");
    } catch (err: any) {
        console.error(`Error loading file ${file.name}: ` + err.message);
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
        .filter(t => t.url && !t.url.startsWith(`chrome-extension://${chrome.runtime.id}`))
        .map(t => ({
            title: t.title || "",
            url: t.url!
        }));

    return {
        version: "3",
        tabs,
        title: null
    };
}
