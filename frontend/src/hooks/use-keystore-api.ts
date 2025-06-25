// src/hooks/use-keystore-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as keystoreApi from '@/lib/api/keystore-api';
import type {
  KeystoreUploadResponse,
  KeystoreSummary,
  GroupOverview,
  KeywordMoveRequest,
  KeywordRemoveRequest,
  GroupRenameRequest,
  ClusterCreateRequest,
  ClusterUpdateRequest,
} from '@/types/keystore';

export function useKeystoreApi() {
  // 加载状态
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 数据状态
  const [summary, setSummary] = useState<KeystoreSummary | null>(null);
  const [groupsOverview, setGroupsOverview] = useState<GroupOverview[]>([]);
  const [groupsData, setGroupsData] = useState<Record<string, any>>({});
  const [clustersData, setClustersData] = useState<Record<string, string[]>>({});
  const [visualizationData, setVisualizationData] = useState<any>(null);
  const [duplicatesData, setDuplicatesData] = useState<any>(null);
  const [fileStats, setFileStats] = useState<any[]>([]);

  // 新增：触发重新渲染的状态
  const [triggerId, setTriggerId] = useState(0);

  // 检查API健康状态
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await keystoreApi.checkKeystoreApiHealth();
      } catch (error) {
        toast.error('无法连接到关键词库API服务器。请确认后端服务是否正常运行。');
      }
    };

    checkApiHealth();
  }, []);

  // 强制触发重新渲染的辅助函数
  const triggerRerender = useCallback(() => {
    setTriggerId(prev => prev + 1);
  }, []);

  // 上传文件
  const uploadFiles = useCallback(async (files: File[], mode: 'replace' | 'append' = 'replace') => {
    setIsUploading(true);
    try {
      const data = await keystoreApi.uploadKeystoreFiles(files, mode);
      setFileStats(data.file_stats);
      setSummary(data.summary);
      setGroupsOverview(data.groups_overview);
      
      const modeText = mode === 'replace' ? '覆盖' : '增量';
      toast.success(`成功${modeText}处理 ${files.length} 个关键词库文件`);
      
      // 自动加载相关数据
      await Promise.all([
        fetchGroupsData(),
        fetchClustersData(),
        fetchVisualizationData(),
        fetchDuplicatesData()
      ]);
      
      // 触发重新渲染
      triggerRerender();
      
      return data;
    } catch (error) {
      console.error('上传关键词库文件错误:', error);
      toast.error('关键词库文件上传失败，请重试。');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [triggerRerender]);

  // 预览上传差异
  const previewUploadDiff = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    try {
      const data = await keystoreApi.previewUploadDiff(files);
      return data;
    } catch (error) {
      console.error('预览上传差异错误:', error);
      toast.error('预览上传差异失败，请重试。');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 获取摘要数据
  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await keystoreApi.getKeystoreSummary();
      setSummary(data.summary);
      setGroupsOverview(data.groups_overview);
      return data;
    } catch (error) {
      console.error('获取关键词库摘要错误:', error);
      return null;
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // 获取组数据
  const fetchGroupsData = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const data = await keystoreApi.getKeystoreGroups();
      setGroupsData(data);
      return data;
    } catch (error) {
      console.error('获取组数据错误:', error);
      return null;
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  // 获取族数据
  const fetchClustersData = useCallback(async () => {
    setIsLoadingClusters(true);
    try {
      const data = await keystoreApi.getKeystoreClusters();
      setClustersData(data);
      return data;
    } catch (error) {
      console.error('获取族数据错误:', error);
      return null;
    } finally {
      setIsLoadingClusters(false);
    }
  }, []);

  // 获取可视化数据
  const fetchVisualizationData = useCallback(async () => {
    setIsLoadingVisualization(true);
    try {
      const data = await keystoreApi.getKeystoreVisualization();
      setVisualizationData(data);
      return data;
    } catch (error) {
      console.error('获取可视化数据错误:', error);
      return null;
    } finally {
      setIsLoadingVisualization(false);
    }
  }, []);

  // 获取重复关键词数据
  const fetchDuplicatesData = useCallback(async () => {
    console.log('🔍 开始获取重复关键词数据...', {
      timestamp: new Date().toISOString(),
      currentDuplicatesCount: duplicatesData?.total_duplicates || 0
    });
    
    setIsLoadingDuplicates(true);
    try {
      const data = await keystoreApi.getKeystoreDuplicates();
      
      console.log('✅ 重复关键词数据获取成功:', {
        timestamp: new Date().toISOString(),
        newTotalDuplicates: data?.total_duplicates || 0,
        previousTotalDuplicates: duplicatesData?.total_duplicates || 0,
        hasDataChanged: (data?.total_duplicates || 0) !== (duplicatesData?.total_duplicates || 0),
        detailsCount: data?.details?.length || 0,
        fullResponse: data
      });
      
      setDuplicatesData(data);
      return data;
    } catch (error) {
      console.error('❌ 获取重复关键词数据错误:', error);
      return null;
    } finally {
      setIsLoadingDuplicates(false);
    }
  }, [duplicatesData?.total_duplicates]);

  // 移动关键词
  const moveKeyword = useCallback(async (request: KeywordMoveRequest) => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.moveKeyword(request);
      
      if (result.success) {
        toast.success(result.message || '关键词移动成功');
        
        // 刷新相关数据
        await Promise.all([
          fetchSummary(),
          fetchGroupsData(),
          fetchDuplicatesData()
        ]);
        
        // 触发重新渲染
        triggerRerender();
      }
      
      return result;
    } catch (error) {
      console.error('移动关键词错误:', error);
      toast.error('移动关键词失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchGroupsData, fetchDuplicatesData, triggerRerender]);

  // 删除关键词
  const removeKeyword = useCallback(async (request: KeywordRemoveRequest) => {
    console.log('🗑️ 开始删除关键词流程:', {
      request,
      timestamp: new Date().toISOString(),
      currentDuplicatesCount: duplicatesData?.total_duplicates || 0
    });
    
    setIsProcessing(true);
    try {
      const result = await keystoreApi.removeKeyword(request);
      
      console.log('📤 删除关键词API响应:', {
        result,
        timestamp: new Date().toISOString()
      });
      
      // 现在后端删除操作是幂等的，即使关键词不存在也会返回成功
      if (result.success) {
        toast.success(result.message || '关键词删除成功');
        
        console.log('🔄 开始数据刷新流程...');
        
        // 先清除旧数据状态，强制显示加载状态
        const oldDuplicatesData = duplicatesData;
        setDuplicatesData(null);
        setGroupsData({});
        setSummary(null);
        setVisualizationData(null);
        
        console.log('📝 数据状态已清空，触发重新渲染...');
        
        // 触发重新渲染以显示加载状态
        triggerRerender();
        
        // 等待稍长时间确保后端数据已更新
        console.log('⏳ 等待300ms确保后端数据已更新...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 按顺序刷新数据，确保依赖关系正确
        try {
          console.log('🔄 开始并行刷新摘要和组数据...');
          // 首先刷新摘要和组数据
          const [summaryResult, groupsResult] = await Promise.all([
            fetchSummary(),
            fetchGroupsData()
          ]);
          
          console.log('📊 摘要和组数据刷新完成，开始刷新重复数据和可视化数据...');
          // 然后刷新依赖于组数据的其他数据
          const [duplicatesResult, visualizationResult] = await Promise.all([
            fetchDuplicatesData(),
            fetchVisualizationData()
          ]);
          
          console.log('🎯 所有数据刷新完成，对比结果:', {
            oldDuplicatesCount: oldDuplicatesData?.total_duplicates || 0,
            newDuplicatesCount: duplicatesResult?.total_duplicates || 0,
            hasActuallyChanged: (oldDuplicatesData?.total_duplicates || 0) !== (duplicatesResult?.total_duplicates || 0),
            summarySuccess: !!summaryResult,
            groupsSuccess: !!groupsResult,
            duplicatesSuccess: !!duplicatesResult,
            visualizationSuccess: !!visualizationResult,
            timestamp: new Date().toISOString()
          });
          
          // 最终触发重新渲染
          triggerRerender();
          
          console.log('✅ 关键词删除后数据刷新完成');
          
        } catch (refreshError) {
          console.error('❌ 刷新数据时出错:', refreshError);
          toast.error('数据刷新失败，请手动刷新页面');
        }
        
      } else {
        // 如果返回失败，显示错误信息
        console.log('❌ 删除关键词失败:', result);
        toast.error(result.message || '删除关键词失败');
      }
      
      return result;
    } catch (error) {
      console.error('❌ 删除关键词错误:', error);
      toast.error('删除关键词失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchGroupsData, fetchDuplicatesData, fetchVisualizationData, triggerRerender, duplicatesData?.total_duplicates]);

  // 重命名组
  const renameGroup = useCallback(async (request: GroupRenameRequest) => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.renameGroup(request);
      
      if (result.success) {
        toast.success(result.message || '组重命名成功');
        
        // 刷新相关数据
        await Promise.all([
          fetchSummary(),
          fetchGroupsData(),
          fetchClustersData(),
          fetchVisualizationData()
        ]);
        
        // 触发重新渲染
        triggerRerender();
      }
      
      return result;
    } catch (error) {
      console.error('重命名组错误:', error);
      toast.error('重命名组失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchGroupsData, fetchClustersData, fetchVisualizationData, triggerRerender]);

  // 创建族
  const createCluster = useCallback(async (request: ClusterCreateRequest) => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.createCluster(request);
      
      if (result.success) {
        toast.success(result.message || '族创建成功');
        
        // 强制刷新所有相关数据，确保界面更新
        const refreshPromises = [
          fetchSummary(),
          fetchClustersData(),
          fetchVisualizationData()
        ];
        
        await Promise.all(refreshPromises);
        
        // 强制触发组件重新渲染
        triggerRerender();
        
        console.log('族创建后数据刷新完成'); // 调试日志
      }
      
      return result;
    } catch (error) {
      console.error('创建族错误:', error);
      toast.error('创建族失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchClustersData, fetchVisualizationData, triggerRerender]);

  // 更新族
  const updateCluster = useCallback(async (request: ClusterUpdateRequest) => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.updateCluster(request);
      
      if (result.success) {
        toast.success(result.message || '族更新成功');
        
        // 刷新相关数据
        await Promise.all([
          fetchSummary(),
          fetchClustersData(),
          fetchVisualizationData()
        ]);
        
        // 触发重新渲染
        triggerRerender();
      }
      
      return result;
    } catch (error) {
      console.error('更新族错误:', error);
      toast.error('更新族失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchClustersData, fetchVisualizationData, triggerRerender]);

  // 删除族
  const deleteCluster = useCallback(async (clusterName: string) => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.deleteCluster(clusterName);
      
      if (result.success) {
        toast.success(result.message || '族删除成功');
        
        // 刷新相关数据
        await Promise.all([
          fetchSummary(),
          fetchClustersData(),
          fetchVisualizationData()
        ]);
        
        // 触发重新渲染
        triggerRerender();
      }
      
      return result;
    } catch (error) {
      console.error('删除族错误:', error);
      toast.error('删除族失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchClustersData, fetchVisualizationData, triggerRerender]);

  // 获取族建议
  const getClusterSuggestions = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.getClusterSuggestions();
      return result;
    } catch (error) {
      console.error('获取族建议错误:', error);
      toast.error('获取族建议失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 获取导出URL
  const getExportUrl = useCallback(() => {
    return keystoreApi.exportKeystoreData();
  }, []);

  // 重置数据
  const resetData = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await keystoreApi.resetKeystoreData();
      
      if (result.success) {
        // 清空本地状态
        setSummary(null);
        setGroupsOverview([]);
        setGroupsData({});
        setClustersData({});
        setVisualizationData(null);
        setDuplicatesData(null);
        setFileStats([]);
        
        // 触发重新渲染
        triggerRerender();
        
        toast.success('关键词库数据已重置');
      }
      
      return result;
    } catch (error) {
      console.error('重置数据错误:', error);
      toast.error('重置数据失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [triggerRerender]);

  // 从存储中加载数据
  const loadExistingData = useCallback(async () => {
    setIsProcessing(true);
    try {
      // 首先尝试从Redis加载
      const redisResult = await keystoreApi.loadFromRedis();
      
      if (redisResult.success) {
        // Redis中有数据，直接加载
        if (redisResult.summary) {
          setSummary(redisResult.summary);
        }
        if (redisResult.groups_overview) {
          setGroupsOverview(redisResult.groups_overview);
        }
        
        // 加载其他数据
        await Promise.all([
          fetchGroupsData(),
          fetchClustersData(),
          fetchVisualizationData(),
          fetchDuplicatesData()
        ]);
        
        // 触发重新渲染
        triggerRerender();
        
        return redisResult;
      } else {
        // Redis中没有数据，检查IndexDB中是否有数据
        let hasIndexDBData = false;
        try {
          const { indexedDBManager } = await import('@/lib/db/indexeddb-manager');
          await indexedDBManager.init();
          const groups = await indexedDBManager.getAllGroups();
          hasIndexDBData = groups && groups.length > 0;
        } catch (indexDBError) {
          console.warn('检查IndexDB数据时出错:', indexDBError);
        }
        
        if (!hasIndexDBData) {
          throw new Error('没有找到可加载的数据。请先上传CSV文件或确认数据库中有数据。');
        } else {
          // IndexDB中有数据但Redis中没有，需要弹窗询问用户
          throw new Error('DATA_CONFLICT');
        }
      }
    } catch (error) {
      // 对于数据冲突，不记录为错误，因为这是预期的行为
      if (error instanceof Error && error.message === 'DATA_CONFLICT') {
        throw error;
      }
      console.error('加载存储数据错误:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchGroupsData, fetchClustersData, fetchVisualizationData, fetchDuplicatesData, triggerRerender]);

  // 从IndexDB恢复数据到Redis
  const restoreFromIndexDB = useCallback(async () => {
    setIsProcessing(true);
    try {
      console.log('开始从IndexDB恢复数据到Redis...');
      
      // 第一步：从前端IndexedDB读取数据
      console.log('从IndexedDB读取本地数据...');
      const { indexedDBManager } = await import('@/lib/db/indexeddb-manager');
      await indexedDBManager.init();
      
      const [groups, files] = await Promise.all([
        indexedDBManager.getAllGroups(),
        indexedDBManager.getAllFiles()
      ]);
      
      console.log('IndexedDB数据读取完成:', {
        groupsCount: groups.length,
        filesCount: files.length
      });
      
      if (groups.length === 0) {
        throw new Error('IndexedDB中没有找到有效的数据，无法恢复');
      }
      
      // 第二步：将数据转换为上传格式并上传
      console.log('将IndexedDB数据转换为上传格式...');
      
      // 构造CSV格式的数据
      const csvData: any[] = [];
      
      // 获取所有关键词数据
      const keywordsList: any[] = [];
      for (const group of groups) {
        const groupKeywords = await indexedDBManager.getKeywordsByGroup(group.name);
        keywordsList.push(...groupKeywords);
      }
      console.log('获取到关键词数据:', keywordsList.length, '条');
      
      // 将关键词数据转换为CSV格式
      keywordsList.forEach(keyword => {
        csvData.push({
          Keywords: keyword.Keywords,
          group_name_map: keyword.group_name_map,
          QPM: keyword.QPM,
          DIFF: keyword.DIFF,
          cluster_name: keyword.cluster_name || '',
          source_file: keyword.source_file || '',
        });
      });
      
      if (csvData.length === 0) {
        throw new Error('没有找到可恢复的关键词数据');
      }
      
      // 将数据转换为CSV格式并创建文件
      const csvHeader = 'Keywords,group_name_map,QPM,DIFF,cluster_name,source_file\n';
      const csvContent = csvData.map(row => 
        `"${row.Keywords}","${row.group_name_map}",${row.QPM},${row.DIFF},"${row.cluster_name}","${row.source_file}"`
      ).join('\n');
      
      const csvBlob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'restored_data.csv', { type: 'text/csv' });
      
      console.log('准备上传恢复的数据，共', csvData.length, '条记录');
      
      // 第三步：使用现有的上传接口上传数据
      const uploadResult = await uploadFiles([csvFile], 'replace');
      console.log('数据上传完成:', uploadResult);
      
      // 第四步：验证上传结果
      if (uploadResult.summary) {
        console.log('数据恢复成功，开始更新前端状态...');
        
        // 更新本地状态
        setSummary(uploadResult.summary);
        setGroupsOverview(uploadResult.groups_overview);
        setFileStats(uploadResult.file_stats);
        
        // 加载其他数据
        await Promise.all([
          fetchGroupsData(),
          fetchClustersData(),
          fetchVisualizationData(),
          fetchDuplicatesData()
        ]);
        
        // 触发重新渲染
        triggerRerender();
        
        toast.success(`已成功从本地数据恢复 ${csvData.length} 条关键词记录`);
        return uploadResult;
      } else {
        throw new Error('数据上传成功但响应格式异常');
      }
      
    } catch (error) {
      console.error('恢复IndexDB数据失败:', error);
      
      // 更友好的错误提示
      let errorMessage = '从本地数据恢复服务器数据库失败';
      if (error instanceof Error) {
        if (error.message.includes('IndexedDB中没有找到')) {
          errorMessage = '本地数据为空，无法恢复服务器数据';
        } else if (error.message.includes('没有找到可恢复的关键词数据')) {
          errorMessage = '本地数据格式异常，无法恢复服务器数据';
        } else if (error.message.includes('上传')) {
          errorMessage = '数据上传失败，请检查网络连接';
        }
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [uploadFiles, fetchGroupsData, fetchClustersData, fetchVisualizationData, fetchDuplicatesData, triggerRerender]);

  // 清空IndexDB数据
  const clearIndexDBData = useCallback(async () => {
    setIsProcessing(true);
    try {
      console.log('开始清空IndexDB数据...');
      const { indexedDBManager } = await import('@/lib/db/indexeddb-manager');
      await indexedDBManager.init();
      await indexedDBManager.clearAllData();
      toast.success('已清空本地数据');
    } catch (error) {
      console.error('清空IndexDB数据失败:', error);
      toast.error('清空本地数据失败，请重试。');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 新增：刷新所有数据的便捷方法
  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchSummary(),
        fetchGroupsData(),
        fetchClustersData(),
        fetchVisualizationData(),
        fetchDuplicatesData()
      ]);
      
      triggerRerender();
    } catch (error) {
      console.error('刷新所有数据错误:', error);
      toast.error('刷新数据失败');
    }
  }, [fetchSummary, fetchGroupsData, fetchClustersData, fetchVisualizationData, fetchDuplicatesData, triggerRerender]);

  return {
    // 状态
    isUploading,
    isLoadingSummary,
    isLoadingGroups,
    isLoadingClusters,
    isLoadingVisualization,
    isLoadingDuplicates,
    isProcessing,
    
    // 数据
    summary,
    groupsOverview,
    groupsData,
    clustersData,
    visualizationData,
    duplicatesData,
    fileStats,
    
    // 新增：触发重新渲染的标识
    triggerId,
    
    // 操作
    uploadFiles,
    fetchSummary,
    fetchGroupsData,
    fetchClustersData,
    fetchVisualizationData,
    fetchDuplicatesData,
    moveKeyword,
    removeKeyword,
    renameGroup,
    createCluster,
    updateCluster,
    deleteCluster,
    getClusterSuggestions,
    getExportUrl,
    resetData,
    
    // 新增：便捷方法
    refreshAllData,
    triggerRerender,
    loadExistingData,
    previewUploadDiff,
    restoreFromIndexDB,
    clearIndexDBData,
  };
}