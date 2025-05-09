import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as api from '../api/api';
import {
  UploadResponse,
  FilterRanges,
  FilterResponse,
  BrandOverlapResponse,
  FilterRangeValues,
  FileStats,
  DataStats,
  KeywordFilterResponse,
} from '../types';

export const useApi = () => {
  // State for API data
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOverlap, setIsLoadingOverlap] = useState(false);
  const [isLoadingRanges, setIsLoadingRanges] = useState(false);
  const [isLoadingKeywordFilter, setIsLoadingKeywordFilter] = useState(false);

  // State for response data
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

  // Check API health on mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await api.checkHealth();
      } catch (error) {
        toast.error('Could not connect to API. Please check if the backend server is running.');
      }
    };

    checkApiHealth();
  }, []);

  // Upload files
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await api.uploadFiles(files);
      setFileStats(data.file_stats);
      setMergedStats(data.merged_stats);
      setFilteredStats(data.merged_stats); // Initially, filtered = merged
      
      // Load initial filter ranges
      await fetchFilterRanges();
      
      // Load initial brand overlap data
      await fetchBrandOverlap();
      
      toast.success(`Successfully processed ${files.length} file(s)`);
      
      return data;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files. Please try again.');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Apply filters
  const applyFilters = useCallback(async (filters: FilterRanges) => {
    setIsFiltering(true);
    try {
      const data = await api.applyFilters(filters);
      setFilteredStats(data.filtered_stats);
      setKeywordCounts(data.keyword_counts);
      
      // Update brand overlap data after filter
      await fetchBrandOverlap();
      
      toast.success('Filters applied successfully');
      
      return data;
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error('Failed to apply filters. Please try again.');
      throw error;
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // Fetch brand overlap data
  const fetchBrandOverlap = useCallback(async () => {
    setIsLoadingOverlap(true);
    try {
      const data = await api.getBrandOverlap();
      setBrandOverlapData(data);
      return data;
    } catch (error) {
      console.error('Error fetching brand overlap data:', error);
      // Don't show toast for this as it's a background operation
      return null;
    } finally {
      setIsLoadingOverlap(false);
    }
  }, []);

  // Fetch filter ranges
  const fetchFilterRanges = useCallback(async () => {
    setIsLoadingRanges(true);
    try {
      const data = await api.getFilterRanges();
      setFilterRanges({
        ...data,
        keyword_frequency: data.keyword_frequency || [1, 100], // 确保有关键词频率范围，即使API没有返回
      });
      return data;
    } catch (error) {
      console.error('Error fetching filter ranges:', error);
      // Don't show toast for this as it's a background operation
      return null;
    } finally {
      setIsLoadingRanges(false);
    }
  }, []);

  // Filter by keyword - 新增函数
  const filterByKeyword = useCallback(async (keyword: string) => {
    setIsLoadingKeywordFilter(true);
    try {
      const data = await api.filterByKeyword(keyword);
      setKeywordFilterResults(data);
      
      if (data.results.length === 0) {
        toast.info(`未找到匹配关键词 "${keyword}" 的数据`);
      } else {
        toast.success(`找到 ${data.results.length} 个品牌下的关键词 "${keyword}" 数据`);
      }
      
      return data;
    } catch (error) {
      console.error('Error filtering by keyword:', error);
      toast.error('筛选关键词失败，请重试');
      return null;
    } finally {
      setIsLoadingKeywordFilter(false);
    }
  }, []);

  // Get export URL
  const getExportUrl = useCallback(() => {
    return api.exportData();
  }, []);

  // Get export unique URL
  const getExportUniqueUrl = useCallback(() => {
    return api.exportUniqueData();
  }, []);

  // Reset all data
  const resetData = useCallback(() => {
    setFileStats([]);
    setMergedStats(null);
    setFilteredStats(null);
    setKeywordCounts({});
    setBrandOverlapData(null);
    setKeywordFilterResults(null); // 重置关键词筛选结果
    setFilterRanges({
      position: [0, 100],
      search_volume: [0, 1000000],
      keyword_difficulty: [0, 100],
      cpc: [0, 10],
      keyword_frequency: [1, 100],
    });
  }, []);

  return {
    // State
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingKeywordFilter, // 新增状态
    fileStats,
    mergedStats,
    filteredStats,
    keywordCounts,
    brandOverlapData,
    keywordFilterResults, // 新增状态
    filterRanges,
    
    // Actions
    uploadFiles,
    applyFilters,
    fetchBrandOverlap,
    fetchFilterRanges,
    filterByKeyword, // 新增函数
    getExportUrl,
    getExportUniqueUrl,
    resetData,
  };
};