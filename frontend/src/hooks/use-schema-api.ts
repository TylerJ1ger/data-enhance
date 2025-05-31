//frontend/src/hooks/use-schema-api.ts - 完整更新版本
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import * as schemaApi from '@/lib/api/schema-api';
import type {
  SchemaFieldConfig,
  SchemaTypeConfig,
  SchemaGenerateRequest,
  SchemaGenerateResponse,
  SchemaApiError,
  SchemaType,
  // 批量处理相关类型
  SchemaBatchUploadResponse,
  SchemaBatchGenerateRequest,
  SchemaBatchGenerateResponse,
  SchemaBatchExportRequest,
  SchemaBatchExportResponse,
  SchemaBatchSummary,
  SchemaBatchPreviewResponse,
  SchemaBatchState,
  SchemaBatchProgress,
  SchemaBatchError,
  CSVTemplateInfo,
  URLFilterOptions,
  CSVFormatType
} from '@/types';

export function useSchemaApi() {
  // ========================================
  // 单个生成功能的状态管理
  // ========================================
  
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schemaTypes, setSchemaTypes] = useState<Record<string, SchemaTypeConfig> | null>(null);
  const [generatedData, setGeneratedData] = useState<SchemaGenerateResponse | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // ========================================
  // 批量处理状态管理
  // ========================================
  
  const [batchState, setBatchState] = useState<SchemaBatchState>({
    isUploading: false,
    uploadProgress: 0,
    isGenerating: false,
    generateProgress: 0,
    isExporting: false,
    hasUploadedData: false,
    hasGeneratedData: false,
    uploadStats: null,
    generateStats: null,
    summary: null,
    previewData: null,
    lastError: null,
    processingErrors: [],
    detectedFormats: [],
    formatValidation: {}
  });

  const [batchProgress, setBatchProgress] = useState<SchemaBatchProgress>({
    currentStep: 0,
    totalSteps: 4,
    stepName: '准备中',
    stepProgress: 0,
    overallProgress: 0,
    processedItems: 0,
    totalItems: 0
  });

  const [urlFilter, setUrlFilter] = useState<URLFilterOptions>({
    enabled: false,
    pattern: '',
    caseSensitive: false,
    isRegex: false
  });

  // ========================================
  // 新增：后端模板管理状态
  // ========================================
  
  const [backendTemplates, setBackendTemplates] = useState<any[]>([]);
  const [isLoadingBackendTemplates, setIsLoadingBackendTemplates] = useState(false);

  // ========================================
  // API健康检查
  // ========================================

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await schemaApi.checkSchemaApiHealth();
      } catch (error) {
        console.error('Schema API health check failed:', error);
        toast.error('无法连接到结构化数据API服务器，请检查后端服务是否正常运行');
      }
    };

    checkApiHealth();
  }, []);

  // ========================================
  // 单个生成功能实现
  // ========================================

  const fetchSchemaTypes = useCallback(async () => {
    if (schemaTypes) return schemaTypes;

    setIsLoadingTypes(true);
    setLastError(null);
    
    try {
      const data = await schemaApi.getSchemaTypes();
      setSchemaTypes(data);
      
      console.log('成功加载结构化数据类型:', Object.keys(data));
      return data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '获取结构化数据类型失败';
      console.error('获取结构化数据类型错误:', error);
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoadingTypes(false);
    }
  }, [schemaTypes]);

  const generateSchema = useCallback(async (schemaType: string, data: Record<string, any>) => {
    if (!schemaType) {
      toast.error('请先选择结构化数据类型');
      return null;
    }

    if (schemaTypes?.[schemaType]) {
      const requiredFields = schemaTypes[schemaType].required_fields;
      const missingFields = requiredFields.filter(field => {
        const value = data[field];
        return !value || (typeof value === 'string' && value.trim() === '');
      });

      if (missingFields.length > 0) {
        toast.error(`请填写必填字段: ${missingFields.join(', ')}`);
        return null;
      }
    }

    setIsGenerating(true);
    setLastError(null);
    
    try {
      console.log('生成结构化数据:', { schemaType, data });
      
      const result = await schemaApi.generateSchema({
        schema_type: schemaType as SchemaType,
        data: data
      });
      
      setGeneratedData(result);
      toast.success('结构化数据生成成功');
      
      console.log('生成结果:', result);
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '生成结构化数据失败';
      console.error('生成结构化数据错误:', error);
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [schemaTypes]);

  const copyCode = useCallback(async (content: string, format: 'JSON-LD' | 'HTML') => {
    if (!content) {
      toast.error('没有可复制的内容');
      return false;
    }

    try {
      const success = await schemaApi.copyToClipboard(content);
      
      if (success) {
        toast.success(`${format} 代码已复制到剪贴板`);
        return true;
      } else {
        toast.error('复制失败，请手动复制代码');
        return false;
      }
    } catch (error) {
      console.error('复制代码失败:', error);
      toast.error('复制失败，请手动复制代码');
      return false;
    }
  }, []);

  const resetData = useCallback(() => {
    console.log('重置结构化数据生成器数据');
    setGeneratedData(null);
    setLastError(null);
  }, []);

  const validateFieldData = useCallback((schemaType: string, data: Record<string, any>) => {
    if (!schemaTypes?.[schemaType]) {
      return { isValid: false, errors: ['未知的结构化数据类型'] };
    }

    const schema = schemaTypes[schemaType];
    const errors: string[] = [];

    // 检查必填字段
    for (const field of schema.required_fields) {
      const value = data[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${schema.fields[field]?.label || field} 是必填项`);
      }
    }

    // 检查URL格式
    Object.entries(schema.fields).forEach(([fieldKey, fieldConfig]) => {
      const value = data[fieldKey];
      if (value && fieldConfig.type === 'url') {
        try {
          new URL(value);
        } catch {
          errors.push(`${fieldConfig.label} 必须是有效的URL格式`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [schemaTypes]);

  const getFieldDefaultValue = useCallback((fieldType: string) => {
    switch (fieldType) {
      case 'number':
        return '';
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'datetime-local':
        return new Date().toISOString().slice(0, 16);
      default:
        return '';
    }
  }, []);

  // ========================================
  // 后端模板管理功能
  // ========================================

  const loadBackendTemplates = useCallback(async () => {
    setIsLoadingBackendTemplates(true);
    try {
      const templates = await schemaApi.getAllDynamicCSVTemplates();
      setBackendTemplates(templates);
      console.log('成功加载后端模板:', templates.length, '个');
      return templates;
    } catch (error) {
      console.error('加载后端模板失败:', error);
      toast.error('加载模板失败，将使用基础模板');
      // 降级到基础模板
      setBackendTemplates([]);
      return [];
    } finally {
      setIsLoadingBackendTemplates(false);
    }
  }, []);

  const getTemplateDetails = useCallback(async (schemaType: string) => {
    try {
      const details = await schemaApi.getDynamicCSVTemplate(schemaType);
      return details;
    } catch (error) {
      console.error(`获取${schemaType}模板详情失败:`, error);
      return null;
    }
  }, []);

  const downloadCSVTemplate = useCallback((schemaType: string, formatType: CSVFormatType = 'dynamic_fields') => {
    try {
      if (formatType === 'dynamic_fields') {
        // 使用后端API下载动态模板
        schemaApi.downloadDynamicCSVTemplate(schemaType);
        toast.success(`${schemaType}动态字段模板下载开始`);
      } else {
        // 下载传统格式模板（简化版本）
        const headers = 'url,schema_type,data_json';
        const sampleData = `https://example.com/${schemaType.toLowerCase()}-1,${schemaType},"{\\"name\\": \\"示例${schemaType}\\", \\"description\\": \\"这是一个${schemaType}的示例\\"}"`;
        const csvContent = `${headers}\n${sampleData}`;
        
        schemaApi.downloadAsFile(
          csvContent, 
          `${schemaType.toLowerCase()}_traditional_template.csv`, 
          'text/csv'
        );
        toast.success(`${schemaType}传统格式模板下载开始`);
      }
    } catch (error) {
      console.error('下载模板失败:', error);
      toast.error('模板下载失败，请重试');
    }
  }, []);

  const batchDownloadAllTemplates = useCallback(async (formatType: CSVFormatType = 'dynamic_fields') => {
    try {
      await schemaApi.batchDownloadAllTemplates(formatType);
      toast.success(`开始批量下载所有${formatType === 'dynamic_fields' ? '动态字段' : '传统JSON'}格式模板`);
    } catch (error) {
      console.error('批量下载失败:', error);
      toast.error('批量下载失败，请重试');
    }
  }, []);

  const getAvailableTemplates = useCallback(() => {
    if (backendTemplates.length > 0) {
      return backendTemplates;
    }
    // 降级到基础模板
    return schemaApi.getBasicCSVTemplateInfo();
  }, [backendTemplates]);

  // ========================================
  // 批量处理核心功能
  // ========================================

  const uploadBatchFiles = useCallback(async (files: File[]) => {
    // 验证文件
    if (!files || files.length === 0) {
      toast.error('请选择要上传的文件');
      return null;
    }

    setBatchState(prev => ({ 
      ...prev, 
      isUploading: true, 
      uploadProgress: 0,
      lastError: null,
      processingErrors: []
    }));

    setBatchProgress(prev => ({
      ...prev,
      currentStep: 1,
      stepName: '上传文件',
      stepProgress: 0,
      overallProgress: 25
    }));

    try {
      const result = await schemaApi.uploadSchemaBatchFiles(files);
      
      setBatchState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 100,
        hasUploadedData: true,
        uploadStats: result,
        processingErrors: result.processing_errors || [],
        detectedFormats: result.supported_formats || []
      }));

      setBatchProgress(prev => ({
        ...prev,
        stepProgress: 100,
        overallProgress: 25,
        totalItems: result.total_rows
      }));

      await fetchBatchSummary();

      if (result.processing_errors && result.processing_errors.length > 0) {
        toast.warning(`文件上传成功，但发现 ${result.processing_errors.length} 个警告`);
      } else {
        const formatTypes = result.file_stats.map(stat => stat.detected_format);
        const uniqueFormats = [...new Set(formatTypes)];
        
        let formatMessage = '';
        if (uniqueFormats.includes('dynamic_fields')) {
          formatMessage = ' (检测到动态字段格式)';
        } else if (uniqueFormats.includes('data_json')) {
          formatMessage = ' (检测到传统JSON格式)';
        }
        
        toast.success(`成功上传 ${files.length} 个文件，共 ${result.total_rows} 条数据${formatMessage}`);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '文件上传失败';
      setBatchState(prev => ({ 
        ...prev, 
        isUploading: false, 
        lastError: errorMessage 
      }));
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const generateBatchSchemas = useCallback(async (urlFilterPattern?: string) => {
    if (!batchState.hasUploadedData) {
      toast.error('请先上传CSV文件');
      return null;
    }

    setBatchState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      generateProgress: 0,
      lastError: null 
    }));

    setBatchProgress(prev => ({
      ...prev,
      currentStep: 2,
      stepName: '生成结构化数据',
      stepProgress: 0,
      overallProgress: 50
    }));

    try {
      const request: SchemaBatchGenerateRequest = {};
      if (urlFilterPattern && urlFilterPattern.trim()) {
        request.url_filter = urlFilterPattern;
      }

      const result = await schemaApi.generateBatchSchemas(request);
      
      setBatchState(prev => ({
        ...prev,
        isGenerating: false,
        generateProgress: 100,
        hasGeneratedData: true,
        generateStats: result
      }));

      setBatchProgress(prev => ({
        ...prev,
        stepProgress: 100,
        overallProgress: 75,
        processedItems: result.total_processed
      }));

      await fetchBatchSummary();

      if (result.generation_errors && result.generation_errors.length > 0) {
        toast.warning(`批量生成完成，但有 ${result.generation_errors.length} 个错误`);
      } else {
        toast.success(`成功生成 ${result.total_processed} 个结构化数据，涵盖 ${result.unique_urls} 个URL`);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '批量生成失败';
      setBatchState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        lastError: errorMessage 
      }));
      toast.error(errorMessage);
      return null;
    }
  }, [batchState.hasUploadedData]);

  const exportBatchSchemas = useCallback(async (exportType: 'combined' | 'separated') => {
    if (!batchState.hasGeneratedData) {
      toast.error('请先生成结构化数据');
      return null;
    }

    setBatchState(prev => ({ ...prev, isExporting: true, lastError: null }));

    setBatchProgress(prev => ({
      ...prev,
      currentStep: 3,
      stepName: '导出数据',
      stepProgress: 0,
      overallProgress: 90
    }));

    try {
      const request: SchemaBatchExportRequest = { export_type: exportType };
      const result = await schemaApi.exportBatchSchemas(request);

      setBatchProgress(prev => ({
        ...prev,
        stepProgress: 100,
        overallProgress: 100
      }));

      if (exportType === 'combined') {
        await schemaApi.handleBatchExportDownload(result, exportType);
        toast.success('合并导出完成');
      } else {
        toast.success('分离导出完成，请选择要下载的文件');
      }

      setBatchState(prev => ({ ...prev, isExporting: false }));
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '导出失败';
      setBatchState(prev => ({ 
        ...prev, 
        isExporting: false, 
        lastError: errorMessage 
      }));
      toast.error(errorMessage);
      return null;
    }
  }, [batchState.hasGeneratedData]);

  const fetchBatchSummary = useCallback(async () => {
    try {
      const summary = await schemaApi.getSchemaBatchSummary();
      setBatchState(prev => ({ 
        ...prev, 
        summary: summary.summary,
        hasUploadedData: summary.summary.has_batch_data,
        hasGeneratedData: summary.summary.processed_urls > 0
      }));
      return summary;
    } catch (error: any) {
      console.error('获取批量处理摘要失败:', error);
      return null;
    }
  }, []);

  const resetBatchData = useCallback(async () => {
    try {
      await schemaApi.resetSchemaBatchData();
      
      setBatchState({
        isUploading: false,
        uploadProgress: 0,
        isGenerating: false,
        generateProgress: 0,
        isExporting: false,
        hasUploadedData: false,
        hasGeneratedData: false,
        uploadStats: null,
        generateStats: null,
        summary: null,
        previewData: null,
        lastError: null,
        processingErrors: [],
        detectedFormats: [],
        formatValidation: {}
      });

      setBatchProgress({
        currentStep: 0,
        totalSteps: 4,
        stepName: '准备中',
        stepProgress: 0,
        overallProgress: 0,
        processedItems: 0,
        totalItems: 0
      });

      setUrlFilter({
        enabled: false,
        pattern: '',
        caseSensitive: false,
        isRegex: false
      });

      toast.success('批量处理数据已重置');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '重置失败';
      toast.error(errorMessage);
    }
  }, []);

  // ========================================
  // 计算属性和状态派生
  // ========================================

  const overallState = useMemo(() => ({
    isProcessing: batchState.isUploading || batchState.isGenerating || batchState.isExporting,
    canGenerate: batchState.hasUploadedData && !batchState.isGenerating,
    canExport: batchState.hasGeneratedData && !batchState.isExporting,
    hasErrors: batchState.processingErrors.length > 0 || !!batchState.lastError,
    progressPercentage: batchProgress.overallProgress,
    hasDetectedFormats: batchState.detectedFormats.length > 0,
    supportsDynamicFields: batchState.detectedFormats.includes('dynamic_fields'),
    supportsDataJson: batchState.detectedFormats.includes('data_json')
  }), [batchState, batchProgress]);

  const statistics = useMemo(() => {
    if (!batchState.summary) return null;
    
    return {
      totalRows: batchState.summary.total_rows,
      uniqueUrls: batchState.summary.unique_urls,
      processedUrls: batchState.summary.processed_urls,
      schemaTypes: Object.keys(batchState.summary.schema_types).length,
      filesProcessed: batchState.summary.files_processed,
      completionRate: batchState.summary.total_rows > 0 
        ? Math.round((batchState.summary.processed_urls / batchState.summary.unique_urls) * 100)
        : 0,
      formatBreakdown: batchState.uploadStats?.file_stats.reduce((acc, stat) => {
        acc[stat.detected_format] = (acc[stat.detected_format] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };
  }, [batchState.summary, batchState.uploadStats]);

  // ========================================
  // 自动加载和初始化
  // ========================================

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchBatchSummary(),
          loadBackendTemplates()
        ]);
      } catch (error) {
        console.error('Schema API初始化失败:', error);
      }
    };

    initialize();
  }, [fetchBatchSummary, loadBackendTemplates]);

  useEffect(() => {
    if (!schemaTypes && !isLoadingTypes) {
      fetchSchemaTypes();
    }
  }, [schemaTypes, isLoadingTypes, fetchSchemaTypes]);

  // ========================================
  // 返回所有功能和状态
  // ========================================

  return {
    // 单个生成功能
    isLoadingTypes,
    isGenerating,
    isLoading: isLoadingTypes || isGenerating,
    schemaTypes,
    generatedData,
    lastError,
    
    // 单个生成操作函数
    fetchSchemaTypes,
    generateSchema,
    copyCode,
    resetData,
    validateFieldData,
    getFieldDefaultValue,

    // 批量处理功能
    batchState,
    batchProgress,
    urlFilter,
    overallState,
    statistics,
    
    // 批量处理核心操作
    uploadBatchFiles,
    generateBatchSchemas,
    exportBatchSchemas,
    fetchBatchSummary,
    resetBatchData,
    
    // 后端模板管理功能
    backendTemplates,
    isLoadingBackendTemplates,
    loadBackendTemplates,
    getTemplateDetails,
    downloadCSVTemplate,
    batchDownloadAllTemplates,
    getAvailableTemplates,
    
    // URL过滤器操作
    setUrlFilter,
    applyUrlFilter: (pattern: string) => generateBatchSchemas(pattern),
    
    // 工具函数
    validateFiles: (files: File[]) => {
      // 简单的文件验证
      const errors: string[] = [];
      files.forEach(file => {
        if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.xlsx')) {
          errors.push(`${file.name}: 不支持的文件类型`);
        }
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`${file.name}: 文件过大`);
        }
      });
      return {
        isValid: errors.length === 0,
        errors,
        validFiles: files.filter(file => 
          (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx')) &&
          file.size <= 10 * 1024 * 1024
        ),
        invalidFiles: []
      };
    },
    
    formatErrors: (errors: string[]) => errors.join('; '),
    calculateProgress: (current: number, total: number) => 
      total > 0 ? Math.round((current / total) * 100) : 0,
    
    // 状态检查函数
    canStartBatch: () => !overallState.isProcessing && !batchState.hasUploadedData,
    canGenerate: () => batchState.hasUploadedData && !batchState.isGenerating,
    canExport: () => batchState.hasGeneratedData && !batchState.isExporting,
    
    // 进度计算
    getOverallProgress: () => batchProgress.overallProgress,
    getCurrentStep: () => batchProgress.stepName,
    
    // 错误状态
    hasAnyErrors: () => !!lastError || !!batchState.lastError || batchState.processingErrors.length > 0,
    getAllErrors: () => [
      ...(lastError ? [lastError] : []),
      ...(batchState.lastError ? [batchState.lastError] : []),
      ...batchState.processingErrors
    ],
    
    // 数据状态
    hasSingleData: () => !!generatedData,
    hasBatchData: () => batchState.hasGeneratedData,
    hasAnyData: () => !!generatedData || batchState.hasGeneratedData,
    
    // 格式支持检查
    supportsFormat: (formatType: CSVFormatType) => batchState.detectedFormats.includes(formatType),
    getDetectedFormats: () => batchState.detectedFormats,
    getFormatStatistics: () => statistics?.formatBreakdown || {}
  };
}