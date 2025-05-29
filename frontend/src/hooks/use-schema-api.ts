//frontend/src/hooks/use-schema-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as schemaApi from '@/lib/api/schema-api';
import {
  SchemaType,
  SchemaTypesResponse,
  SchemaTemplateResponse,
  SchemaGenerateRequest,
  SchemaGenerateResponse,
  SchemaValidateRequest,
  SchemaValidateResponse,
  ValidationResult,
  SchemaFormState,
  SchemaEditorState,
  FormValidationState,
} from '@/types';

export function useSchemaApi() {
  // 状态管理 - API 加载状态
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 状态管理 - 响应数据
  const [schemaTypes, setSchemaTypes] = useState<SchemaTypesResponse | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<SchemaTemplateResponse | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<SchemaGenerateResponse | null>(null);
  const [previewSchema, setPreviewSchema] = useState<SchemaGenerateResponse | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // 表单状态管理
  const [formState, setFormState] = useState<SchemaFormState>({
    selectedType: null,
    formData: {},
    errors: {},
    isValid: false,
  });

  // 编辑器状态管理
  const [editorState, setEditorState] = useState<SchemaEditorState>({
    activeTab: 'form',
    outputFormat: 'json-ld',
    showValidation: false,
    isGenerating: false,
    lastGenerated: undefined,
  });

  // 验证状态管理
  const [formValidationState, setFormValidationState] = useState<FormValidationState>({
    isValidating: false,
    validationResult: null,
    lastValidated: null,
  });

  // 在组件挂载时检查 API 健康状态并加载支持的类型
  useEffect(() => {
    const initializeApi = async () => {
      try {
        // 检查API健康状态
        await schemaApi.checkSchemaApiHealth();
        
        // 加载支持的结构化数据类型
        await fetchSchemaTypes();
      } catch (error) {
        console.error('Schema API initialization error:', error);
        toast.error('无法连接到结构化数据API服务器。请确认后端服务是否正常运行。');
      }
    };

    initializeApi();
  }, []);

  // 获取支持的结构化数据类型
  const fetchSchemaTypes = useCallback(async () => {
    if (schemaTypes) return schemaTypes; // 避免重复请求

    setIsLoadingTypes(true);
    try {
      const data = await schemaApi.getSchemaTypes();
      setSchemaTypes(data);
      
      toast.success('成功加载结构化数据类型');
      return data;
    } catch (error) {
      console.error('获取结构化数据类型错误:', error);
      toast.error('获取结构化数据类型失败，请重试。');
      return null;
    } finally {
      setIsLoadingTypes(false);
    }
  }, [schemaTypes]);

  // 获取指定类型的模板
  const fetchSchemaTemplate = useCallback(async (schemaType: SchemaType) => {
    setIsLoadingTemplate(true);
    try {
      const data = await schemaApi.getSchemaTemplate(schemaType);
      setCurrentTemplate(data);
      
      // 重置表单数据为模板数据
      setFormState(prev => ({
        ...prev,
        selectedType: schemaType,
        formData: data.template,
        errors: {},
        isValid: false,
      }));
      
      // 清除之前的生成和预览数据
      setGeneratedSchema(null);
      setPreviewSchema(null);
      setValidationResult(null);
      
      return data;
    } catch (error) {
      console.error('获取结构化数据模板错误:', error);
      toast.error('获取结构化数据模板失败，请重试。');
      return null;
    } finally {
      setIsLoadingTemplate(false);
    }
  }, []);

  // 生成结构化数据
  const generateSchemaData = useCallback(async (request: SchemaGenerateRequest) => {
    setIsGenerating(true);
    setEditorState(prev => ({ ...prev, isGenerating: true }));
    
    try {
      const data = await schemaApi.generateSchema(request);
      setGeneratedSchema(data);
      setEditorState(prev => ({ 
        ...prev, 
        lastGenerated: data,
        activeTab: 'output'
      }));
      
      toast.success('结构化数据生成成功');
      return data;
    } catch (error) {
      console.error('生成结构化数据错误:', error);
      toast.error('生成结构化数据失败，请检查输入数据。');
      throw error;
    } finally {
      setIsGenerating(false);
      setEditorState(prev => ({ ...prev, isGenerating: false }));
    }
  }, []);

  // 预览结构化数据
  const previewSchemaData = useCallback(async (request: SchemaGenerateRequest) => {
    setIsPreviewing(true);
    
    try {
      const data = await schemaApi.previewSchema(request);
      setPreviewSchema(data);
      return data;
    } catch (error) {
      console.error('预览结构化数据错误:', error);
      // 预览失败不显示错误提示，因为可能是正常的数据不完整状态
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }, []);

  // 验证结构化数据
  const validateSchemaData = useCallback(async (request: SchemaValidateRequest) => {
    setIsValidating(true);
    setFormValidationState(prev => ({ ...prev, isValidating: true }));
    
    try {
      const data = await schemaApi.validateSchema(request);
      setValidationResult(data.validation);
      setFormValidationState(prev => ({
        ...prev,
        validationResult: data.validation,
        lastValidated: new Date().toISOString(),
      }));
      
      // 更新表单验证状态
      setFormState(prev => ({
        ...prev,
        isValid: data.validation.is_valid,
        errors: data.validation.errors.reduce((acc, error) => {
          acc.general = acc.general ? `${acc.general}; ${error}` : error;
          return acc;
        }, {} as Record<string, string>)
      }));
      
      // 显示验证结果
      if (data.validation.is_valid) {
        toast.success('数据验证通过');
      } else {
        toast.warn(`发现 ${data.validation.errors.length} 个错误`);
      }
      
      return data;
    } catch (error) {
      console.error('验证结构化数据错误:', error);
      toast.error('验证结构化数据失败，请重试。');
      return null;
    } finally {
      setIsValidating(false);
      setFormValidationState(prev => ({ ...prev, isValidating: false }));
    }
  }, []);

  // 更新表单数据 - 修复类型错误
  const updateFormData = useCallback((key: string, value: any) => {
    setFormState(prev => {
      const newErrors = { ...prev.errors };
      // 移除该字段的错误，而不是设为undefined
      delete newErrors[key];
      
      return {
        ...prev,
        formData: {
          ...prev.formData,
          [key]: value
        },
        errors: newErrors // 确保不包含undefined值
      };
    });
  }, []);

  // 更新嵌套表单数据
  const updateNestedFormData = useCallback((path: string[], value: any) => {
    setFormState(prev => {
      const newFormData = { ...prev.formData };
      let current = newFormData;
      
      // 导航到嵌套属性的父级
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      
      // 设置最终值
      current[path[path.length - 1]] = value;
      
      return {
        ...prev,
        formData: newFormData,
      };
    });
  }, []);

  // 添加数组项
  const addArrayItem = useCallback((key: string, defaultValue: any = {}) => {
    setFormState(prev => {
      const currentArray = prev.formData[key] || [];
      return {
        ...prev,
        formData: {
          ...prev.formData,
          [key]: [...currentArray, defaultValue]
        }
      };
    });
  }, []);

  // 删除数组项
  const removeArrayItem = useCallback((key: string, index: number) => {
    setFormState(prev => {
      const currentArray = prev.formData[key] || [];
      const newArray = currentArray.filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        formData: {
          ...prev.formData,
          [key]: newArray
        }
      };
    });
  }, []);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormState({
      selectedType: null,
      formData: {},
      errors: {},
      isValid: false,
    });
    setCurrentTemplate(null);
    setGeneratedSchema(null);
    setPreviewSchema(null);
    setValidationResult(null);
    setEditorState({
      activeTab: 'form',
      outputFormat: 'json-ld',
      showValidation: false,
      isGenerating: false,
      lastGenerated: undefined,
    });
    setFormValidationState({
      isValidating: false,
      validationResult: null,
      lastValidated: null,
    });
  }, []);

  // 切换编辑器标签
  const setActiveTab = useCallback((tab: 'form' | 'preview' | 'output') => {
    setEditorState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // 切换输出格式
  const setOutputFormat = useCallback((format: 'json-ld' | 'html') => {
    setEditorState(prev => ({ ...prev, outputFormat: format }));
  }, []);

  // 切换验证显示
  const toggleValidation = useCallback(() => {
    setEditorState(prev => ({ ...prev, showValidation: !prev.showValidation }));
  }, []);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (content: string, format: 'json' | 'html' = 'json') => {
    try {
      const success = await schemaApi.copyToClipboard(content, format);
      if (success) {
        toast.success('已复制到剪贴板');
      } else {
        toast.error('复制失败，请手动复制');
      }
      return success;
    } catch (error) {
      toast.error('复制失败，请手动复制');
      return false;
    }
  }, []);

  // 下载为文件
  const downloadAsFile = useCallback((content: string, filename: string, format: 'json' | 'html' = 'json') => {
    try {
      const mimeType = format === 'json' ? 'application/json' : 'text/html';
      schemaApi.downloadAsFile(content, filename, mimeType);
      toast.success('文件下载已开始');
    } catch (error) {
      toast.error('文件下载失败');
    }
  }, []);

  // 保存配置
  const saveConfig = useCallback((name: string) => {
    if (!formState.selectedType) {
      toast.error('请先选择结构化数据类型');
      return;
    }
    
    try {
      schemaApi.saveSchemaConfig(name, formState.selectedType, formState.formData);
      toast.success('配置保存成功');
    } catch (error) {
      toast.error('配置保存失败');
    }
  }, [formState.selectedType, formState.formData]);

  // 加载配置
  const loadConfig = useCallback((configId: string) => {
    try {
      const config = schemaApi.loadSchemaConfig(configId);
      if (config) {
        setFormState({
          selectedType: config.schema_type,
          formData: config.data,
          errors: {},
          isValid: false,
        });
        
        // 同时加载对应的模板
        fetchSchemaTemplate(config.schema_type);
        
        toast.success('配置加载成功');
      } else {
        toast.error('配置不存在');
      }
    } catch (error) {
      toast.error('配置加载失败');
    }
  }, [fetchSchemaTemplate]);

  // 获取保存的配置列表
  const getSavedConfigs = useCallback(() => {
    return schemaApi.getSavedSchemaConfigs();
  }, []);

  // 删除保存的配置
  const deleteConfig = useCallback((configId: string) => {
    try {
      schemaApi.deleteSchemaConfig(configId);
      toast.success('配置删除成功');
    } catch (error) {
      toast.error('配置删除失败');
    }
  }, []);

  // 自动保存预览（当表单数据变化时）
  useEffect(() => {
    if (formState.selectedType && Object.keys(formState.formData).length > 0) {
      // 延迟执行预览，避免频繁请求
      const timeoutId = setTimeout(() => {
        previewSchemaData({
          schema_type: formState.selectedType!,
          data: formState.formData,
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [formState.formData, formState.selectedType, previewSchemaData]);

  // 自动验证（可选，当需要时开启）
  const enableAutoValidation = useCallback((enabled: boolean = true) => {
    if (!enabled) return;

    if (formState.selectedType && Object.keys(formState.formData).length > 0) {
      const timeoutId = setTimeout(() => {
        validateSchemaData({
          schema_type: formState.selectedType!,
          data: formState.formData,
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [formState.formData, formState.selectedType, validateSchemaData]);

  // 获取数据摘要
  const getDataSummary = useCallback(() => {
    const filledFields = Object.keys(formState.formData).filter(key => {
      const value = formState.formData[key];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    });

    return {
      selectedType: formState.selectedType,
      totalFields: Object.keys(formState.formData).length,
      filledFields: filledFields.length,
      isValid: formState.isValid,
      hasErrors: Object.keys(formState.errors).length > 0,
      lastValidated: formValidationState.lastValidated,
      hasGenerated: generatedSchema !== null,
    };
  }, [formState, formValidationState, generatedSchema]);

  return {
    // 状态
    isLoadingTypes,
    isLoadingTemplate,
    isGenerating,
    isPreviewing,
    isValidating,
    
    // 数据
    schemaTypes,
    currentTemplate,
    generatedSchema,
    previewSchema,
    validationResult,
    formState,
    editorState,
    formValidationState,
    
    // 操作
    fetchSchemaTypes,
    fetchSchemaTemplate,
    generateSchemaData,
    previewSchemaData,
    validateSchemaData,
    updateFormData,
    updateNestedFormData,
    addArrayItem,
    removeArrayItem,
    resetForm,
    setActiveTab,
    setOutputFormat,
    toggleValidation,
    copyToClipboard,
    downloadAsFile,
    saveConfig,
    loadConfig,
    getSavedConfigs,
    deleteConfig,
    
    // 工具函数
    enableAutoValidation,
    getDataSummary,
  };
}