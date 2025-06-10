/**
 * IndexedDB数据管理器
 * 用于在浏览器端存储和管理关键词数据
 */

export interface KeywordData {
  uid: string;
  Keywords: string;
  group_name_map: string;
  QPM: number;
  DIFF: number;
  cluster_name?: string;
  source_file?: string;
  created_at: string;
  updated_at?: string;
}

export interface GroupData {
  name: string;
  keyword_count: number;
  total_qpm: number;
  avg_qpm: number;
  keywords: string[]; // UIDs
  last_sync: string;
}

export interface FileData {
  filename: string;
  keyword_count: number;
  groups: string[];
  keywords: string[]; // UIDs
  imported_at: string;
}

export interface SyncMetadata {
  table: string;
  last_sync: string;
  version: number;
  pending_operations: PendingOperation[];
}

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'keywords' | 'groups' | 'files';
  data: any;
  timestamp: string;
  retry_count: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'KeystoreDB';
  private readonly version = 1;

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建关键词存储
        if (!db.objectStoreNames.contains('keywords')) {
          const keywordStore = db.createObjectStore('keywords', { keyPath: 'uid' });
          keywordStore.createIndex('group_name_map', 'group_name_map', { unique: false });
          keywordStore.createIndex('source_file', 'source_file', { unique: false });
          keywordStore.createIndex('Keywords', 'Keywords', { unique: false });
        }

        // 创建组存储
        if (!db.objectStoreNames.contains('groups')) {
          const groupStore = db.createObjectStore('groups', { keyPath: 'name' });
          groupStore.createIndex('last_sync', 'last_sync', { unique: false });
        }

        // 创建文件存储
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'filename' });
          fileStore.createIndex('imported_at', 'imported_at', { unique: false });
        }

        // 创建同步元数据存储
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'table' });
        }

        // 创建待同步操作存储
        if (!db.objectStoreNames.contains('pending_operations')) {
          const pendingStore = db.createObjectStore('pending_operations', { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * 获取存储对象
   */
  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // ==============================================
  // 关键词操作
  // ==============================================

  /**
   * 批量创建关键词
   */
  async bulkCreateKeywords(keywords: KeywordData[]): Promise<void> {
    const store = this.getStore('keywords', 'readwrite');
    const promises = keywords.map(keyword => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(keyword);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await Promise.all(promises);
  }

  /**
   * 根据UID获取关键词
   */
  async getKeywordByUID(uid: string): Promise<KeywordData | null> {
    const store = this.getStore('keywords');
    return new Promise((resolve, reject) => {
      const request = store.get(uid);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取组内所有关键词
   */
  async getKeywordsByGroup(groupName: string): Promise<KeywordData[]> {
    const store = this.getStore('keywords');
    const index = store.index('group_name_map');
    return new Promise((resolve, reject) => {
      const request = index.getAll(groupName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文件内所有关键词
   */
  async getKeywordsByFile(filename: string): Promise<KeywordData[]> {
    const store = this.getStore('keywords');
    const index = store.index('source_file');
    return new Promise((resolve, reject) => {
      const request = index.getAll(filename);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除关键词
   */
  async deleteKeyword(uid: string): Promise<void> {
    const store = this.getStore('keywords', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(uid);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新关键词
   */
  async updateKeyword(uid: string, updates: Partial<KeywordData>): Promise<void> {
    const existing = await this.getKeywordByUID(uid);
    if (!existing) {
      throw new Error(`Keyword with UID ${uid} not found`);
    }

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    const store = this.getStore('keywords', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==============================================
  // 组操作
  // ==============================================

  /**
   * 创建或更新组数据
   */
  async upsertGroup(group: GroupData): Promise<void> {
    const store = this.getStore('groups', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(group);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有组
   */
  async getAllGroups(): Promise<GroupData[]> {
    const store = this.getStore('groups');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取组统计信息
   */
  async getGroupStats(): Promise<{ total_groups: number; total_keywords: number; total_qpm: number }> {
    const groups = await this.getAllGroups();
    return {
      total_groups: groups.length,
      total_keywords: groups.reduce((sum, g) => sum + g.keyword_count, 0),
      total_qpm: groups.reduce((sum, g) => sum + g.total_qpm, 0)
    };
  }

  // ==============================================
  // 文件操作
  // ==============================================

  /**
   * 创建或更新文件数据
   */
  async upsertFile(file: FileData): Promise<void> {
    const store = this.getStore('files', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有文件
   */
  async getAllFiles(): Promise<FileData[]> {
    const store = this.getStore('files');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==============================================
  // 同步操作
  // ==============================================

  /**
   * 添加待同步操作
   */
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retry_count'>): Promise<void> {
    const pendingOp: PendingOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retry_count: 0
    };

    const store = this.getStore('pending_operations', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(pendingOp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有待同步操作
   */
  async getPendingOperations(): Promise<PendingOperation[]> {
    const store = this.getStore('pending_operations');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除已完成的同步操作
   */
  async removePendingOperation(id: string): Promise<void> {
    const store = this.getStore('pending_operations', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新同步元数据
   */
  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    const store = this.getStore('sync_metadata', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取同步元数据
   */
  async getSyncMetadata(table: string): Promise<SyncMetadata | null> {
    const store = this.getStore('sync_metadata');
    return new Promise((resolve, reject) => {
      const request = store.get(table);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    const stores = ['keywords', 'groups', 'files', 'sync_metadata', 'pending_operations'];
    const promises = stores.map(storeName => {
      const store = this.getStore(storeName, 'readwrite');
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await Promise.all(promises);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 单例实例
export const indexedDBManager = new IndexedDBManager();