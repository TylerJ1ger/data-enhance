//frontend-new/src/hooks/use-seo-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as seoApi from '@/lib/api/seo-api';
import {
  SEOUploadResponse,
  SEOBatchUploadResponse,
  SEOBatchResultsResponse,
  SEOCategory,
  SEOIssue,
  ContentExtractor,
  SEOExportType,
  SEOFileStats,
  SEOBatchStats
} from '@/types/seo';

export function useSeoApi() {
  // 状态管理 - API调用状态
  const [isUploading, setIsUploading] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingBatchResults, setIsLoadingBatchResults] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // 状态管理 - 单文件分析数据
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

  // 状态管理 - 批量分析数据（新增）
  const [batchResults, setBatchResults] = useState<SEOBatchUploadResponse | null>(null);
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<SEOUploadResponse[]>([]);
  const [batchStats, setBatchStats] = useState<SEOBatchStats | null>(null);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);

  // 高级分析选项状态
  const [contentExtractor, setContentExtractor] = useState<ContentExtractor>('auto');
  const [enableAdvancedAnalysis, setEnableAdvancedAnalysis] = useState<boolean>(true);

  // 在组件挂载时加载分类数据
  useEffect(() => {
    fetchCategories();
  }, []);

  // 当选择的分类变化时更新过滤后的问题（单文件模式）
  useEffect(() => {
    if (!analysisResults || isBatchMode) return;
    
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
  }, [selectedCategory, analysisResults, isBatchMode]);

  // 上传HTML文件进行SEO分析（单文件）
  const uploadSEOFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsBatchMode(false);
    
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

  // 批量上传HTML文件进行SEO分析（新增）
  const batchUploadSEOFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      toast.error('请选择要上传的文件');
      return;
    }

    // 验证文件
    const validation = seoApi.validateHTMLFiles(files);
    if (!validation.valid) {
      toast.error(`文件验证失败: ${validation.errors.join('; ')}`);
      return;
    }

    setIsBatchUploading(true);
    setIsBatchMode(true);
    
    try {
      const data = await seoApi.batchUploadSEOFiles({
        files: validation.validFiles,
        contentExtractor,
        enableAdvancedAnalysis
      });
      
      setBatchResults(data);
      setBatchStats(data.batch_stats);
      
      const successCount = data.successful_files;
      const totalCount = data.total_files;
      const failCount = data.failed_files;
      
      let message = `批量SEO分析完成! 成功处理 ${successCount}/${totalCount} 个文件`;
      if (failCount > 0) {
        message += `，${failCount} 个文件处理失败`;
      }
      
      if (successCount > 0) {
        toast.success(message);
        // 自动加载详细结果
        await fetchBatchResults();
      } else {
        toast.error('所有文件处理失败，请检查文件格式');
      }
      
      return data;
    } catch (error) {
      console.error('Error batch uploading HTML files:', error);
      
      // 类型安全的错误处理
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 408) {
          toast.error('批量分析超时，请尝试减少文件数量');
        } else {
          toast.error('批量上传HTML文件失败，请重试');
        }
      } else {
        toast.error('批量上传HTML文件失败，请重试');
      }
      throw error;
    } finally {
      setIsBatchUploading(false);
    }
  }, [contentExtractor, enableAdvancedAnalysis]);

  // 获取批量分析结果详情（新增）
  const fetchBatchResults = useCallback(async () => {
    setIsLoadingBatchResults(true);
    try {
      const data = await seoApi.getBatchSEOResults();
      setBatchAnalysisResults(data.results);
      setBatchStats(data.stats);
      return data;
    } catch (error) {
      console.error('Error fetching batch results:', error);
      toast.error('获取批量分析结果失败');
      return null;
    } finally {
      setIsLoadingBatchResults(false);
    }
  }, []);

  // 获取批量分析统计信息（新增）
  const fetchBatchStats = useCallback(async () => {
    try {
      const data = await seoApi.getBatchSEOStats();
      setBatchStats(data.stats);
      return data.stats;
    } catch (error) {
      console.error('Error fetching batch stats:', error);
      return null;
    }
  }, []);

  // 导出批量分析结果（新增）
  const exportBatchResults = useCallback(async (exportType: SEOExportType = 'summary', customFilename?: string) => {
    setIsExporting(true);
    try {
      await seoApi.downloadAndSaveBatchResults(exportType, customFilename);
      toast.success(`批量分析结果已导出为 ${exportType === 'summary' ? '摘要' : '详细'} CSV文件`);
    } catch (error) {
      console.error('Error exporting batch results:', error);
      toast.error('导出批量分析结果失败');
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  // 清除批量分析结果（新增）
  const clearBatchResults = useCallback(async () => {
    try {
      await seoApi.clearBatchSEOResults();
      setBatchResults(null);
      setBatchAnalysisResults([]);
      setBatchStats(null);
      toast.success('批量分析结果已清除');
    } catch (error) {
      console.error('Error clearing batch results:', error);
      toast.error('清除批量分析结果失败');
    }
  }, []);

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
    // 重置单文件分析数据
    setAnalysisResults(null);
    setSelectedCategory(null);
    setFilteredIssues({
      issues: [],
      warnings: [],
      opportunities: []
    });
    
    // 重置批量分析数据
    setBatchResults(null);
    setBatchAnalysisResults([]);
    setBatchStats(null);
    setIsBatchMode(false);
  }, []);

  // 切换分析模式（新增）
  const switchMode = useCallback((mode: 'single' | 'batch') => {
    setIsBatchMode(mode === 'batch');
    if (mode === 'single') {
      // 切换到单文件模式时清除批量数据
      setBatchResults(null);
      setBatchAnalysisResults([]);
      setBatchStats(null);
    } else {
      // 切换到批量模式时清除单文件数据
      setAnalysisResults(null);
      setFilteredIssues({
        issues: [],
        warnings: [],
        opportunities: []
      });
    }
  }, []);

  // 获取导出URL（用于链接导出）
  const getBatchExportUrl = useCallback((exportType: SEOExportType = 'summary') => {
    return seoApi.exportBatchSEOResults(exportType);
  }, []);

  // 检查API健康状态
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

  // 计算批量分析摘要信息（新增）
  const getBatchSummary = useCallback(() => {
    if (!batchResults || !batchStats) return null;

    const avgScore = batchAnalysisResults.length > 0 
      ? Math.round(batchAnalysisResults
          .filter(r => !r.error)
          .reduce((sum, r) => sum + r.seo_score, 0) / batchAnalysisResults.filter(r => !r.error).length)
      : 0;

    return {
      totalFiles: batchStats.total_files,
      successfulFiles: batchStats.processed_files,
      failedFiles: batchStats.failed_files,
      averageScore: avgScore,
      totalIssues: batchStats.total_issues,
      totalWarnings: batchStats.total_warnings,
      totalOpportunities: batchStats.total_opportunities,
      criticalIssuesCount: batchAnalysisResults.filter(r => r.has_critical_issues).length
    };
  }, [batchResults, batchStats, batchAnalysisResults]);

  return {
    // 状态
    isUploading,
    isBatchUploading,
    isLoadingCategories,
    isLoadingBatchResults,
    isExporting,
    
    // 单文件分析数据
    analysisResults,
    categories,
    selectedCategory,
    filteredIssues,
    
    // 批量分析数据
    batchResults,
    batchAnalysisResults,
    batchStats,
    isBatchMode,
    
    // 高级选项状态
    contentExtractor,
    setContentExtractor,
    enableAdvancedAnalysis,
    setEnableAdvancedAnalysis,
    
    // 操作方法 - 单文件
    uploadSEOFile,
    setSelectedCategory,
    
    // 操作方法 - 批量
    batchUploadSEOFiles,
    fetchBatchResults,
    fetchBatchStats,
    exportBatchResults,
    clearBatchResults,
    getBatchExportUrl,
    
    // 通用操作方法
    fetchCategories,
    resetData,
    switchMode,
    getBatchSummary,
  };
}