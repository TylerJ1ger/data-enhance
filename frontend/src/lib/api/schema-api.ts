//frontend/src/lib/api/schema-api.ts
import axios from 'axios';
import type {
  SchemaFieldConfig,
  SchemaTypeConfig,
  SchemaTypesResponse,
  SchemaGenerateRequest,
  SchemaGenerateResponse,
  SchemaApiError,
  SchemaType
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
    // 首先尝试获取Schema类型来验证API是否正常工作
    await getSchemaTypes();
    return {
      status: 'healthy',
      service: 'Schema Generator API',
      version: 'v1'
    };
  } catch (error) {
    // 如果Schema API不可用，尝试检查主API健康状态
    const healthApi = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
      timeout: 5000
    });
    const response = await healthApi.get<{ status: string; service: string; version?: string }>('/v1/health');
    return response.data;
  }
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
 * 验证JSON格式
 * @param jsonString JSON字符串
 * @returns 是否为有效JSON
 */
export const isValidJson = (jsonString: string): boolean => {
  if (!jsonString || typeof jsonString !== 'string') {
    return false;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null;
  } catch {
    return false;
  }
};

/**
 * 格式化JSON字符串
 * @param jsonString JSON字符串
 * @param indent 缩进空格数
 * @returns 格式化后的JSON字符串
 */
export const formatJson = (jsonString: string, indent: number = 2): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, indent);
  } catch (error) {
    console.warn('JSON格式化失败:', error);
    return jsonString;
  }
};

/**
 * 验证URL格式
 * @param url URL字符串
 * @returns 是否为有效URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 获取结构化数据的字节大小
 * @param content 内容字符串
 * @returns 字节大小信息
 */
export const getContentSize = (content: string): {
  bytes: number;
  size: string;
  lines: number;
} => {
  const bytes = new Blob([content]).size;
  const lines = content.split('\n').length;
  const size = bytes < 1024 
    ? `${bytes} B` 
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(2)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  
  return { bytes, size, lines };
};

/**
 * 生成示例数据
 * @param schemaType 结构化数据类型
 * @returns 示例数据
 */
export const generateSampleData = (schemaType: string): Record<string, any> => {
  const sampleData: Record<string, Record<string, any>> = {
    Article: {
      headline: "如何优化网站SEO - 完整指南",
      author: "张三",
      datePublished: new Date().toISOString().split('T')[0],
      description: "本文详细介绍了网站SEO优化的各种技巧和最佳实践。",
    },
    Product: {
      name: "无线蓝牙耳机",
      description: "高音质无线蓝牙耳机，支持降噪功能，续航时间长达20小时。",
      brand: "TechBrand",
      price: "299",
      currency: "CNY"
    },
    Organization: {
      name: "创新科技公司",
      url: "https://example.com",
      description: "专注于人工智能和机器学习技术的创新公司。",
    },
    Person: {
      name: "李四",
      jobTitle: "高级前端工程师",
      worksFor: "创新科技公司",
      description: "拥有8年前端开发经验，专注于React和Vue.js开发。"
    },
    Event: {
      name: "2024年前端技术大会",
      startDate: "2024-06-15T09:00:00",
      location: "北京国际会议中心",
      description: "探讨最新的前端技术趋势，包括React、Vue、TypeScript等热门技术。"
    },
    WebSite: {
      name: "技术博客",
      url: "https://techblog.example.com",
      description: "分享最新技术动态和开发经验的技术博客"
    },
    VideoObject: {
      name: "React入门教程",
      description: "详细的React框架入门教程，适合初学者学习",
      thumbnailUrl: "https://example.com/thumbnail.jpg"
    },
    Breadcrumb: {
      items: "首页|https://example.com\n产品|https://example.com/products\n详情页|https://example.com/products/123"
    },
    FAQPage: {
      faqs: "什么是结构化数据？\n结构化数据是一种标准化的格式，用于向搜索引擎提供有关网页内容的信息。\n\n如何实现结构化数据？\n可以使用JSON-LD、Microdata或RDFa格式来实现结构化数据。"
    },
    HowTo: {
      name: "如何制作咖啡",
      description: "简单易学的咖啡制作方法",
      steps: "准备咖啡豆和热水\n将咖啡豆研磨成粉\n用热水冲泡咖啡粉\n静置2-3分钟\n享用美味咖啡",
      totalTime: "PT10M"
    }
  };

  return sampleData[schemaType] || {};
};

