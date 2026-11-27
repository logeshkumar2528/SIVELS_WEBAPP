const DB_NAME = 'sivels-operations-covenants';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Unable to open document store.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('covenantId', 'covenantId', { unique: false });
        store.createIndex('path', 'path', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function completeTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Document store transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('Document store transaction aborted.'));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Document store request failed.'));
  });
}

export async function saveCovenantDocument({ covenantId, path, fileName, file }) {
  if (!file || (!(file instanceof Blob) && !(file instanceof File))) return;

  const normalizedPath = path ? String(path).replace(/\\/g, '/') : '';
  const idKey = covenantId != null ? `id:${covenantId}` : null;
  const pathKey = normalizedPath ? `path:${normalizedPath}` : null;
  if (!idKey && !pathKey) return;

  const db = await openDb();
  try {
    const record = {
      covenantId: covenantId != null ? String(covenantId) : null,
      path: normalizedPath,
      fileName: fileName || file.name || 'document.pdf',
      type: file.type || 'application/pdf',
      blob: file,
      savedAt: Date.now(),
    };
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (idKey) store.put({ ...record, key: idKey });
    if (pathKey) store.put({ ...record, key: pathKey });
    await completeTransaction(tx);
  } finally {
    db.close();
  }
}

export async function getCovenantDocument({ covenantId, path } = {}) {
  const db = await openDb();
  try {
    const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
    if (covenantId != null) {
      const byId = await requestToPromise(store.get(`id:${covenantId}`));
      if (byId?.blob) return byId;
    }
    if (path) {
      const normalized = String(path).replace(/\\/g, '/');
      const byPath = await requestToPromise(store.get(`path:${normalized}`));
      if (byPath?.blob) return byPath;
    }
    return null;
  } finally {
    db.close();
  }
}
