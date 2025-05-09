import { useState, useCallback } from 'react';
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

  // State for response data
  const [uploadResponse, setUploadResponse] = useState<SitemapUploadResponse | null>(null);
  const [visualizationData, setVisualizationData] = useState<SitemapVisualizationData | null>(null);
  const [filterResponse, setFilterResponse] = useState<SitemapFilterResponse | null>(null);
  const [analysisResponse, setAnalysisResponse] = useState<SitemapAnalysisResponse | null>(null);

  // Upload sitemap files
  const uploadSitemaps = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await sitemapApi.uploadSitemapFiles(files);
      setUploadResponse(data);
      
      // After upload, fetch visualization data
      await fetchVisualizationData();
      
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
    try {
      const data = await sitemapApi.getSitemapVisualization(visualizationType);
      setVisualizationData(data);
      return data;
    } catch (error) {
      console.error('Error fetching visualization data:', error);
      toast.error('获取可视化数据失败');
      return null;
    } finally {
      setIsLoadingVisualization(false);
    }
  }, []);

  // Filter sitemap URLs
  const filterSitemap = useCallback(async (filters: SitemapFilterRequest) => {
    setIsFiltering(true);
    try {
      const data = await sitemapApi.filterSitemap(filters);
      setFilterResponse(data);
      
      toast.success(`筛选出 ${data.total_filtered} 个URL`);
      
      return data;
    } catch (error) {
      console.error('Error filtering sitemap:', error);
      toast.error('筛选Sitemap失败');
      return null;
    } finally {
      setIsFiltering(false);
    }
  }, []);

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

  // Get export URL
  const getExportUrl = useCallback((format: string = 'xml') => {
    return sitemapApi.exportMergedSitemap(format);
  }, []);

  // Reset data
  const resetData = useCallback(() => {
    setUploadResponse(null);
    setVisualizationData(null);
    setFilterResponse(null);
    setAnalysisResponse(null);
  }, []);

  return {
    // State
    isUploading,
    isFiltering,
    isLoadingVisualization,
    isAnalyzing,
    uploadResponse,
    visualizationData,
    filterResponse,
    analysisResponse,
    
    // Actions
    uploadSitemaps,
    fetchVisualizationData,
    filterSitemap,
    analyzeSitemap,
    getExportUrl,
    resetData,
  };
};