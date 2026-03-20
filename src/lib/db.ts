const DB_NAME = "TabManagerDB";
const DIRECTORY_STORE = "config";
const DIRECTORY_HANDLE_KEY = "directoryHandle";
const FAVICON_STORE = "favicons";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(request.error ?? new Error("IndexedDB request failed"));
    });
}

async function getStoreValue<T>(
    storeName: string,
    key: IDBValidKey,
): Promise<T | null> {
    const db = await openIndexedDB();
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    const value = await requestToPromise<T | undefined>(request);
    return value ?? null;
}

async function setStoreValue<T>(
    storeName: string,
    key: IDBValidKey,
    value: T,
): Promise<void> {
    const db = await openIndexedDB();
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).put(value, key);
    await requestToPromise(request);
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    return getStoreValue<FileSystemDirectoryHandle>(DIRECTORY_STORE, DIRECTORY_HANDLE_KEY);
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    await setStoreValue(DIRECTORY_STORE, DIRECTORY_HANDLE_KEY, handle);
}

export async function deleteFile(filename: string): Promise<void> {
    const handle = await getDirectoryHandle();
    if (!handle) throw new Error("No directory handle");
    await handle.removeEntry(filename);
}


export function openIndexedDB(): Promise<IDBDatabase> {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(DIRECTORY_STORE)) {
            db.createObjectStore(DIRECTORY_STORE);
        }
        if (!db.objectStoreNames.contains(FAVICON_STORE)) {
            db.createObjectStore(FAVICON_STORE);
        }
    };
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
