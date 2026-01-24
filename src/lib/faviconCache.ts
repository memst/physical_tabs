import { openIndexedDB } from "./db";

const FAVICON_STORE = 'favicons';


function getDomain(url: string): string | null {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}

function tabFaviconUrl(tabUrl: string): string {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", tabUrl);
    url.searchParams.set("size", "32");
    return url.toString();
}

async function storeFavicon(db: IDBDatabase, domain: string, dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(FAVICON_STORE, "readwrite");
        const store = tx.objectStore(FAVICON_STORE);
        const req = store.put(dataUrl, domain);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function saveFavicon(db: IDBDatabase, tabUrl: string, faviconUrl?: string): Promise<void> {
    const domain = getDomain(tabUrl);
    if (!domain) return;

    if (faviconUrl && faviconUrl.startsWith("data:")) {
        await storeFavicon(db, domain, faviconUrl);
        return;
    }

    try {
        const faviconFetch = await fetch(tabFaviconUrl(tabUrl));
        const blob = await faviconFetch.blob();

        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const result = reader.result as string;
                await storeFavicon(db, domain, result);
                resolve();
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to fetch/save favicon for", domain, e);
    }
}

function getFaviconInternal(db: IDBDatabase, domain: string): Promise<string | null> {
    const faviconRequest = db.transaction(FAVICON_STORE, "readonly").objectStore(FAVICON_STORE).get(domain);
    return new Promise<string | null>((resolve, reject) => {
        faviconRequest.onsuccess = () => resolve(faviconRequest.result as string || null);
        faviconRequest.onerror = () => resolve(null);
    });
}

export async function getFavicon(tabUrl: string, faviconUrl?: string): Promise<string | null> {
    // TODO: This getFavicon function is slightly buggy because it will
    // prioritize the cached favicon for the domain no matter what. A better
    // solution would be to prioritize faviconUrl and force-update the cache if
    // it is different.
    const domain = getDomain(tabUrl);
    if (!domain) return null;

    const db = await openIndexedDB();
    const favicon = await getFaviconInternal(db, domain);
    if (favicon) return favicon;

    await saveFavicon(db, tabUrl, faviconUrl);
    return getFaviconInternal(db, domain);
}
