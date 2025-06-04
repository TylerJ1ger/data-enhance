//frontend/src/lib/api/schema-api.ts - 精简更新版
import axios from 'axios';
import type {
  SchemaFieldConfig,
  SchemaTypeConfig,
  SchemaTypesResponse,
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
  CSVTemplateInfo,
  CSVFormatType
} from '@/types';

// ========================================
// Axios 模块扩展 - 添加 metadata 支持
// ========================================
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

// ========================================
// API 配置
// ========================================

// API base URL - 使用环境变量或默认值，指向新的v1 schema API
const SCHEMA_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/v1/schema`
  : 'http://localhost:8000/api/v1/schema';

// 创建axios实例，专门用于结构化数据API
const schemaApi = axios.create({
  baseURL: SCHEMA_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒超时
});

// ========================================
// 核心API调用函数
// ========================================

/**
 * 获取支持的结构化数据类型
 * @returns 支持的结构化数据类型列表及其配置
 */
export const getSchemaTypes = async (): Promise<Record<string, SchemaTypeConfig>> => {
  const response = await schemaApi.get<SchemaTypesResponse>('/types');
  return response.data.schema_types;
};

/**
 * 生成结构化数据
 * @param request 生成请求参数
 * @returns 生成的结构化数据
 */
export const generateSchema = async (request: SchemaGenerateRequest): Promise<SchemaGenerateResponse> => {
  const response = await schemaApi.post<SchemaGenerateResponse>('/generate', request);
  return response.data;
};

/**
 * 检查结构化数据API健康状态
 * @returns API健康状态信息
 */
export const checkSchemaApiHealth = async (): Promise<{ 
  status: string; 
  service: string; 
  version?: string;
}> => {
  try {
    await getSchemaTypes();
    return {
      status: 'healthy',
      service: 'Schema Generator API',
      version: 'v1'
    };
  } catch (error) {
    const healthApi = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
      timeout: 5000
    });
    const response = await healthApi.get<{ status: string; service: string; version?: string }>('/v1/health');
    return response.data;
  }
};

// ========================================
// 动态CSV模板相关API函数
// ========================================

/**
 * 获取指定类型的动态CSV模板
 * @param schemaType 结构化数据类型
 * @returns 动态CSV模板信息
 */
export const getDynamicCSVTemplate = async (schemaType: string): Promise<any> => {
  const response = await schemaApi.get(`/batch/template/${schemaType}`);
  return response.data;
};

/**
 * 获取所有支持的动态CSV模板列表
 * @returns 支持的模板列表
 */
export const getAllDynamicCSVTemplates = async (): Promise<any[]> => {
  const response = await schemaApi.get('/batch/templates');
  return response.data.templates || [];
};

/**
 * 下载动态CSV模板文件
 * @param schemaType 结构化数据类型
 * @param filename 自定义文件名（可选）
 */
export const downloadDynamicCSVTemplate = async (schemaType: string, filename?: string): Promise<void> => {
  try {
    const response = await schemaApi.get(`/batch/template/${schemaType}/download`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || `${schemaType.toLowerCase()}_dynamic_template.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  } catch (error) {
    console.error('下载动态CSV模板失败:', error);
    throw new Error('下载模板失败，请重试');
  }
};

// ========================================
// 批量处理相关API函数
// ========================================

/**
 * 批量上传结构化数据CSV文件（支持动态字段格式）
 * @param files 要上传的CSV文件列表
 * @returns 批量上传响应
 */
export const uploadSchemaBatchFiles = async (files: File[]): Promise<SchemaBatchUploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await schemaApi.post<SchemaBatchUploadResponse>('/batch/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000, // 2分钟超时，处理大文件
  });
  
  return response.data;
};

/**
 * 批量生成结构化数据
 * @param request 批量生成请求参数
 * @returns 批量生成响应
 */
export const generateBatchSchemas = async (request: SchemaBatchGenerateRequest): Promise<SchemaBatchGenerateResponse> => {
  const response = await schemaApi.post<SchemaBatchGenerateResponse>('/batch/generate', request, {
    timeout: 300000, // 5分钟超时，支持大批量处理
  });
  return response.data;
};

