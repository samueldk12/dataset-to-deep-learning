import { DatasetProject } from '../types/dataset';

const DB_NAME = 'AnnotateX_DB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const KEY_CURRENT = 'current_project';
const API_BASE_URL = 'http://localhost:5000/api/datasets';

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

/**
 * Saves dataset folder, config.json, images/ and annotations/ directly on disk through the Python backend.
 */
export async function saveProjectToDisk(project: DatasetProject): Promise<boolean> {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.debug('Servidor Python offline ou inacessível para salvar em disco:', err);
  }
  return false;
}

/**
 * Loads all dataset folders and configurations directly from the local file system.
 */
export async function loadProjectsFromDisk(): Promise<DatasetProject[]> {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.datasets)) {
        return data.datasets;
      }
    }
  } catch (err) {
    console.debug('Servidor Python offline ou inacessível para carregar do disco:', err);
  }
  return [];
}

/**
 * Deletes a dataset folder from disk.
 */
export async function deleteProjectFromDisk(projectId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/${projectId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.debug('Erro ao deletar dataset do disco:', err);
    return false;
  }
}

/**
 * Saves current project to disk memory as well as browser storage for offline access.
 */
export async function saveProjectToStorage(project: DatasetProject): Promise<void> {
  // 1. Sync with disk folder in background
  saveProjectToDisk(project).catch(() => {});

  // 2. Local IndexedDB Cache
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(project, KEY_CURRENT);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return;
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
  // 1. Try loading from disk storage first
  try {
    const diskDatasets = await loadProjectsFromDisk();
    if (diskDatasets.length > 0) {
      return diskDatasets[0];
    }
  } catch {
    // ignore
  }

  // 2. Fallback to IndexedDB
  try {
    const db = await openDB();
    return await new Promise<DatasetProject | null>((resolve, reject) => {
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

