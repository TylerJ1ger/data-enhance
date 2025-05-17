//frontend-new/src/hooks/use-sitemap-api.ts
"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as sitemapApi from '@/lib/api/sitemap-api';
import {
  SitemapUploadResponse,
  SitemapFilterRequest,
  SitemapFilterResponse,
  SitemapVisualizationData,
  SitemapAnalysisResponse,
} from '@/types/sitemap';

export function useSitemapApi() {
  // 状态管理
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingCommonPaths, setIsLoadingCommonPaths] = useState(false);

  // API响应数据
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
      console.error('获取常用路径失败:', error);
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

  // 上传Sitemap文件
  const uploadSitemaps = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await sitemapApi.uploadSitemapFiles(files);
      setUploadResponse(data);
      
      // 上传成功后获取可视化数据
      await fetchVisualizationData('tree'); // 使用默认的树形图
      
      toast.success(`成功处理 ${files.length} 个文件，包含 ${data.total_urls} 个URL`);
      
      return data;
    } catch (error: any) {
      console.error('上传Sitemap文件失败:', error);
      toast.error(`上传失败: ${error.message || '请重试'}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 获取可视化数据
  const fetchVisualizationData = useCallback(async (visualizationType: string = 'tree') => {
    setIsLoadingVisualization(true);
    setCurrentVisualizationType(visualizationType);
    try {
      console.log('获取可视化数据，类型:', visualizationType);
      
      // 如果有筛选结果，使用筛选后的URL获取可视化数据
      let data;
      if (filterResponse && filterResponse.filtered_urls.length > 0) {
        data = await sitemapApi.getFilteredVisualization(visualizationType, filterResponse.filtered_urls);
      } else {
        data = await sitemapApi.getSitemapVisualization(visualizationType);
      }
      
      // 检查数据是否有效
      if (!data) {
        console.error('收到空的可视化数据');
        toast.error('获取可视化数据失败：数据为空');
        return null;
      }
      
      console.log('收到可视化数据:', data);
      setVisualizationData(data);
      return data;
    } catch (error: any) {
      console.error('获取可视化数据失败:', error);
      toast.error(`获取可视化数据失败: ${error.message || '未知错误'}`);
      return null;
    } finally {
      setIsLoadingVisualization(false);
    }
  }, [filterResponse]);

  // 筛选Sitemap URLs
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
          console.error('筛选后更新可视化失败:', vizError);
          // 继续执行，不影响主流程
        }
      }
      
      toast.success(`筛选出 ${data.total_filtered} 个URL`);
      return data;
    } catch (error: any) {
      console.error('筛选Sitemap失败:', error);
      toast.error(`筛选失败: ${error.message || '未知错误'}`);
      return null;
    } finally {
      setIsFiltering(false);
    }
  }, [currentVisualizationType]);

  // 分析Sitemap结构
  const analyzeSitemap = useCallback(async (detailed: boolean = false) => {
    setIsAnalyzing(true);
    try {
      const data = await sitemapApi.analyzeSitemap(detailed);
      setAnalysisResponse(data);
      
      return data;
    } catch (error: any) {
      console.error('分析Sitemap结构失败:', error);
      toast.error(`分析失败: ${error.message || '未知错误'}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // 获取合并Sitemap导出URL
  const getExportUrl = useCallback((format: string = 'xml') => {
    return sitemapApi.exportMergedSitemap(format);
  }, []);

  // 获取筛选后URL导出地址
  const getExportFilteredUrl = useCallback((format: string = 'csv') => {
    return sitemapApi.exportFilteredUrls(format);
  }, []);

  // 重置数据
  const resetData = useCallback(() => {
    setUploadResponse(null);
    setVisualizationData(null);
    setFilterResponse(null);
    setAnalysisResponse(null);
    setCommonPaths([]);
    setCurrentVisualizationType('tree');
  }, []);

  return {
    // 状态
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
    
    // 操作函数
    uploadSitemaps,
    fetchVisualizationData,
    filterSitemap,
    analyzeSitemap,
    fetchCommonPaths,
    getExportUrl,
    getExportFilteredUrl,
    resetData,
  };
}