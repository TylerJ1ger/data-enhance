//frontend-new/src/hooks/use-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as api from '@/lib/api/api';
import {
  UploadResponse,
  FilterRanges,
  FilterResponse,
  BrandOverlapResponse,
  FilterRangeValues,
  FileStats,
  DataStats,
  KeywordFilterResponse,
} from '@/types';

export function useApi() {
  // 状态管理 - API 加载状态
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOverlap, setIsLoadingOverlap] = useState(false);
  const [isLoadingRanges, setIsLoadingRanges] = useState(false);
  const [isLoadingKeywordFilter, setIsLoadingKeywordFilter] = useState(false);

  // 状态管理 - 响应数据
  const [fileStats, setFileStats] = useState<FileStats[]>([]);
  const [mergedStats, setMergedStats] = useState<DataStats | null>(null);
  const [filteredStats, setFilteredStats] = useState<DataStats | null>(null);
  const [keywordCounts, setKeywordCounts] = useState<Record<string, number>>({});
  const [brandOverlapData, setBrandOverlapData] = useState<BrandOverlapResponse | null>(null);
  const [keywordFilterResults, setKeywordFilterResults] = useState<KeywordFilterResponse | null>(null);
  const [filterRanges, setFilterRanges] = useState<FilterRangeValues>({
    position: [0, 100],
    search_volume: [0, 1000000],
    keyword_difficulty: [0, 100],
    cpc: [0, 10],
    keyword_frequency: [1, 100], // 关键词重复次数筛选范围
  });

  // 在组件挂载时检查 API 健康状态
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await api.checkHealth();
      } catch (error) {
        toast.error('无法连接到 API 服务器。请确认后端服务是否正常运行。');
      }
    };

    checkApiHealth();
  }, []);

  // 上传文件
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await api.uploadFiles(files);
      setFileStats(data.file_stats);
      setMergedStats(data.merged_stats);
      setFilteredStats(data.merged_stats); // 初始时，过滤后数据 = 合并数据
      
      // 加载初始过滤范围
      await fetchFilterRanges();
      
      // 加载初始品牌重叠数据
      await fetchBrandOverlap();
      
      toast.success(`成功处理 ${files.length} 个文件`);
      
      return data;
    } catch (error) {
      console.error('上传文件错误:', error);
      toast.error('文件上传失败，请重试。');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 应用过滤器
  const applyFilters = useCallback(async (filters: FilterRanges) => {
    setIsFiltering(true);
    try {
      const data = await api.applyFilters(filters);
      setFilteredStats(data.filtered_stats);
      setKeywordCounts(data.keyword_counts);
      
      // 过滤后更新品牌重叠数据
      await fetchBrandOverlap();
      
      toast.success('筛选条件已成功应用');
      
      return data;
    } catch (error) {
      console.error('应用筛选条件错误:', error);
      toast.error('应用筛选条件失败，请重试。');
      throw error;
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // 获取品牌重叠数据
  const fetchBrandOverlap = useCallback(async () => {
    setIsLoadingOverlap(true);
    try {
      const data = await api.getBrandOverlap();
      setBrandOverlapData(data);
      return data;
    } catch (error) {
      console.error('获取品牌重叠数据错误:', error);
      // 后台操作，不显示 toast 提示
      return null;
    } finally {
      setIsLoadingOverlap(false);
    }
  }, []);

  // 获取过滤范围
  const fetchFilterRanges = useCallback(async () => {
    setIsLoadingRanges(true);
    try {
      const data = await api.getFilterRanges();
      setFilterRanges({
        ...data,
        keyword_frequency: data.keyword_frequency || [1, 100], // 确保有关键词频率范围
      });
      return data;
    } catch (error) {
      console.error('获取过滤范围错误:', error);
      // 后台操作，不显示 toast 提示
      return null;
    } finally {
      setIsLoadingRanges(false);
    }
  }, []);

  // 关键词筛选
  const filterByKeyword = useCallback(async (keyword: string) => {
    setIsLoadingKeywordFilter(true);
    try {
      const data = await api.filterByKeyword(keyword);
      setKeywordFilterResults(data);
      
      if (data.results.length === 0) {
        toast.info(`未找到匹配关键词 "${keyword}" 的数据`);
      } else {
        toast.success(`找到 ${data.results.length} 条包含关键词 "${keyword}" 的数据`);
      }
      
      return data;
    } catch (error) {
      console.error('关键词筛选错误:', error);
      toast.error('关键词筛选失败，请重试');
      return null;
    } finally {
      setIsLoadingKeywordFilter(false);
    }
  }, []);

  // 获取导出 URL
  const getExportUrl = useCallback(() => {
    return api.exportData();
  }, []);

  // 获取唯一导出 URL
  const getExportUniqueUrl = useCallback(() => {
    return api.exportUniqueData();
  }, []);

  // 重置所有数据
  const resetData = useCallback(() => {
    setFileStats([]);
    setMergedStats(null);
    setFilteredStats(null);
    setKeywordCounts({});
    setBrandOverlapData(null);
    setKeywordFilterResults(null);
    setFilterRanges({
      position: [0, 100],
      search_volume: [0, 1000000],
      keyword_difficulty: [0, 100],
      cpc: [0, 10],
      keyword_frequency: [1, 100],
    });
  }, []);

  return {
    // 状态
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingKeywordFilter,
    fileStats,
    mergedStats,
    filteredStats,
    keywordCounts,
    brandOverlapData,
    keywordFilterResults,
    filterRanges,
    
    // 操作
    uploadFiles,
    applyFilters,
    fetchBrandOverlap,
    fetchFilterRanges,
    filterByKeyword,
    getExportUrl,
    getExportUniqueUrl,
    resetData,
  };
}