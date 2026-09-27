// MarkSure Client-Side IndexedDB Offline State Engine
// Keyed by Evaluation ID + Test Module ID
// Enables zero-data-loss offline execution and background synchronization

import { TestType } from '../types';

export interface OfflineTestDraft {
  draftKey: string; // `${evaluationId}::${testType}`
  evaluationId: string;
  testType: TestType;
  observations: any[];
  environmentalData: any;
  testInputs: any;
  notes: string;
  localUpdatedAt: number; // Date.now() timestamp
  serverUpdatedAt?: string | null; // ISO string from server record when loaded
  syncStatus: 'SAVED_LOCALLY' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'OFFLINE';
  lastSyncedAt?: number;
}

const DB_NAME = 'MarkSure_Offline_Metrology_DB';
const DB_VERSION = 1;
const STORE_NAME = 'test_drafts';

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'draftKey' });
          store.createIndex('evaluationId', 'evaluationId', { unique: false });
          store.createIndex('testType', 'testType', { unique: false });
          store.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  public getDraftKey(evaluationId: string, testType: TestType): string {
    return `${evaluationId}::${testType}`;
  }

  /**
   * Save observation draft into IndexedDB immediately (frame-by-frame)
   */
  public async saveDraft(draft: OfflineTestDraft): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(draft);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to save draft into IndexedDB:', err);
    }
  }

  /**
   * Get draft for a specific test module in an evaluation
   */
  public async getDraft(evaluationId: string, testType: TestType): Promise<OfflineTestDraft | null> {
    try {
      const db = await this.getDB();
      const key = this.getDraftKey(evaluationId, testType);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to get draft from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Delete draft once confirmed synced or discarded
   */
  public async deleteDraft(evaluationId: string, testType: TestType): Promise<void> {
    try {
      const db = await this.getDB();
      const key = this.getDraftKey(evaluationId, testType);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to delete draft from IndexedDB:', err);
    }
  }

  /**
   * Mark a draft as confirmed synced to the server
   */
  public async markDraftSynced(
    evaluationId: string,
    testType: TestType,
    serverUpdatedAt?: string | null
  ): Promise<void> {
    const draft = await this.getDraft(evaluationId, testType);
    if (draft) {
      draft.syncStatus = 'SYNCED';
      draft.lastSyncedAt = Date.now();
      if (serverUpdatedAt) {
        draft.serverUpdatedAt = serverUpdatedAt;
      }
      await this.saveDraft(draft);
    }
  }

  /**
   * Get all unsynced drafts that need background synchronization
   */
  public async getUnsyncedDrafts(): Promise<OfflineTestDraft[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const all: OfflineTestDraft[] = req.result || [];
          const unsynced = all.filter((d) => d.syncStatus === 'SAVED_LOCALLY' || d.syncStatus === 'OFFLINE');
          resolve(unsynced);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to get unsynced drafts:', err);
      return [];
    }
  }

  /**
   * Clean up old drafts older than 14 days
   */
  public async pruneOldDrafts(maxAgeMs = 14 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.getDB();
      const cutoff = Date.now() - maxAgeMs;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: OfflineTestDraft[] = req.result || [];
        all.forEach((draft) => {
          if (draft.syncStatus === 'SYNCED' && draft.localUpdatedAt < cutoff) {
            store.delete(draft.draftKey);
          }
        });
      };
    } catch (err) {
      console.warn('[OfflineStorage] Failed to prune old drafts:', err);
    }
  }
}

export const offlineStorage = new OfflineStorageEngine();