/**
 * 验证字段数据
 * @param schemaType 结构化数据类型
 * @param data 表单数据
 * @param schemaConfig 类型配置
 * @returns 验证结果
 */
export const validateFieldData = (
  schemaType: string, 
  data: Record<string, any>, 
  schemaConfig: SchemaTypeConfig
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 检查必填字段
  for (const field of schemaConfig.required_fields) {
    const value = data[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${schemaConfig.fields[field]?.label || field} 是必填项`);
    }
  }

  // 检查URL格式
  Object.entries(schemaConfig.fields).forEach(([fieldKey, fieldConfig]) => {
    const value = data[fieldKey];
    if (value && fieldConfig.type === 'url' && !isValidUrl(value)) {
      errors.push(`${fieldConfig.label} 必须是有效的URL格式`);
    }
  });

  // 检查邮箱格式
  Object.entries(schemaConfig.fields).forEach(([fieldKey, fieldConfig]) => {
    const value = data[fieldKey];
    if (value && fieldConfig.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${fieldConfig.label} 必须是有效的邮箱格式`);
      }
    }
  });

  // 检查数字格式
  Object.entries(schemaConfig.fields).forEach(([fieldKey, fieldConfig]) => {
    const value = data[fieldKey];
    if (value && fieldConfig.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`${fieldConfig.label} 必须是有效的数字`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ========================================
// 错误处理和拦截器
// ========================================

/**
 * 全局请求拦截器
 */
schemaApi.interceptors.request.use(
  (config) => {
    // 添加请求时间戳用于性能监控
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
    // 计算请求耗时
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
    // 详细的错误处理
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
      case 401:
        friendlyMessage = '身份验证失败，请重新登录';
        break;
      case 403:
        friendlyMessage = '没有权限访问此功能';
        break;
      case 404:
        friendlyMessage = '请求的资源不存在';
        break;
      case 422:
        friendlyMessage = '数据验证失败，请检查必填字段';
        break;
      case 429:
        friendlyMessage = '请求过于频繁，请稍后再试';
        break;
      case 500:
        friendlyMessage = '服务器内部错误，请稍后重试';
        break;
      case 503:
        friendlyMessage = '服务暂时不可用，请稍后重试';
        break;
      default:
        if (!navigator.onLine) {
          friendlyMessage = '网络连接异常，请检查网络设置';
        }
    }
    
    // 创建增强的错误对象
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
  'Article',
  'Product', 
  'Organization',
  'Person',
  'Event',
  'Breadcrumb',
  'FAQPage',
  'HowTo',
  'VideoObject',
  'WebSite'
] as const;

// 字段类型映射
export const FIELD_TYPE_LABELS = {
  text: '文本',
  textarea: '多行文本',
  url: '网址',
  email: '邮箱',
  date: '日期',
  'datetime-local': '日期时间',
  number: '数字'
} as const;

// 结构化数据类型描述
export const SCHEMA_TYPE_DESCRIPTIONS = {
  Article: '新闻文章、博客文章或其他文本内容',
  Product: '商品或服务信息',
  Organization: '公司、组织或机构信息',
  Person: '个人或人物信息',
  Event: '会议、演出、活动等事件信息',
  Breadcrumb: '页面导航路径',
  FAQPage: '常见问题页面',
  HowTo: '分步骤的操作教程',
  VideoObject: '视频内容信息',
  WebSite: '网站基本信息'
} as const;

// ========================================
// 导出
// ========================================

// 导出配置好的axios实例
export default schemaApi;