/**
 * 导出批量生成的结构化数据
 * @param request 导出请求参数
 * @returns 导出响应或文件流
 */
export const exportBatchSchemas = async (request: SchemaBatchExportRequest): Promise<SchemaBatchExportResponse | Blob> => {
  const response = await schemaApi.post('/batch/export', request, {
    responseType: request.export_type === 'combined' ? 'blob' : 'json',
    timeout: 180000, // 3分钟超时
  });
  
  if (request.export_type === 'combined') {
    return response.data as Blob;
  } else {
    return response.data as SchemaBatchExportResponse;
  }
};

/**
 * 获取批量处理摘要信息
 * @returns 批量处理摘要
 */
export const getSchemaBatchSummary = async (): Promise<SchemaBatchSummary> => {
  const response = await schemaApi.get<SchemaBatchSummary>('/batch/summary');
  return response.data;
};

/**
 * 重置批量处理数据
 * @returns 重置响应
 */
export const resetSchemaBatchData = async (): Promise<{ success: boolean; message: string }> => {
  const response = await schemaApi.post<{ success: boolean; message: string }>('/batch/reset');
  return response.data;
};

/**
 * 预览批量上传的数据
 * @param limit 预览条数限制
 * @returns 预览数据响应
 */
export const previewSchemaBatchData = async (limit: number = 10): Promise<SchemaBatchPreviewResponse> => {
  const response = await schemaApi.get<SchemaBatchPreviewResponse>(`/batch/preview?limit=${limit}`);
  return response.data;
};

// ========================================
// 工具函数
// ========================================

/**
 * 复制结构化数据到剪贴板
 * @param content 要复制的内容
 * @param format 内容格式
 * @returns 是否复制成功
 */
export const copyToClipboard = async (content: string, format: 'json' | 'html' = 'json'): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
};

/**
 * 下载结构化数据为文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME类型
 */
export const downloadAsFile = (content: string, filename: string, mimeType: string = 'application/json'): void => {
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
  } catch (error) {
    console.error('下载文件失败:', error);
    throw new Error('下载文件失败，请重试');
  }
};

/**
 * 批量下载所有模板
 * @param formatType 格式类型
 * @param schemaTypes 要下载的模板类型（可选，默认所有）
 */
export const batchDownloadAllTemplates = async (
  formatType: CSVFormatType = 'dynamic_fields',
  schemaTypes?: string[]
): Promise<void> => {
  try {
    const typesToDownload = schemaTypes || [
      'Article', 'Product', 'Organization', 'Person', 'Event',
      'VideoObject', 'WebSite', 'Breadcrumb', 'FAQPage', 'HowTo'
    ];
    
    for (let i = 0; i < typesToDownload.length; i++) {
      const schemaType = typesToDownload[i];
      
      // 间隔下载，避免浏览器限制
      setTimeout(() => {
        if (formatType === 'dynamic_fields') {
          downloadDynamicCSVTemplate(schemaType);
        } else {
          // 对于传统格式，生成简单的data_json模板
          downloadTraditionalTemplate(schemaType);
        }
      }, i * 200); // 间隔200ms
    }
  } catch (error) {
    console.error('批量下载模板失败:', error);
    throw new Error('批量下载失败，请重试');
  }
};

/**
 * 下载传统格式模板
 * @param schemaType 结构化数据类型
 */
const downloadTraditionalTemplate = (schemaType: string): void => {
  const headers = 'url,schema_type,data_json';
  const sampleData = `https://example.com/${schemaType.toLowerCase()}-1,${schemaType},"{\\"name\\": \\"示例${schemaType}\\", \\"description\\": \\"这是一个${schemaType}的示例\\"}"`;
  const csvContent = `${headers}\n${sampleData}`;
  
  downloadAsFile(csvContent, `${schemaType.toLowerCase()}_traditional_template.csv`, 'text/csv');
};

/**
 * 批量导出下载处理
 * @param exportData 导出数据
 * @param exportType 导出类型
 * @param baseFilename 基础文件名
 */
