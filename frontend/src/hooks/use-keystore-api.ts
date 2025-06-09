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
    setIsLoadingDuplicates(true);
    try {
      const data = await keystoreApi.getKeystoreDuplicates();
      setDuplicatesData(data);
      return data;
    } catch (error) {
      console.error('获取重复关键词数据错误:', error);
      return null;
    } finally {
      setIsLoadingDuplicates(false);
    }
  }, []);

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
    setIsProcessing(true);
    try {
      const result = await keystoreApi.removeKeyword(request);
      
      if (result.success) {
        toast.success(result.message || '关键词删除成功');
        
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
      console.error('删除关键词错误:', error);
      toast.error('删除关键词失败，请重试');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSummary, fetchGroupsData, fetchDuplicatesData, triggerRerender]);

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
  };
}