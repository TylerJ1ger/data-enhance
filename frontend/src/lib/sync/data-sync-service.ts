/**
 * 数据同步服务
 * 管理前端IndexedDB与后端Redis之间的双向数据同步
 */

import { indexedDBManager, KeywordData, GroupData, FileData, PendingOperation } from '../db/indexeddb-manager';
import keystoreApi from '../api/keystore-api';

interface SyncResult {
  success: boolean;
  message: string;
  synced_items: number;
  failed_items: number;
  errors?: string[];
}

interface SyncStatus {
  is_syncing: boolean;
  last_sync: string | null;
  pending_operations: number;
  auto_sync_enabled: boolean;
}

class DataSyncService {
  private syncStatus: SyncStatus = {
    is_syncing: false,
    last_sync: null,
    pending_operations: 0,
    auto_sync_enabled: true
  };

  private syncInterval: NodeJS.Timeout | null = null;
  private readonly AUTO_SYNC_INTERVAL = 30000; // 30秒自动同步
  private readonly MAX_RETRY_COUNT = 3;

  constructor() {
    this.initializeService();
  }

  /**
   * 初始化同步服务
   */
  private async initializeService(): Promise<void> {
    try {
      await indexedDBManager.init();
      this.updatePendingOperationsCount();
      
      if (this.syncStatus.auto_sync_enabled) {
        this.startAutoSync();
      }
    } catch (error) {
      console.error('Failed to initialize data sync service:', error);
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 启用/禁用自动同步
   */
  setAutoSync(enabled: boolean): void {
    this.syncStatus.auto_sync_enabled = enabled;
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * 启动自动同步
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (!this.syncStatus.is_syncing) {
        await this.performFullSync();
      }
    }, this.AUTO_SYNC_INTERVAL);
  }

  /**
   * 停止自动同步
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 执行完整同步（双向）
   */
  async performFullSync(): Promise<SyncResult> {
    if (this.syncStatus.is_syncing) {
      return {
        success: false,
        message: 'Sync already in progress',
        synced_items: 0,
        failed_items: 0
      };
    }

    this.syncStatus.is_syncing = true;
    let totalSynced = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    try {
      // 1. 先同步待同步操作到后端
      const pendingResult = await this.syncPendingOperations();
      totalSynced += pendingResult.synced_items;
      totalFailed += pendingResult.failed_items;
      if (pendingResult.errors) {
        errors.push(...pendingResult.errors);
      }

      // 2. 从后端拉取最新数据
      const pullResult = await this.pullFromBackend();
      totalSynced += pullResult.synced_items;
      totalFailed += pullResult.failed_items;
      if (pullResult.errors) {
        errors.push(...pullResult.errors);
      }

      this.syncStatus.last_sync = new Date().toISOString();
      await this.updatePendingOperationsCount();

      return {
        success: totalFailed === 0,
        message: `Sync completed. ${totalSynced} items synced, ${totalFailed} failed`,
        synced_items: totalSynced,
        failed_items: totalFailed,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Full sync failed:', error);
      return {
        success: false,
        message: `Sync failed: ${error}`,
        synced_items: totalSynced,
        failed_items: totalFailed + 1,
        errors: [String(error)]
      };
    } finally {
      this.syncStatus.is_syncing = false;
    }
  }

  /**
   * 从后端拉取数据到前端
   */
  async pullFromBackend(): Promise<SyncResult> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // 1. 拉取所有组数据
      const groupsData = await keystoreApi.get('/groups');
      if (groupsData.data.success) {
        const groups: GroupData[] = Object.entries(groupsData.data.groups).map(([name, groupInfo]: [string, any]) => ({
          name,
          keyword_count: groupInfo.keyword_count || 0,
          total_qpm: groupInfo.total_qpm || 0,
          avg_qpm: groupInfo.avg_qpm || 0,
          keywords: groupInfo.keywords || [],
          last_sync: new Date().toISOString()
        }));

        for (const group of groups) {
          try {
            await indexedDBManager.upsertGroup(group);
            synced++;
          } catch (error) {
            failed++;
            errors.push(`Failed to sync group ${group.name}: ${error}`);
          }
        }
      }

      // 2. 拉取所有关键词数据 - 从groups接口获取详细的关键词数据
      const keywords: KeywordData[] = [];
      
      console.log('Groups data for keyword extraction:', Object.keys(groupsData.data.groups || {}));
      
      // 遍历所有组获取关键词详细数据
      for (const [groupName, groupInfo] of Object.entries(groupsData.data.groups)) {
        console.log(`Processing group: ${groupName}`, groupInfo);
        if (groupInfo && (groupInfo as any).data) {
          console.log(`Group ${groupName} has ${(groupInfo as any).data.length} keywords`);
          for (const keyword of (groupInfo as any).data) {
            keywords.push({
              uid: keyword.id || this.generateUID(keyword.keyword, groupName),
              Keywords: keyword.keyword,  // 后端返回的字段名是 keyword
              group_name_map: groupName,
              QPM: parseFloat(keyword.qpm) || 0,
              DIFF: parseFloat(keyword.diff) || 0,
              cluster_name: keyword.cluster || '',
              source_file: keyword.source_file || '',
              created_at: keyword.created_at || new Date().toISOString()
            });
          }
        } else {
          console.log(`Group ${groupName} has no data property`);
        }
      }

      console.log(`Total keywords extracted: ${keywords.length}`);

      if (keywords.length > 0) {
        await indexedDBManager.bulkCreateKeywords(keywords);
        synced += keywords.length;
        console.log(`Successfully synced ${keywords.length} keywords to IndexedDB`);
      }

      // 3. 拉取文件数据 (如果API支持)
      try {
        const filesResponse = await keystoreApi.get('/files');
        if (filesResponse.data.success && filesResponse.data.files) {
          // 处理文件数据 - 后端返回的是对象，不是数组
          const filesObject = filesResponse.data.files;
          const files: FileData[] = Object.entries(filesObject).map(([filename, fileInfo]: [string, any]) => ({
            filename,
            keyword_count: fileInfo.keyword_count || 0,
            groups: fileInfo.groups || [],
            keywords: fileInfo.keywords || [],
            imported_at: fileInfo.imported_at || new Date().toISOString()
          }));

          for (const file of files) {
            try {
              await indexedDBManager.upsertFile(file);
              synced++;
            } catch (error) {
              failed++;
              errors.push(`Failed to sync file ${file.filename}: ${error}`);
            }
          }
        }
      } catch (error) {
        // 文件接口可能不存在，忽略错误
        console.warn('Files endpoint not available:', error);
      }

      return {
        success: failed === 0,
        message: `Backend pull completed. ${synced} items synced, ${failed} failed`,
        synced_items: synced,
        failed_items: failed,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Failed to pull from backend:', error);
      return {
        success: false,
        message: `Backend pull failed: ${error}`,
        synced_items: synced,
        failed_items: failed + 1,
        errors: [String(error)]
      };
    }
  }

