type SavedTabV3 = {
    title: string;
    url: string;
}

export type SavedTab = SavedTabV3;

type SavedWindowV3 = {
    version?: string;
    tabs: SavedTab[];
}
export type SavedWindow = SavedWindowV3;
export type SavedWindowFile = SavedWindowV3 & {
    filename: string;
}

function parseV1_V2(json: any[]): SavedWindowV3 {
    const tabs = json.map((el) => {
        if (Array.isArray(el) && el.length === 2 && typeof el[1] === "string") {
            return {
                title: el[0],
                url: el[1],
            };
        } else {
            // Handle legacy format if needed, but existing code threw error for non-arrays-of-length-2 generally,
            // except restore logic had stringent check.
            throw new Error("Parsing V1 tab format is not supported.");
        }
    });
    return {
        version: "3",
        tabs,
    }
}

function of_V3(json: Record<string, any>): SavedWindowV3 {
    return {
        version: "3",
        tabs: json.tabs,
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
            return of_V3(json2);
        }
        throw new Error("Unsupported file format");
    } catch (err: any) {
        console.error("Error loading file: " + err.message);
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
