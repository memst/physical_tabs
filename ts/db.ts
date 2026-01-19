const DB_NAME = 'TabManagerDB';
const STORE_NAME = 'config';

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    return new Promise((resolve, reject) => {
        const request = checkIndexedDB();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get('directoryHandle');

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                resolve(getRequest.result as FileSystemDirectoryHandle || null);
            };
        };
    });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = checkIndexedDB();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const putRequest = store.put(handle, 'directoryHandle');

            putRequest.onerror = () => reject(putRequest.error);
            putRequest.onsuccess = () => resolve();
        };
    });
}

function checkIndexedDB(): IDBOpenDBRequest {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };
    return request;
}
