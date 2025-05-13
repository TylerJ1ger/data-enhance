// frontend/src/hooks/useBacklinkApi.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as api from '../api/backlink-api';
import {
  BacklinkUploadResponse,
  BacklinkFilterRanges,
  BacklinkFilterResponse,
  BrandDomainOverlapResponse,
  BacklinkFilterRangeValues,
  FileStats,
  BacklinkDataStats,
  DomainFilterResponse,
} from '../types';

export const useBacklinkApi = () => {
  // State for API data
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOverlap, setIsLoadingOverlap] = useState(false);
  const [isLoadingRanges, setIsLoadingRanges] = useState(false);
  const [isLoadingDomainFilter, setIsLoadingDomainFilter] = useState(false);

  // State for response data
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

  // Check API health on mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await api.checkBacklinkHealth();
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
      const data = await api.uploadBacklinkFiles(files);
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
  const applyFilters = useCallback(async (filters: BacklinkFilterRanges) => {
    setIsFiltering(true);
    try {
      const data = await api.applyBacklinkFilters(filters);
      setFilteredStats(data.filtered_stats);
      setDomainCounts(data.domain_counts);
      
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
      const data = await api.getBacklinkBrandOverlap();
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
      const data = await api.getBacklinkFilterRanges();
      setFilterRanges(data);
      return data;
    } catch (error) {
      console.error('Error fetching filter ranges:', error);
      // Don't show toast for this as it's a background operation
      return null;
    } finally {
      setIsLoadingRanges(false);
    }
  }, []);

  // Filter by domain
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
      console.error('Error filtering by domain:', error);
      toast.error('筛选域名失败，请重试');
      return null;
    } finally {
      setIsLoadingDomainFilter(false);
    }
  }, []);

  // Get export URL
  const getExportUrl = useCallback(() => {
    return api.exportBacklinkData();
  }, []);

  // Get export unique URL
  const getExportUniqueUrl = useCallback(() => {
    return api.exportUniqueBacklinkData();
  }, []);

  // Reset all data
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

  return {
    // State
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
    
    // Actions
    uploadFiles,
    applyFilters,
    fetchBrandOverlap,
    fetchFilterRanges,
    filterByDomain,
    getExportUrl,
    getExportUniqueUrl,
    resetData,
  };
};