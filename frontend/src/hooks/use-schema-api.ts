//frontend/src/hooks/use-schema-api.ts
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
  URLFilterOptions
} from '@/types';

export function useSchemaApi() {
  // ========================================
  // 原有单个生成功能的状态管理
  // ========================================
  
  // 基础状态管理
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 数据状态 - 修正类型定义
  const [schemaTypes, setSchemaTypes] = useState<Record<string, SchemaTypeConfig> | null>(null);
  const [generatedData, setGeneratedData] = useState<SchemaGenerateResponse | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // ========================================
  // 新增：批量处理状态管理
  // ========================================
  
  // 批量处理核心状态
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
    processingErrors: []
  });

  // 批量处理进度状态
  const [batchProgress, setBatchProgress] = useState<SchemaBatchProgress>({
    currentStep: 0,
    totalSteps: 4,
    stepName: '准备中',
    stepProgress: 0,
    overallProgress: 0,
    processedItems: 0,
    totalItems: 0
  });

  // URL过滤器状态
  const [urlFilter, setUrlFilter] = useState<URLFilterOptions>({
    enabled: false,
    pattern: '',
    caseSensitive: false,
    isRegex: false
  });

  // ========================================
  // 原有功能实现（保持不变）
  // ========================================

  // 组件挂载时检查API健康状态
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

  // 获取支持的结构化数据类型
  const fetchSchemaTypes = useCallback(async () => {
    // 避免重复请求
    if (schemaTypes) return schemaTypes;

    setIsLoadingTypes(true);
    setLastError(null);
    
    try {
      const data = await schemaApi.getSchemaTypes();
      setSchemaTypes(data); // 修复：直接设置 data，而不是 data.schema_types
      
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

  // 生成结构化数据
  const generateSchema = useCallback(async (schemaType: string, data: Record<string, any>) => {
    if (!schemaType) {
      toast.error('请先选择结构化数据类型');
      return null;
    }

    // 验证必填字段
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

  // 复制代码到剪贴板
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

  // 下载代码文件
  const downloadCode = useCallback((content: string, filename: string, mimeType: string = 'application/json') => {
    if (!content) {
      toast.error('没有可下载的内容');
      return;
    }

    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success(`文件 ${filename} 下载开始`);
    } catch (error) {
      console.error('下载文件失败:', error);
      toast.error('下载文件失败，请重试');
    }
  }, []);

  // 重置所有数据
  const resetData = useCallback(() => {
    console.log('重置结构化数据生成器数据');
    setGeneratedData(null);
    setLastError(null);
  }, []);

  // 重置所有状态（包括类型数据）
  const resetAll = useCallback(() => {
    console.log('重置所有结构化数据生成器状态');
    setSchemaTypes(null);
    setGeneratedData(null);
    setLastError(null);
  }, []);

  // 验证字段数据
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

    // 检查URL格式（简单验证）
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

  // 获取字段的默认值
  const getFieldDefaultValue = useCallback((fieldType: string) => {
    switch (fieldType) {
      case 'number':
        return '';
      case 'date':
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      case 'datetime-local':
        return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
      default:
        return '';
    }
  }, []);

  // ========================================
  // 新增：批量处理核心功能
  // ========================================

  // 批量上传文件
  const uploadBatchFiles = useCallback(async (files: File[]) => {
    // 验证文件
    const validation = schemaApi.validateMultipleCSVFiles(files);
    if (!validation.isValid) {
      const errorMessage = schemaApi.formatBatchProcessingErrors(validation.errors);
      setBatchState(prev => ({ 
        ...prev, 
        lastError: errorMessage, 
        processingErrors: validation.errors 
      }));
      toast.error('文件验证失败');
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
      const result = await schemaApi.uploadSchemaBatchFiles(validation.validFiles);
      
      setBatchState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 100,
        hasUploadedData: true,
        uploadStats: result,
        processingErrors: result.processing_errors || []
      }));

      setBatchProgress(prev => ({
        ...prev,
        stepProgress: 100,
        overallProgress: 25,
        totalItems: result.total_rows
      }));

      // 自动获取摘要信息
      await fetchBatchSummary();

      if (result.processing_errors && result.processing_errors.length > 0) {
        toast.warning(`文件上传成功，但发现 ${result.processing_errors.length} 个警告`);
      } else {
        toast.success(`成功上传 ${validation.validFiles.length} 个文件，共 ${result.total_rows} 条数据`);
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

  // 批量生成结构化数据
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

      // 更新摘要信息
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

  // 导出批量数据
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

      // 处理下载
      await schemaApi.handleBatchExportDownload(result, exportType);

      setBatchState(prev => ({ ...prev, isExporting: false }));

      toast.success(`${exportType === 'combined' ? '合并' : '分离'}导出完成`);
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

  // 获取批量处理摘要
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

  // 预览批量数据
  const previewBatchData = useCallback(async (limit: number = 10) => {
    try {
      const preview = await schemaApi.previewSchemaBatchData(limit);
      setBatchState(prev => ({ ...prev, previewData: preview }));
      return preview;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '预览数据失败';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // 重置批量数据
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
        processingErrors: []
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
  // 模板和工具功能
  // ========================================

  // 下载CSV模板
  const downloadCSVTemplate = useCallback((templateType: string) => {
    const templates = schemaApi.getAvailableCSVTemplates();
    const template = templates.find(t => t.schemaType === templateType);
    
    if (template) {
      schemaApi.downloadCSVTemplate(template);
      toast.success(`${template.name}模板下载开始`);
    } else {
      toast.error('未找到对应的模板');
    }
  }, []);

  // ========================================
  // 计算属性和状态派生
  // ========================================

  // 计算总体处理状态
  const overallState = useMemo(() => ({
    isProcessing: batchState.isUploading || batchState.isGenerating || batchState.isExporting,
    canGenerate: batchState.hasUploadedData && !batchState.isGenerating,
    canExport: batchState.hasGeneratedData && !batchState.isExporting,
    hasErrors: batchState.processingErrors.length > 0 || !!batchState.lastError,
    progressPercentage: batchProgress.overallProgress
  }), [batchState, batchProgress]);

  // 统计信息
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
        : 0
    };
  }, [batchState.summary]);

  // 获取当前状态摘要
  const getStateSummary = useCallback(() => {
    return {
      hasSchemaTypes: schemaTypes !== null,
      typesCount: schemaTypes ? Object.keys(schemaTypes).length : 0,
      hasGeneratedData: generatedData !== null,
      isLoading: isLoadingTypes || isGenerating,
      hasError: lastError !== null,
      lastError,
    };
  }, [schemaTypes, generatedData, isLoadingTypes, isGenerating, lastError]);

  // ========================================
  // 自动加载和初始化
  // ========================================

  // 组件挂载时的初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        await schemaApi.checkSchemaApiHealth();
        await fetchBatchSummary();
      } catch (error) {
        console.error('Schema API初始化失败:', error);
      }
    };

    initialize();
  }, [fetchBatchSummary]);

  // 自动加载类型数据
  useEffect(() => {
    if (!schemaTypes && !isLoadingTypes) {
      fetchSchemaTypes();
    }
  }, [schemaTypes, isLoadingTypes, fetchSchemaTypes]);

  // ========================================
  // 返回所有功能和状态
  // ========================================

  return {
    // ========================================
    // 原有单个生成功能
    // ========================================
    isLoadingTypes,
    isGenerating,
    isLoading: isLoadingTypes || isGenerating,
    schemaTypes,
    generatedData,
    lastError,
    
    // 原有操作函数
    fetchSchemaTypes,
    generateSchema,
    copyCode,
    downloadCode,
    resetData,
    resetAll,
    validateFieldData,
    getFieldDefaultValue,
    getStateSummary,

    // ========================================
    // 新增批量处理功能
    // ========================================
    
    // 批量处理状态
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
    previewBatchData,
    resetBatchData,
    downloadCSVTemplate,
    
    // URL过滤器操作
    setUrlFilter,
    applyUrlFilter: (pattern: string) => generateBatchSchemas(pattern),
    
    // 工具函数
    validateFiles: schemaApi.validateMultipleCSVFiles,
    getAvailableTemplates: schemaApi.getAvailableCSVTemplates,
    formatErrors: schemaApi.formatBatchProcessingErrors,
    calculateProgress: schemaApi.calculateBatchProgress,
    
    // 模板相关
    getTemplateByType: (schemaType: string) => {
      const templates = schemaApi.getAvailableCSVTemplates();
      return templates.find(t => t.schemaType === schemaType);
    },
    
    // 批量处理状态检查
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
    hasAnyData: () => !!generatedData || batchState.hasGeneratedData
  };
}