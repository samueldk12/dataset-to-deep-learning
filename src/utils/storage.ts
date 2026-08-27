import { DatasetProject } from '../types/dataset';

const DB_NAME = 'AnnotateX_DB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const KEY_CURRENT = 'current_project';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToStorage(project: DatasetProject): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(project, KEY_CURRENT);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback: try saving light version without large image URLs to LocalStorage
    try {
      localStorage.setItem(KEY_CURRENT, JSON.stringify({
        ...project,
        images: project.images.map(img => ({
          ...img,
          url: img.url.length > 50000 ? '' : img.url,
        })),
      }));
    } catch {
      // ignore
    }
  }
}

export async function loadProjectFromStorage(): Promise<DatasetProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_CURRENT);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(KEY_CURRENT);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }
}

export async function clearProjectStorage(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY_CURRENT);
  } catch {
    localStorage.removeItem(KEY_CURRENT);
  }
}
