import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatasetProject } from '../types/dataset';

/**
 * Minimal hand-rolled IndexedDB fake, controllable to make a specific request
 * (put/get) fail asynchronously via req.onerror — something real IndexedDB
 * implementations (and jsdom, which has none) make hard to trigger on demand.
 * This is what lets us reproduce the exact failure mode storage.ts must survive.
 */
function installFakeIndexedDB(opts: { failPut?: boolean; failGet?: boolean }) {
  class FakeRequest {
    onsuccess: (() => void) | null = null;
    onerror: (() => void) | null = null;
    result: any;
    error: any;
  }

  class FakeStore {
    put(value: any) {
      const req = new FakeRequest();
      setTimeout(() => {
        if (opts.failPut) {
          req.error = new Error('Simulated QuotaExceededError');
          req.onerror?.();
        } else {
          req.onsuccess?.();
        }
      }, 0);
      return req;
    }
    get(_key: any) {
      const req = new FakeRequest();
      setTimeout(() => {
        if (opts.failGet) {
          req.error = new Error('Simulated IndexedDB read error');
          req.onerror?.();
        } else {
          req.result = undefined;
          req.onsuccess?.();
        }
      }, 0);
      return req;
    }
    delete(_key: any) {
      return new FakeRequest();
    }
  }

  class FakeTransaction {
    objectStore(_name: string) {
      return new FakeStore();
    }
  }

  class FakeDB {
    objectStoreNames = { contains: () => true };
    createObjectStore() {}
    transaction(_name: string, _mode: string) {
      return new FakeTransaction();
    }
  }

  const fakeIndexedDB = {
    open(_name: string, _version: number) {
      const req = new FakeRequest();
      setTimeout(() => {
        req.result = new FakeDB();
        req.onsuccess?.();
      }, 0);
      return req;
    },
  };

  (globalThis as any).indexedDB = fakeIndexedDB;
}

describe('storage.ts (project persistence fallback chain)', () => {
  const sampleProject: DatasetProject = {
    id: 'proj_1',
    name: 'Fallback Test Project',
    description: '',
    domain: 'vision',
    taskType: 'object_detection',
    classes: [],
    images: [],
    activeImageId: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as any;

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    delete (globalThis as any).indexedDB;
  });

  it('falls back to localStorage (without rejecting) when the IndexedDB put request errors', async () => {
    installFakeIndexedDB({ failPut: true });
    const { saveProjectToStorage } = await import('../utils/storage');

    // Must resolve, not reject, even though the IndexedDB write failed underneath.
    await expect(saveProjectToStorage(sampleProject)).resolves.toBeUndefined();

    const stored = localStorage.getItem('current_project');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).name).toBe('Fallback Test Project');
  });

  it('falls back to localStorage (without rejecting) when the IndexedDB get request errors', async () => {
    installFakeIndexedDB({ failGet: true });
    localStorage.setItem('current_project', JSON.stringify(sampleProject));
    const { loadProjectFromStorage } = await import('../utils/storage');

    const result = await loadProjectFromStorage();
    expect(result?.name).toBe('Fallback Test Project');
  });
});
