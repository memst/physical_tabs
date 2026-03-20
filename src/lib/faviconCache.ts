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

async function storeFavicon(db: IDBDatabase, domain: string, dataUrl: string): Promise<void> {
    const request = db.transaction(FAVICON_STORE, "readwrite").objectStore(FAVICON_STORE).put(dataUrl, domain);
    await requestToPromise(request);
}

async function saveFavicon(
    db: IDBDatabase,
    tabUrl: string,
    faviconUrl?: string,
): Promise<string | null> {
    const domain = getDomain(tabUrl);
    if (!domain) return null;

    if (faviconUrl && faviconUrl.startsWith("data:")) {
        await storeFavicon(db, domain, faviconUrl);
        return faviconUrl;
    }

    try {
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
        await storeFavicon(db, domain, dataUrl);
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
    const preferredFavicon = await saveFavicon(db, tabUrl, faviconUrl);
    if (preferredFavicon) return preferredFavicon;

    const cachedFavicon = await getFaviconInternal(db, domain);
    if (cachedFavicon) return cachedFavicon;

    const fetchedFavicon = await saveFavicon(db, tabUrl);
    if (fetchedFavicon) return fetchedFavicon;

    return getFaviconInternal(db, domain);
}
