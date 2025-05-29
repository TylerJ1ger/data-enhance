//frontend/src/lib/api/schema-api.ts
import axios from 'axios';
import type {
  SchemaTypesResponse,
  SchemaTemplateResponse,
  SchemaGenerateRequest,
  SchemaGenerateResponse,
  SchemaValidateRequest,
  SchemaValidateResponse,
  SchemaType,
} from '@/types';

// ========================================
// 类型声明扩展
// ========================================

// 扩展 axios 配置类型
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: Date;
    };
  }
}

// 自定义错误类型
interface EnhancedError extends Error {
  originalError?: any;
  statusCode?: number;
}

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
 * @returns 支持的结构化数据类型列表
 */
export const getSchemaTypes = async (): Promise<SchemaTypesResponse> => {
  const response = await schemaApi.get<SchemaTypesResponse>('/types');
  return response.data;
};

/**
 * 获取指定类型的结构化数据模板
 * @param schemaType 结构化数据类型
 * @returns 结构化数据模板
 */
export const getSchemaTemplate = async (schemaType: SchemaType): Promise<SchemaTemplateResponse> => {
  const response = await schemaApi.get<SchemaTemplateResponse>(`/template/${schemaType}`);
  return response.data;
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
 * 预览结构化数据（允许不完整的数据）
 * @param request 预览请求参数
 * @returns 预览的结构化数据
 */
export const previewSchema = async (request: SchemaGenerateRequest): Promise<SchemaGenerateResponse> => {
  const response = await schemaApi.post<SchemaGenerateResponse>('/preview', request);
  return response.data;
};

/**
 * 验证结构化数据
 * @param request 验证请求参数
 * @returns 验证结果
 */
export const validateSchema = async (request: SchemaValidateRequest): Promise<SchemaValidateResponse> => {
  const response = await schemaApi.post<SchemaValidateResponse>('/validate', request);
  return response.data;
};

// ========================================
// 导出和模板相关功能
// ========================================

/**
 * 获取导出结构化数据模板的URL
 * @param schemaType 结构化数据类型
 * @param format 导出格式
 * @returns 导出URL
 */
export const getExportTemplateUrl = (schemaType: SchemaType, format: string = 'json'): string => {
  return `${SCHEMA_API_BASE_URL}/export/${schemaType}?format=${format}`;
};

/**
 * 导出结构化数据模板
 * @param schemaType 结构化数据类型
 * @param format 导出格式
 * @returns 模板内容
 */
export const exportSchemaTemplate = async (schemaType: SchemaType, format: string = 'json'): Promise<string> => {
  const response = await schemaApi.get(`/export/${schemaType}`, {
    params: { format },
    responseType: 'text'
  });
  return response.data;
};

/**
 * 批量生成多个结构化数据
 * @param requests 批量生成请求列表
 * @returns 批量生成结果
 */
export const batchGenerateSchema = async (requests: SchemaGenerateRequest[]): Promise<SchemaGenerateResponse[]> => {
  const promises = requests.map(request => generateSchema(request));
  return Promise.all(promises);
};

// ========================================
// 健康检查和系统状态
// ========================================

/**
 * 检查结构化数据API健康状态
 * @returns API健康状态信息
 */
export const checkSchemaApiHealth = async (): Promise<{ 
  status: string; 
  service: string; 
  version?: string;
  schema_types_count?: number;
}> => {
  try {
    // 首先尝试获取Schema类型来验证API是否正常工作
    const typesResponse = await getSchemaTypes();
    return {
      status: 'healthy',
      service: 'Schema Generator API',
      version: 'v1',
      schema_types_count: Object.keys(typesResponse.schema_types).length
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
// 本地存储配置管理
// ========================================

/**
 * Schema配置接口
 */
interface SavedSchemaConfig {
  id: string;
  name: string;
  schema_type: SchemaType;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  description?: string;
  tags?: string[];
}

/**
 * 保存结构化数据配置到localStorage
 * @param name 配置名称
 * @param schemaType 结构化数据类型
 * @param data 配置数据
 * @param description 配置描述
 * @param tags 标签
 */
export const saveSchemaConfig = (
  name: string, 
  schemaType: SchemaType, 
  data: Record<string, any>,
  description?: string,
  tags?: string[]
): void => {
  try {
    const config: SavedSchemaConfig = {
      id: `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      schema_type: schemaType,
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: description?.trim(),
      tags: tags?.filter(tag => tag.trim()).map(tag => tag.trim()) || []
    };
    
    const savedConfigs = getSavedSchemaConfigs();
    
    // 检查是否存在同名配置
    const existingIndex = savedConfigs.findIndex(c => c.name === config.name && c.schema_type === config.schema_type);
    
    if (existingIndex >= 0) {
      // 更新现有配置
      savedConfigs[existingIndex] = {
        ...savedConfigs[existingIndex],
        ...config,
        id: savedConfigs[existingIndex].id, // 保持原ID
        created_at: savedConfigs[existingIndex].created_at // 保持创建时间
      };
    } else {
      // 添加新配置
      savedConfigs.push(config);
    }
    
    // 限制最大保存数量（比如最多100个配置）
    if (savedConfigs.length > 100) {
      savedConfigs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      savedConfigs.splice(100);
    }
    
    localStorage.setItem('schema_configs', JSON.stringify(savedConfigs));
  } catch (error) {
    console.error('保存Schema配置失败:', error);
    throw new Error('保存配置失败，请重试');
  }
};

/**
 * 获取保存的结构化数据配置
 * @returns 保存的配置列表
 */
export const getSavedSchemaConfigs = (): SavedSchemaConfig[] => {
  try {
    const saved = localStorage.getItem('schema_configs');
    if (!saved) return [];
    
    const configs = JSON.parse(saved) as SavedSchemaConfig[];
    
    // 数据迁移：为旧配置添加缺失字段
    return configs.map(config => ({
      ...config,
      description: config.description || '',
      tags: config.tags || [],
      // 确保ID存在
      id: config.id || `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
  } catch (error) {
    console.error('读取Schema配置失败:', error);
    return [];
  }
};

/**
 * 删除保存的结构化数据配置
 * @param configId 配置ID
 */
export const deleteSchemaConfig = (configId: string): void => {
  try {
    const savedConfigs = getSavedSchemaConfigs();
    const filteredConfigs = savedConfigs.filter(config => config.id !== configId);
    localStorage.setItem('schema_configs', JSON.stringify(filteredConfigs));
  } catch (error) {
    console.error('删除Schema配置失败:', error);
    throw new Error('删除配置失败，请重试');
  }
};

/**
 * 加载结构化数据配置
 * @param configId 配置ID
 * @returns 配置数据
 */
export const loadSchemaConfig = (configId: string): SavedSchemaConfig | null => {
  try {
    const savedConfigs = getSavedSchemaConfigs();
    return savedConfigs.find(config => config.id === configId) || null;
  } catch (error) {
    console.error('加载Schema配置失败:', error);
    return null;
  }
};

/**
 * 更新已保存的配置
 * @param configId 配置ID
 * @param updates 更新数据
 */
export const updateSchemaConfig = (configId: string, updates: Partial<SavedSchemaConfig>): void => {
  try {
    const savedConfigs = getSavedSchemaConfigs();
    const configIndex = savedConfigs.findIndex(config => config.id === configId);
    
    if (configIndex >= 0) {
      savedConfigs[configIndex] = {
        ...savedConfigs[configIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('schema_configs', JSON.stringify(savedConfigs));
    }
  } catch (error) {
    console.error('更新Schema配置失败:', error);
    throw new Error('更新配置失败，请重试');
  }
};

/**
 * 搜索配置
 * @param query 搜索关键词
 * @param schemaType 筛选类型
 * @returns 匹配的配置列表
 */
export const searchSchemaConfigs = (query: string = '', schemaType?: SchemaType): SavedSchemaConfig[] => {
  const configs = getSavedSchemaConfigs();
  const lowerQuery = query.toLowerCase().trim();
  
  return configs.filter(config => {
    // 类型筛选
    if (schemaType && config.schema_type !== schemaType) {
      return false;
    }
    
    // 关键词搜索
    if (lowerQuery) {
      return (
        config.name.toLowerCase().includes(lowerQuery) ||
        config.description?.toLowerCase().includes(lowerQuery) ||
        config.schema_type.toLowerCase().includes(lowerQuery) ||
        config.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }
    
    return true;
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
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
 * 压缩JSON字符串（移除空格和换行）
 * @param jsonString JSON字符串
 * @returns 压缩后的JSON字符串
 */
export const minifyJson = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch (error) {
    console.warn('JSON压缩失败:', error);
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
 * 生成示例数据
 * @param schemaType 结构化数据类型
 * @returns 示例数据
 */
export const generateSampleData = (schemaType: SchemaType): Record<string, any> => {
  const sampleData: Record<SchemaType, Record<string, any>> = {
    Article: {
      headline: "如何优化网站SEO - 完整指南",
      author: "张三",
      datePublished: new Date().toISOString().split('T')[0],
      description: "本文详细介绍了网站SEO优化的各种技巧和最佳实践。",
      publisher: "SEO专家博客"
    },
    Product: {
      name: "无线蓝牙耳机",
      description: "高音质无线蓝牙耳机，支持降噪功能，续航时间长达20小时。",
      brand: "TechBrand",
      offers: {
        price: "299",
        currency: "CNY"
      },
      aggregateRating: {
        ratingValue: "4.5",
        reviewCount: "128"
      }
    },
    Event: {
      name: "2024年前端技术大会",
      startDate: "2024-06-15T09:00:00",
      endDate: "2024-06-15T18:00:00",
      location: "北京国际会议中心",
      description: "探讨最新的前端技术趋势，包括React、Vue、TypeScript等热门技术。",
      organizer: "前端技术社区"
    },
    Organization: {
      name: "创新科技公司",
      url: "https://example.com",
      description: "专注于人工智能和机器学习技术的创新公司。",
      address: {
        streetAddress: "科技园区创新大道100号",
        city: "北京",
        postalCode: "100000",
        country: "中国"
      }
    },
    Person: {
      name: "李四",
      jobTitle: "高级前端工程师",
      worksFor: "创新科技公司",
      description: "拥有8年前端开发经验，专注于React和Vue.js开发。"
    },
    FAQPage: {
      mainEntity: [
        {
          question: "什么是结构化数据？",
          answer: "结构化数据是一种标准化的格式，用于提供有关页面内容的信息并对页面内容进行分类。"
        },
        {
          question: "为什么需要结构化数据？",
          answer: "结构化数据可以帮助搜索引擎更好地理解您的内容，从而在搜索结果中显示丰富的摘要。"
        }
      ]
    },
    HowTo: {
      name: "如何制作咖啡",
      description: "详细的咖啡制作步骤指南",
      step: [
        {
          name: "准备材料",
          text: "准备咖啡豆、磨豆机、咖啡壶和滤纸。"
        },
        {
          name: "研磨咖啡豆",
          text: "将咖啡豆研磨成中等粗细的粉末。"
        },
        {
          name: "冲泡咖啡",
          text: "用90-95度的热水冲泡咖啡粉，冲泡时间约4分钟。"
        }
      ]
    },
    VideoObject: {
      name: "前端开发教程：React入门",
      description: "这个视频教程将带你从零开始学习React前端框架。",
      thumbnailUrl: "https://example.com/thumbnail.jpg",
      uploadDate: new Date().toISOString().split('T')[0],
      duration: "PT30M",
      publisher: "编程教育频道"
    },
    WebSite: {
      name: "创新科技公司官网",
      url: "https://example.com",
      description: "专业的人工智能和机器学习解决方案提供商。",
      potentialAction: {
        type: "SearchAction",
        target: "https://example.com/search?q={search_term_string}"
      }
    },
    Breadcrumb: {
      itemListElement: [
        { name: "首页", url: "https://example.com" },
        { name: "产品", url: "https://example.com/products" },
        { name: "蓝牙耳机", url: "https://example.com/products/bluetooth-headphones" }
      ]
    }
  };

  return sampleData[schemaType] || {};
};

// ========================================
// 错误处理和拦截器
// ========================================

/**
 * 全局请求拦截器
 */
schemaApi.interceptors.request.use(
  (config) => {
    // 添加请求时间戳
    if (!config.metadata) {
      config.metadata = {};
    }
    config.metadata.startTime = new Date();
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
    const enhancedError: EnhancedError = new Error(friendlyMessage);
    enhancedError.name = 'SchemaApiError';
    enhancedError.originalError = error;
    enhancedError.statusCode = statusCode;
    
    return Promise.reject(enhancedError);
  }
);

// 导出配置好的axios实例
export default schemaApi;