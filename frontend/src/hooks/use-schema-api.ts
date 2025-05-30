//frontend/src/hooks/use-schema-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as schemaApi from '@/lib/api/schema-api';
import type {
  SchemaFieldConfig,
  SchemaTypeConfig,
  SchemaGenerateRequest,
  SchemaGenerateResponse,
  SchemaApiError,
  SchemaType
} from '@/types';

export function useSchemaApi() {
  // 基础状态管理
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 数据状态 - 修正类型定义
  const [schemaTypes, setSchemaTypes] = useState<Record<string, SchemaTypeConfig> | null>(null);
  const [generatedData, setGeneratedData] = useState<SchemaGenerateResponse | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

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

  // 自动加载类型数据
  useEffect(() => {
    if (!schemaTypes && !isLoadingTypes) {
      fetchSchemaTypes();
    }
  }, [schemaTypes, isLoadingTypes, fetchSchemaTypes]);

  return {
    // 状态
    isLoadingTypes,
    isGenerating,
    isLoading: isLoadingTypes || isGenerating,
    
    // 数据
    schemaTypes,
    generatedData,
    lastError,
    
    // 核心操作
    fetchSchemaTypes,
    generateSchema,
    copyCode,
    downloadCode,
    resetData,
    resetAll,
    
    // 辅助功能
    validateFieldData,
    getFieldDefaultValue,
    getStateSummary,
  };
}