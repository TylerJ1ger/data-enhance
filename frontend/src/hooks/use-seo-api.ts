//frontend-new/src/hooks/use-seo-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as seoApi from '@/lib/api/seo-api';
import {
  SEOUploadResponse,
  SEOCategory,
  SEOIssue,
  ContentExtractor
} from '@/types/seo';

export function useSeoApi() {
  // 状态管理 - API调用状态
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  // 状态管理 - 响应数据
  const [analysisResults, setAnalysisResults] = useState<SEOUploadResponse | null>(null);
  const [categories, setCategories] = useState<SEOCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredIssues, setFilteredIssues] = useState<{
    issues: SEOIssue[];
    warnings: SEOIssue[];
    opportunities: SEOIssue[];
  }>({
    issues: [],
    warnings: [],
    opportunities: []
  });

  // 高级分析选项状态
  const [contentExtractor, setContentExtractor] = useState<ContentExtractor>('auto');
  const [enableAdvancedAnalysis, setEnableAdvancedAnalysis] = useState<boolean>(true);

  // 在组件挂载时加载分类数据
  useEffect(() => {
    fetchCategories();
  }, []);

  // 当选择的分类变化时更新过滤后的问题
  useEffect(() => {
    if (!analysisResults) return;
    
    if (!selectedCategory) {
      setFilteredIssues(analysisResults.issues);
      return;
    }
    
    const filtered = {
      issues: analysisResults.issues.issues.filter(issue => issue.category === selectedCategory),
      warnings: analysisResults.issues.warnings.filter(issue => issue.category === selectedCategory),
      opportunities: analysisResults.issues.opportunities.filter(issue => issue.category === selectedCategory)
    };
    
    setFilteredIssues(filtered);
  }, [selectedCategory, analysisResults]);

  // 上传HTML文件进行SEO分析
  const uploadSEOFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const data = await seoApi.uploadSEOFile({
        file,
        contentExtractor,
        enableAdvancedAnalysis
      });
      
      setAnalysisResults(data);
      setFilteredIssues(data.issues);
      
      const totalIssues = data.issues_count.issues + 
                          data.issues_count.warnings + 
                          data.issues_count.opportunities;
      
      toast.success(`SEO分析完成! 发现 ${totalIssues} 个相关问题（使用API v1）`);
      
      return data;
    } catch (error) {
      console.error('Error uploading HTML file:', error);
      toast.error('上传HTML文件失败，请重试');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [contentExtractor, enableAdvancedAnalysis]);

  // 获取SEO问题分类
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const data = await seoApi.getSEOCategories();
      setCategories(data.categories);
      return data.categories;
    } catch (error) {
      console.error('Error fetching SEO categories:', error);
      // 这种后台操作无需显示toast通知
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // 重置所有数据
  const resetData = useCallback(() => {
    setAnalysisResults(null);
    setSelectedCategory(null);
    setFilteredIssues({
      issues: [],
      warnings: [],
      opportunities: []
    });
  }, []);

  // 检查API健康状态 - 使用通用健康检查端点
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await seoApi.checkHealth();
        console.log('API健康检查通过，SEO功能可用（使用v1端点）');
      } catch (error) {
        toast.error('无法连接到API服务器。请检查后端服务器是否正在运行。');
      }
    };

    checkApiHealth();
  }, []);

  return {
    // 状态
    isUploading,
    isLoadingCategories,
    analysisResults,
    categories,
    selectedCategory,
    filteredIssues,
    
    // 高级选项状态
    contentExtractor,
    setContentExtractor,
    enableAdvancedAnalysis,
    setEnableAdvancedAnalysis,
    
    // 操作方法
    uploadSEOFile,
    fetchCategories,
    setSelectedCategory,
    resetData,
  };
}