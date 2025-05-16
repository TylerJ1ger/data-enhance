//frontend-new/src/hooks/use-backlink-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as api from '@/lib/api/backlink-api';
import {
  BacklinkUploadResponse,
  BacklinkFilterRanges,
  BacklinkFilterResponse,
  BrandDomainOverlapResponse,
  BacklinkFilterRangeValues,
  FileStats,
  BacklinkDataStats,
  DomainFilterResponse,
} from '@/types';

// 定义域名数据接口
interface Domain {
  domain: string;
  ascore: number;
}

export function useBacklinkApi() {
  // 请求状态
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOverlap, setIsLoadingOverlap] = useState(false);
  const [isLoadingRanges, setIsLoadingRanges] = useState(false);
  const [isLoadingDomainFilter, setIsLoadingDomainFilter] = useState(false);

  // 数据状态
  const [fileStats, setFileStats] = useState<FileStats[]>([]);
  const [mergedStats, setMergedStats] = useState<BacklinkDataStats | null>(null);
  const [filteredStats, setFilteredStats] = useState<BacklinkDataStats | null>(null);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [brandOverlapData, setBrandOverlapData] = useState<BrandDomainOverlapResponse | null>(null);
  const [domainFilterResults, setDomainFilterResults] = useState<DomainFilterResponse | null>(null);
  const [filterRanges, setFilterRanges] = useState<BacklinkFilterRangeValues>({
    domain_ascore: [0, 100],
    backlinks: [0, 1000],
    domain_frequency: [1, 100],
  });

  // 交叉分析状态
  const [isCrossAnalysisFirstRound, setIsCrossAnalysisFirstRound] = useState(false);
  const [isCrossAnalysisSecondRound, setIsCrossAnalysisSecondRound] = useState(false);
  const [crossAnalysisFirstRoundComplete, setCrossAnalysisFirstRoundComplete] = useState(false);
  const [crossAnalysisSecondRoundComplete, setCrossAnalysisSecondRoundComplete] = useState(false);
  const [crossAnalysisResults, setCrossAnalysisResults] = useState<any[]>([]);
  const [domainData, setDomainData] = useState<Domain[]>([]); // 新增：存储域名数据

  // 组件挂载时检查API健康状态
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await api.checkBacklinkHealth();
      } catch (error) {
        toast.error('无法连接到API。请检查后端服务器是否正在运行。');
      }
    };

    checkApiHealth();
  }, []);

  // 上传文件
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await api.uploadBacklinkFiles(files);
      setFileStats(data.file_stats);
      setMergedStats(data.merged_stats);
      setFilteredStats(data.merged_stats); // 初始时，过滤结果等于合并结果
      
      // 加载初始筛选范围
      await fetchFilterRanges();
      
      // 加载初始品牌重叠数据
      await fetchBrandOverlap();
      
      toast.success(`成功处理 ${files.length} 个文件`);
      
      return data;
    } catch (error) {
      console.error('上传文件时出错:', error);
      toast.error('上传文件失败。请重试。');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 应用筛选条件
  const applyFilters = useCallback(async (filters: BacklinkFilterRanges) => {
    setIsFiltering(true);
    try {
      const data = await api.applyBacklinkFilters(filters);
      setFilteredStats(data.filtered_stats);
      setDomainCounts(data.domain_counts);
      
      // 筛选后更新品牌重叠数据
      await fetchBrandOverlap();
      
      toast.success('筛选条件应用成功');
      
      return data;
    } catch (error) {
      console.error('应用筛选条件时出错:', error);
      toast.error('应用筛选条件失败。请重试。');
      throw error;
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // 获取品牌重叠数据
  const fetchBrandOverlap = useCallback(async () => {
    setIsLoadingOverlap(true);
    try {
      const data = await api.getBacklinkBrandOverlap();
      setBrandOverlapData(data);
      return data;
    } catch (error) {
      console.error('获取品牌重叠数据时出错:', error);
      // 这是后台操作，不显示toast提示
      return null;
    } finally {
      setIsLoadingOverlap(false);
    }
  }, []);

  // 获取筛选范围
  const fetchFilterRanges = useCallback(async () => {
    setIsLoadingRanges(true);
    try {
      const data = await api.getBacklinkFilterRanges();
      setFilterRanges(data);
      return data;
    } catch (error) {
      console.error('获取筛选范围时出错:', error);
      // 这是后台操作，不显示toast提示
      return null;
    } finally {
      setIsLoadingRanges(false);
    }
  }, []);

  // 按域名筛选
  const filterByDomain = useCallback(async (domain: string) => {
    setIsLoadingDomainFilter(true);
    try {
      const data = await api.filterByDomain(domain);
      setDomainFilterResults(data);
      
      if (data.results.length === 0) {
        toast.info(`未找到匹配域名 "${domain}" 的数据`);
      } else {
        toast.success(`找到 ${data.results.length} 个品牌下的域名 "${domain}" 数据`);
      }
      
      return data;
    } catch (error) {
      console.error('按域名筛选时出错:', error);
      toast.error('筛选域名失败，请重试');
      return null;
    } finally {
      setIsLoadingDomainFilter(false);
    }
  }, []);

  // 获取导出URL
  const getExportUrl = useCallback(() => {
    return api.exportBacklinkData();
  }, []);

  // 获取唯一数据导出URL
  const getExportUniqueUrl = useCallback(() => {
    return api.exportUniqueBacklinkData();
  }, []);

  // 重置所有数据
  const resetData = useCallback(() => {
    setFileStats([]);
    setMergedStats(null);
    setFilteredStats(null);
    setDomainCounts({});
    setBrandOverlapData(null);
    setDomainFilterResults(null);
    setFilterRanges({
      domain_ascore: [0, 100],
      backlinks: [0, 1000],
      domain_frequency: [1, 100],
    });
  }, []);

  // 第一轮上传函数
  const uploadCrossAnalysisFirstRound = useCallback(async (files: File[]) => {
    setIsCrossAnalysisFirstRound(true);
    try {
      const data = await api.uploadCrossAnalysisFirstRound(files);
      setCrossAnalysisFirstRoundComplete(true);
      
      // 存储域名数据
      if (data.domains_data) {
        setDomainData(data.domains_data);
      }
      
      toast.success(`成功处理第一轮文件`);
      return data;
    } catch (error) {
      console.error('第一轮上传文件时出错:', error);
      toast.error('上传第一轮文件失败。请重试。');
      throw error;
    } finally {
      setIsCrossAnalysisFirstRound(false);
    }
  }, []);

  // 第二轮上传函数
  const uploadCrossAnalysisSecondRound = useCallback(async (files: File[]) => {
    setIsCrossAnalysisSecondRound(true);
    try {
      const data = await api.uploadCrossAnalysisSecondRound(files);
      setCrossAnalysisResults(data.results);
      
      // 如果第二轮也返回了域名数据，更新它
      if (data.domains_data) {
        setDomainData(data.domains_data);
      }
      
      setCrossAnalysisSecondRoundComplete(true);
      toast.success(`成功处理第二轮文件，发现 ${data.results.length} 条匹配记录`);
      return data;
    } catch (error) {
      console.error('第二轮上传文件时出错:', error);
      toast.error('上传第二轮文件失败。请重试。');
      throw error;
    } finally {
      setIsCrossAnalysisSecondRound(false);
    }
  }, []);

  // 导出交叉分析结果
  const exportCrossAnalysisResults = useCallback(() => {
    return api.exportCrossAnalysisResults();
  }, []);

  // 重置交叉分析状态
  const resetCrossAnalysis = useCallback(() => {
    setCrossAnalysisFirstRoundComplete(false);
    setCrossAnalysisSecondRoundComplete(false);
    setCrossAnalysisResults([]);
    setDomainData([]); // 重置域名数据
  }, []);

  return {
    // 状态
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingDomainFilter,
    fileStats,
    mergedStats,
    filteredStats,
    domainCounts,
    brandOverlapData,
    domainFilterResults,
    filterRanges,
    
    // 操作
    uploadFiles,
    applyFilters,
    fetchBrandOverlap,
    fetchFilterRanges,
    filterByDomain,
    getExportUrl,
    getExportUniqueUrl,
    resetData,

    // 交叉分析相关
    isCrossAnalysisFirstRound,
    isCrossAnalysisSecondRound,
    crossAnalysisFirstRoundComplete,
    crossAnalysisSecondRoundComplete,
    crossAnalysisResults,
    domainData, // 暴露域名数据
    uploadCrossAnalysisFirstRound,
    uploadCrossAnalysisSecondRound,
    exportCrossAnalysisResults,
    resetCrossAnalysis,
  };
}