export const handleBatchExportDownload = async (
  exportData: SchemaBatchExportResponse | Blob,
  exportType: 'combined' | 'separated',
  baseFilename: string = 'structured_data'
): Promise<void> => {
  try {
    if (exportType === 'combined' && exportData instanceof Blob) {
      // 下载合并的JSON文件
      const link = document.createElement('a');
      link.href = URL.createObjectURL(exportData);
      link.download = `${baseFilename}_${new Date().toISOString().slice(0, 10)}.json`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      
    } else if (exportType === 'separated' && !(exportData instanceof Blob)) {
      // 分离导出 - 返回文件列表信息，由用户选择下载
      console.log('分离导出文件列表:', exportData);
      return Promise.resolve();
    }
  } catch (error) {
    console.error('导出下载失败:', error);
    throw new Error('导出下载失败，请重试');
  }
};

// ========================================
// 清理后的简化模板信息
// ========================================

/**
 * 获取基础CSV模板信息（用于向后兼容）
 * 注意：推荐使用后端API获取模板，这里仅作为fallback
 */
export const getBasicCSVTemplateInfo = (): CSVTemplateInfo[] => {
  return [
    {
      name: "Article - 动态字段格式",
      description: "文章类型的动态字段模板",
      schemaType: "Article",
      headers: ["url", "schema_type", "headline", "author", "datePublished", "description"],
      sampleData: [{
        url: "https://example.com/article-1",
        schema_type: "Article",
        headline: "示例文章标题",
        author: "作者姓名",
        datePublished: "2024-01-15",
        description: "文章描述"
      }],
      formatType: "dynamic_fields"
    },
    {
      name: "Article - 传统JSON格式", 
      description: "文章类型的传统data_json模板",
      schemaType: "Article",
      headers: ["url", "schema_type", "data_json"],
      sampleData: [{
        url: "https://example.com/article-1",
        schema_type: "Article",
        data_json: '{"headline": "示例文章标题", "author": "作者姓名", "datePublished": "2024-01-15"}'
      }],
      formatType: "data_json"
    }
  ];
};

// ========================================
// 错误处理和拦截器
// ========================================

/**
 * 全局请求拦截器
 */
schemaApi.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    console.error('Schema API请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 全局响应拦截器
 */
schemaApi.interceptors.response.use(
  (response) => {
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime;
    
    if (startTime) {
      const duration = endTime.getTime() - startTime.getTime();
      if (duration > 5000) {
        console.warn(`Schema API请求耗时较长: ${duration}ms`, response.config.url);
      }
    }
    
    return response;
  },
  (error) => {
    const errorMessage = error.response?.data?.detail || error.message || '未知错误';
    const statusCode = error.response?.status;
    
    console.error('结构化数据API请求错误:', {
      url: error.config?.url,
      method: error.config?.method,
      status: statusCode,
      message: errorMessage,
      data: error.response?.data
    });
    
    // 根据状态码提供更友好的错误信息
    let friendlyMessage = errorMessage;
    
    switch (statusCode) {
      case 400:
        friendlyMessage = '请求参数错误，请检查输入数据格式';
        break;
      case 422:
        friendlyMessage = '数据验证失败，请检查必填字段';
        break;
      case 500:
        friendlyMessage = '服务器内部错误，请稍后重试';
        break;
      default:
        if (!navigator.onLine) {
          friendlyMessage = '网络连接异常，请检查网络设置';
        }
    }
    
    const enhancedError = new Error(friendlyMessage);
    enhancedError.name = 'SchemaApiError';
    (enhancedError as any).originalError = error;
    (enhancedError as any).statusCode = statusCode;
    
    return Promise.reject(enhancedError);
  }
);

// ========================================
// 常量定义
// ========================================

// 支持的结构化数据类型列表
export const SUPPORTED_SCHEMA_TYPES = [
  'Article', 'Product', 'Organization', 'Person', 'Event',
  'VideoObject', 'WebSite', 'Breadcrumb', 'FAQPage', 'HowTo'
] as const;

// 批量处理相关常量
export const BATCH_PROCESSING_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  SUPPORTED_FILE_TYPES: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  TIMEOUT: {
    UPLOAD: 120000, // 2分钟
    GENERATE: 300000, // 5分钟
    EXPORT: 180000, // 3分钟
  }
} as const;

// ========================================
// 默认导出axios实例
// ========================================

export default schemaApi;