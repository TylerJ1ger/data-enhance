/**
 * 同步API钩子
 * 为React组件提供数据同步功能的接口
 */

import { useState, useEffect, useCallback } from 'react';
import { dataSyncService, SyncResult, SyncStatus } from '../lib/sync/data-sync-service';
import { indexedDBManager, KeywordData, GroupData, FileData } from '../lib/db/indexeddb-manager';

export interface UseSyncApiReturn {
  // 同步状态
  syncStatus: SyncStatus;
  
  // 数据获取
  keywords: KeywordData[];
  groups: GroupData[];
  files: FileData[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // 同步操作
  performSync: () => Promise<SyncResult>;
  enableAutoSync: (enabled: boolean) => void;
  clearAllData: () => Promise<void>;
  
  // 数据操作
  deleteKeyword: (uid: string, keyword: string, group: string) => Promise<void>;
  refreshLocalData: () => Promise<void>;
  
  // 统计信息
  getLocalStats: () => Promise<{ total_keywords: number; total_groups: number; total_qpm: number }>;
}

export const useSyncApi = (): UseSyncApiReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(dataSyncService.getSyncStatus());
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 更新同步状态
   */
  const updateSyncStatus = useCallback(() => {
    setSyncStatus(dataSyncService.getSyncStatus());
  }, []);

  /**
   * 刷新本地数据
   */
  const refreshLocalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [keywordsData, groupsData, filesData] = await Promise.all([
        getAllKeywords(),
        indexedDBManager.getAllGroups(),
        indexedDBManager.getAllFiles()
      ]);

      setKeywords(keywordsData);
      setGroups(groupsData);
      setFiles(filesData);
    } catch (err) {
      setError(`Failed to refresh local data: ${err}`);
      console.error('Failed to refresh local data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 获取所有关键词（从本地IndexedDB）
   */
  const getAllKeywords = async (): Promise<KeywordData[]> => {
    const groups = await indexedDBManager.getAllGroups();
    const allKeywords: KeywordData[] = [];

    for (const group of groups) {
      const groupKeywords = await indexedDBManager.getKeywordsByGroup(group.name);
      allKeywords.push(...groupKeywords);
    }

    return allKeywords;
  };

  /**
   * 执行同步
   */
  const performSync = useCallback(async (): Promise<SyncResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await dataSyncService.performFullSync();
      
      if (result.success) {
        await refreshLocalData();
      } else {
        setError(result.message);
      }
      
      updateSyncStatus();
      return result;
    } catch (err) {
      const errorMsg = `Sync failed: ${err}`;
      setError(errorMsg);
      return {
        success: false,
        message: errorMsg,
        synced_items: 0,
        failed_items: 1,
        errors: [String(err)]
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshLocalData, updateSyncStatus]);

  /**
   * 启用/禁用自动同步
   */
  const enableAutoSync = useCallback((enabled: boolean) => {
    dataSyncService.setAutoSync(enabled);
    updateSyncStatus();
  }, [updateSyncStatus]);

  /**
   * 清空所有数据
   */
  const clearAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      await dataSyncService.clearAllLocalData();
      setKeywords([]);
      setGroups([]);
      setFiles([]);
      updateSyncStatus();
    } catch (err) {
      setError(`Failed to clear data: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [updateSyncStatus]);

  /**
   * 删除关键词
   */
  const deleteKeyword = useCallback(async (uid: string, keyword: string, group: string) => {
    try {
      await dataSyncService.deleteKeywordLocally(uid, keyword, group);
      await refreshLocalData();
      updateSyncStatus();
    } catch (err) {
      setError(`Failed to delete keyword: ${err}`);
      throw err;
    }
  }, [refreshLocalData, updateSyncStatus]);

  /**
   * 获取本地统计信息
   */
  const getLocalStats = useCallback(async () => {
    return await indexedDBManager.getGroupStats();
  }, []);

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    refreshLocalData();
    
    // 设置定期更新同步状态
    const statusInterval = setInterval(updateSyncStatus, 5000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [refreshLocalData, updateSyncStatus]);

  /**
   * 监听同步状态变化，自动刷新数据
   */
  useEffect(() => {
    const checkSyncCompletion = () => {
      const currentStatus = dataSyncService.getSyncStatus();
      if (syncStatus.is_syncing && !currentStatus.is_syncing) {
        // 同步刚完成，刷新数据
        refreshLocalData();
      }
      setSyncStatus(currentStatus);
    };

    const syncCheckInterval = setInterval(checkSyncCompletion, 2000);
    
    return () => {
      clearInterval(syncCheckInterval);
    };
  }, [syncStatus.is_syncing, refreshLocalData]);

  return {
    // 同步状态
    syncStatus,
    
    // 数据
    keywords,
    groups,
    files,
    
    // 加载状态
    isLoading,
    error,
    
    // 操作方法
    performSync,
    enableAutoSync,
    clearAllData,
    deleteKeyword,
    refreshLocalData,
    getLocalStats
  };
};

/**
 * 专门用于关键词库功能的同步钩子
 */
export const useKeystoreSync = () => {
  const syncApi = useSyncApi();
  
  /**
   * 按组获取关键词
   */
  const getKeywordsByGroup = useCallback(async (groupName: string): Promise<KeywordData[]> => {
    return await indexedDBManager.getKeywordsByGroup(groupName);
  }, []);

  /**
   * 按文件获取关键词
   */
  const getKeywordsByFile = useCallback(async (filename: string): Promise<KeywordData[]> => {
    return await indexedDBManager.getKeywordsByFile(filename);
  }, []);

  /**
   * 获取重复关键词分析
   */
  const getDuplicateAnalysis = useCallback(() => {
    const duplicates: { [keyword: string]: string[] } = {};
    
    syncApi.keywords.forEach(kw => {
      const keyword = kw.Keywords.toLowerCase();
      if (!duplicates[keyword]) {
        duplicates[keyword] = [];
      }
      if (!duplicates[keyword].includes(kw.group_name_map)) {
        duplicates[keyword].push(kw.group_name_map);
      }
    });

    // 只返回出现在多个组中的关键词
    const result: { [keyword: string]: string[] } = {};
    Object.entries(duplicates).forEach(([keyword, groups]) => {
      if (groups.length > 1) {
        result[keyword] = groups;
      }
    });

    return result;
  }, [syncApi.keywords]);

  return {
    ...syncApi,
    getKeywordsByGroup,
    getKeywordsByFile,
    getDuplicateAnalysis
  };
};