  /**
   * 同步待同步操作到后端
   */
  async syncPendingOperations(): Promise<SyncResult> {
    const pendingOps = await indexedDBManager.getPendingOperations();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const operation of pendingOps) {
      try {
        const success = await this.executeOperation(operation);
        if (success) {
          await indexedDBManager.removePendingOperation(operation.id);
          synced++;
        } else {
          // 增加重试次数
          operation.retry_count++;
          if (operation.retry_count >= this.MAX_RETRY_COUNT) {
            await indexedDBManager.removePendingOperation(operation.id);
            failed++;
            errors.push(`Operation ${operation.id} failed after ${this.MAX_RETRY_COUNT} retries`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(`Failed to execute operation ${operation.id}: ${error}`);
      }
    }

    return {
      success: failed === 0,
      message: `Pending operations sync completed. ${synced} items synced, ${failed} failed`,
      synced_items: synced,
      failed_items: failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 执行单个待同步操作
   */
  private async executeOperation(operation: PendingOperation): Promise<boolean> {
    try {
      switch (operation.type) {
        case 'create':
          if (operation.table === 'keywords') {
            // 创建关键词的逻辑通常通过文件上传完成，这里可能不需要处理
            return true;
          }
          break;

        case 'update':
          if (operation.table === 'keywords') {
            // 这里可以调用后端的更新接口
            return true;
          }
          break;

        case 'delete':
          if (operation.table === 'keywords') {
            const response = await keystoreApi.post('/keywords/remove', {
              keyword: operation.data.keyword,
              group: operation.data.group
            });
            return response.data.success;
          }
          break;
      }
      return false;
    } catch (error) {
      console.error('Failed to execute operation:', error);
      return false;
    }
  }

  /**
   * 添加本地操作到待同步队列
   */
  async addLocalOperation(
    type: 'create' | 'update' | 'delete',
    table: 'keywords' | 'groups' | 'files',
    data: any
  ): Promise<void> {
    await indexedDBManager.addPendingOperation({ type, table, data });
    await this.updatePendingOperationsCount();

    // 如果启用了自动同步，立即尝试同步
    if (this.syncStatus.auto_sync_enabled && !this.syncStatus.is_syncing) {
      setTimeout(() => this.performFullSync(), 1000); // 延迟1秒执行
    }
  }

  /**
   * 更新待同步操作数量
   */
  private async updatePendingOperationsCount(): Promise<void> {
    const pendingOps = await indexedDBManager.getPendingOperations();
    this.syncStatus.pending_operations = pendingOps.length;
  }

  /**
   * 生成UID（与后端保持一致）
   */
  private generateUID(keyword: string, group: string, cluster: string = ''): string {
    const keywordNorm = keyword.trim().toLowerCase();
    const groupNorm = group.trim().toLowerCase();
    const clusterNorm = cluster.trim().toLowerCase();
    const uniqueString = `${keywordNorm}|${groupNorm}|${clusterNorm}`;
    
    // 简单的哈希函数（生产环境应使用crypto API）
    let hash = 0;
    for (let i = 0; i < uniqueString.length; i++) {
      const char = uniqueString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return `kw_${Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8)}`;
  }

  /**
   * 手动删除关键词（添加到待同步队列）
   */
  async deleteKeywordLocally(uid: string, keyword: string, group: string): Promise<void> {
    // 1. 从本地IndexedDB删除
    await indexedDBManager.deleteKeyword(uid);
    
    // 2. 添加到待同步队列
    await this.addLocalOperation('delete', 'keywords', { keyword, group });
  }

  /**
   * 清空所有本地数据
   */
  async clearAllLocalData(): Promise<void> {
    await indexedDBManager.clearAllData();
    this.syncStatus.last_sync = null;
    this.syncStatus.pending_operations = 0;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopAutoSync();
    indexedDBManager.close();
  }
}

// 单例实例
export const dataSyncService = new DataSyncService();
export type { SyncResult, SyncStatus };