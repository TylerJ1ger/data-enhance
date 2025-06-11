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
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await keystoreApi.uploadKeystoreFiles(files);
      setFileStats(data.file_stats);
      setSummary(data.summary);
      setGroupsOverview(data.groups_overview);
      
      toast.success(`成功处理 ${files.length} 个关键词库文件`);
      
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
      // 首先尝试从IndexDB加载
      let hasIndexDBData = false;
      try {
        // 检查IndexDB中是否有数据
        const { indexedDBManager } = await import('@/lib/db/indexeddb-manager');
        await indexedDBManager.init();
        const groups = await indexedDBManager.getAllGroups();
        hasIndexDBData = groups && groups.length > 0;
        
        if (hasIndexDBData) {
          console.log('从IndexDB发现数据，开始同步到后端...');
          // 这里可以实现将IndexDB数据同步到Redis的逻辑
          // 暂时先调用后端接口触发检查
          await keystoreApi.loadFromIndexDB();
        }
      } catch (indexDBError) {
        console.warn('检查IndexDB数据时出错:', indexDBError);
      }
      
      // 然后尝试从Redis加载
      const redisResult = await keystoreApi.loadFromRedis();
      
      if (redisResult.success) {
        // 更新本地状态
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
        // Redis中没有数据
        if (!hasIndexDBData) {
          throw new Error('没有找到可加载的数据。请先上传CSV文件或确认数据库中有数据。');
        } else {
          throw new Error('IndexDB中有数据但同步到Redis失败，请重试。');
        }
      }
    } catch (error) {
      console.error('加载存储数据错误:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchGroupsData, fetchClustersData, fetchVisualizationData, fetchDuplicatesData, triggerRerender]);

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
    getExportUrl,
    resetData,
    
    // 新增：便捷方法
    refreshAllData,
    triggerRerender,
    loadExistingData,
  };
}