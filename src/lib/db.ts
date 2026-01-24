const DB_NAME = 'TabManagerDB';
const DIRECTORY_STORE = 'config';

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await openIndexedDB();
    const transaction = db.transaction([DIRECTORY_STORE], "readonly");
    const store = transaction.objectStore(DIRECTORY_STORE);
    const getRequest = store.get('directoryHandle');
    return new Promise((resolve, reject) => {

        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
            resolve(getRequest.result as FileSystemDirectoryHandle || null);
        };
    });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await openIndexedDB();
    const transaction = db.transaction([DIRECTORY_STORE], "readwrite");
    const store = transaction.objectStore(DIRECTORY_STORE);
    const putRequest = store.put(handle, 'directoryHandle');
    return new Promise((resolve, reject) => {
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
    })
}


export function openIndexedDB(): Promise<IDBDatabase> {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(DIRECTORY_STORE)) {
            db.createObjectStore(DIRECTORY_STORE);
        }
        // Add favicons store
        if (!db.objectStoreNames.contains('favicons')) {
            db.createObjectStore('favicons');
        }
    };
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
