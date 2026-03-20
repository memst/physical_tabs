import { openIndexedDB } from "./db";

const FAVICON_STORE = "favicons";

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

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(request.error ?? new Error("IndexedDB request failed"));
    });
}

async function cacheFaviconDataUrl(db: IDBDatabase, domain: string, dataUrl: string): Promise<void> {
    const request = db.transaction(FAVICON_STORE, "readwrite").objectStore(FAVICON_STORE).put(dataUrl, domain);
    await requestToPromise(request);
}

// These stay separate on purpose: `cacheFaviconDataUrl` only writes an already
// normalized data URL into IndexedDB, while `resolveAndCacheFavicon` may fetch
// or transcode a favicon before delegating to that lower-level cache write.
async function resolveAndCacheFavicon(
    db: IDBDatabase,
    tabUrl: string,
    faviconUrl?: string,
): Promise<string | null> {
    const domain = getDomain(tabUrl);
    if (!domain) return null;

    try {
        if (faviconUrl && faviconUrl.startsWith("data:")) {
            await cacheFaviconDataUrl(db, domain, faviconUrl);
            return faviconUrl;
        }

        const sourceUrl = faviconUrl || tabFaviconUrl(tabUrl);
        const faviconFetch = await fetch(sourceUrl);
        if (!faviconFetch.ok) {
            throw new Error(`Failed to fetch favicon: ${faviconFetch.status}`);
        }
        const blob = await faviconFetch.blob();

        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
        await cacheFaviconDataUrl(db, domain, dataUrl);
        return dataUrl;
    } catch (e) {
        console.warn("Failed to fetch/save favicon for", domain, e);
        return null;
    }
}

function getFaviconInternal(db: IDBDatabase, domain: string): Promise<string | null> {
    const faviconRequest = db.transaction(FAVICON_STORE, "readonly").objectStore(FAVICON_STORE).get(domain);
    return requestToPromise<string | undefined>(faviconRequest)
        .then((result) => result ?? null)
        .catch(() => null);
}

export async function getFavicon(tabUrl: string, faviconUrl?: string): Promise<string | null> {
    const domain = getDomain(tabUrl);
    if (!domain) return null;

    const db = await openIndexedDB();
    const preferredFavicon = await resolveAndCacheFavicon(db, tabUrl, faviconUrl);
    if (preferredFavicon) return preferredFavicon;

    const cachedFavicon = await getFaviconInternal(db, domain);
    if (cachedFavicon) return cachedFavicon;

    const fetchedFavicon = await resolveAndCacheFavicon(db, tabUrl);
    if (fetchedFavicon) return fetchedFavicon;

    return getFaviconInternal(db, domain);
}
