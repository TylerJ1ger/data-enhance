import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as sitemapApi from '../api/sitemap-api';
import {
  SitemapUploadResponse,
  SitemapFilterRequest,
  SitemapFilterResponse,
  SitemapVisualizationData,
  SitemapAnalysisResponse,
} from '../types/sitemap';

export const useSitemapApi = () => {
  // State for API data
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingCommonPaths, setIsLoadingCommonPaths] = useState(false);

  // State for response data
  const [uploadResponse, setUploadResponse] = useState<SitemapUploadResponse | null>(null);
  const [visualizationData, setVisualizationData] = useState<SitemapVisualizationData | null>(null);
  const [filterResponse, setFilterResponse] = useState<SitemapFilterResponse | null>(null);
  const [analysisResponse, setAnalysisResponse] = useState<SitemapAnalysisResponse | null>(null);
  const [currentVisualizationType, setCurrentVisualizationType] = useState<string>('tree');
  const [commonPaths, setCommonPaths] = useState<string[]>([]);

  // 获取常用路径
  const fetchCommonPaths = useCallback(async (minCount: number = 5) => {
    setIsLoadingCommonPaths(true);
    try {
      const paths = await sitemapApi.getCommonPaths(minCount);
      setCommonPaths(paths);
      return paths;
    } catch (error) {
      console.error('Error fetching common paths:', error);
      return [];
    } finally {
      setIsLoadingCommonPaths(false);
    }
  }, []);

  // 在上传Sitemap后自动获取常用路径
  useEffect(() => {
    if (uploadResponse && uploadResponse.total_urls > 0) {
      fetchCommonPaths();
    }
  }, [uploadResponse, fetchCommonPaths]);

  // Upload sitemap files
  const uploadSitemaps = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await sitemapApi.uploadSitemapFiles(files);
      setUploadResponse(data);
      
      // After upload, fetch visualization data
      await fetchVisualizationData('tree'); // 使用默认的树形图
      
      toast.success(`成功处理 ${files.length} 个文件，包含 ${data.total_urls} 个URL`);
      
      return data;
    } catch (error) {
      console.error('Error uploading sitemaps:', error);
      toast.error('上传Sitemap文件失败，请重试');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Fetch visualization data
  const fetchVisualizationData = useCallback(async (visualizationType: string = 'tree') => {
    setIsLoadingVisualization(true);
    setCurrentVisualizationType(visualizationType);
    try {
      console.log('Fetching visualization data for type:', visualizationType);
      
      // 如果有筛选结果，使用筛选后的URL获取可视化数据
      let data;
      if (filterResponse && filterResponse.filtered_urls.length > 0) {
        data = await sitemapApi.getFilteredVisualization(visualizationType, filterResponse.filtered_urls);
      } else {
        data = await sitemapApi.getSitemapVisualization(visualizationType);
      }
      
      // 检查数据是否有效
      if (!data) {
        console.error('Received null visualization data');
        toast.error('获取可视化数据失败：数据为空');
        return null;
      }
      
      console.log('Received visualization data:', data);
      setVisualizationData(data);
      return data;
    } catch (error) {
      console.error('Error fetching visualization data:', error);
      toast.error('获取可视化数据失败：' + (error.message || '未知错误'));
      return null;
    } finally {
      setIsLoadingVisualization(false);
    }
  }, [filterResponse]);

  // Filter sitemap URLs - 修复后的版本
  const filterSitemap = useCallback(async (filters: SitemapFilterRequest) => {
    setIsFiltering(true);
    try {
      // 预处理筛选条件，确保paths是有效数组
      const processedFilters = {
        ...filters,
        paths: filters.paths?.filter(p => p && p.trim() !== '') || []
      };
      
      if (filters.path && filters.path.trim() !== '' && 
          !processedFilters.paths.includes(filters.path)) {
        processedFilters.paths.push(filters.path);
      }
      
      const data = await sitemapApi.filterSitemap(processedFilters);
      setFilterResponse(data);
      
      // 直接使用筛选后的URLs获取可视化数据
      if (data && data.filtered_urls && data.filtered_urls.length > 0) {
        try {
          const vizData = await sitemapApi.getFilteredVisualization(
            currentVisualizationType,
            data.filtered_urls
          );
          
          if (vizData) {
            setVisualizationData(vizData);
          }
        } catch (vizError) {
          console.error('Error updating visualization after filtering:', vizError);
          // 继续执行，不影响主流程
        }
      }
      
      toast.success(`筛选出 ${data.total_filtered} 个URL`);
      return data;
    } catch (error) {
      console.error('Error filtering sitemap:', error);
      toast.error('筛选Sitemap失败');
      return null;
    } finally {
      setIsFiltering(false);
    }
  }, [currentVisualizationType]);

  // Analyze sitemap structure
  const analyzeSitemap = useCallback(async (detailed: boolean = false) => {
    setIsAnalyzing(true);
    try {
      const data = await sitemapApi.analyzeSitemap(detailed);
      setAnalysisResponse(data);
      
      return data;
    } catch (error) {
      console.error('Error analyzing sitemap:', error);
      toast.error('分析Sitemap结构失败');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Get export URL for merged sitemap
  const getExportUrl = useCallback((format: string = 'xml') => {
    return sitemapApi.exportMergedSitemap(format);
  }, []);

  // Get export URL for filtered URLs
  const getExportFilteredUrl = useCallback((format: string = 'csv') => {
    return sitemapApi.exportFilteredUrls(format);
  }, []);

  // Reset data
  const resetData = useCallback(() => {
    setUploadResponse(null);
    setVisualizationData(null);
    setFilterResponse(null);
    setAnalysisResponse(null);
    setCommonPaths([]);
    setCurrentVisualizationType('tree');
  }, []);

  return {
    // State
    isUploading,
    isFiltering,
    isLoadingVisualization,
    isAnalyzing,
    isLoadingCommonPaths,
    uploadResponse,
    visualizationData,
    filterResponse,
    analysisResponse,
    currentVisualizationType,
    commonPaths,
    
    // Actions
    uploadSitemaps,
    fetchVisualizationData,
    filterSitemap,
    analyzeSitemap,
    fetchCommonPaths,
    getExportUrl,
    getExportFilteredUrl,
    resetData,
  };
};