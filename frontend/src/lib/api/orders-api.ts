//frontend/src/lib/api/orders-api.ts
import axios from 'axios';
import type {
  VirtualDataGenerateRequest,
  VirtualDataGenerateResponse,
  OrderFilterRequest,
  OrderFilterResponse,
  OrderChartsResponse,
  OrderFilterRanges,
  OrderSummary,
} from '@/types/index';

// API base URL - 使用环境变量或默认值，指向新的v1 orders API
const ORDERS_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/v1/orders`
  : 'http://localhost:8000/api/v1/orders';

// 创建axios实例，专门用于订单API
const ordersApi = axios.create({
  baseURL: ORDERS_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒超时
});

/**
 * 生成虚拟订单数据
 * @param count 要生成的订单数量
 * @returns 生成结果响应
 */
export const generateVirtualOrders = async (count: number): Promise<VirtualDataGenerateResponse> => {
  const request: VirtualDataGenerateRequest = { count };
  const response = await ordersApi.post<VirtualDataGenerateResponse>('/generate', request);
  return response.data;
};

/**
 * 应用订单筛选条件
 * @param filterRequest 筛选条件参数
 * @returns 筛选后的数据结果
 */
export const applyOrderFilters = async (filterRequest: OrderFilterRequest): Promise<OrderFilterResponse> => {
  const response = await ordersApi.post<OrderFilterResponse>('/filter', filterRequest);
  return response.data;
};

/**
 * 获取订单图表数据
 * @returns 图表数据
 */
export const getOrderCharts = async (): Promise<OrderChartsResponse> => {
  const response = await ordersApi.get<OrderChartsResponse>('/charts');
  return response.data;
};

/**
 * 获取订单筛选范围值
 * @returns 可筛选的范围值
 */
export const getOrderFilterRanges = async (): Promise<OrderFilterRanges> => {
  const response = await ordersApi.get<OrderFilterRanges>('/filter-ranges');
  return response.data;
};

/**
 * 获取订单数据摘要
 * @returns 数据摘要
 */
export const getOrderSummary = async (): Promise<OrderSummary> => {
  const response = await ordersApi.get<OrderSummary>('/summary');
  return response.data;
};

/**
 * 获取导出订单数据的URL
 * @returns 导出数据的完整URL
 */
export const exportOrderData = (): string => {
  return `${ORDERS_API_BASE_URL}/export`;
};

/**
 * 重置所有订单数据
 * @returns 重置结果
 */
export const resetOrderData = async (): Promise<{ success: boolean; message: string }> => {
  const response = await ordersApi.post<{ success: boolean; message: string }>('/reset');
  return response.data;
};

/**
 * 检查订单API健康状态
 * @returns API健康状态信息
 */
export const checkOrderApiHealth = async (): Promise<{ status: string; module: string; version: string }> => {
  const response = await ordersApi.get<{ status: string; module: string; version: string }>('/health');
  return response.data;
};

/**
 * 全局请求拦截器 - 添加请求日志
 */
ordersApi.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Orders API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    return config;
  },
  (error) => {
    console.error('[Orders API] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * 全局响应拦截器 - 统一错误处理
 */
ordersApi.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Orders API] Response:`, response.data);
    }
    return response;
  },
  (error) => {
    // 统一错误处理
    console.error('[Orders API] Response error:', error.response?.data || error.message);
    
    // 根据HTTP状态码提供更友好的错误信息
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          error.message = data?.detail || '请求参数错误，请检查输入数据';
          break;
        case 413:
          error.message = '数据量过大，请减少生成数量';
          break;
        case 422:
          error.message = data?.detail || '数据验证失败，请检查输入格式';
          break;
        case 500:
          error.message = data?.detail || '服务器内部错误，请稍后重试';
          break;
        case 503:
          error.message = '服务暂时不可用，请稍后重试';
          break;
        default:
          error.message = data?.detail || `请求失败 (状态码: ${status})`;
      }
    } else if (error.request) {
      // 网络错误
      error.message = '网络连接失败，请检查网络设置或后端服务是否启动';
    } else {
      // 其他错误
      error.message = error.message || '未知错误';
    }
    
    return Promise.reject(error);
  }
);

/**
 * 批量操作工具函数
 */
export const batchOperations = {
  /**
   * 批量生成数据并应用筛选
   * @param count 生成数量
   * @param filters 筛选条件
   */
  generateAndFilter: async (count: number, filters?: OrderFilterRequest) => {
    try {
      // 先生成数据
      const generateResult = await generateVirtualOrders(count);
      
      if (!generateResult.success) {
        throw new Error(generateResult.message);
      }
      
      // 如果有筛选条件，则应用筛选
      if (filters) {
        const filterResult = await applyOrderFilters(filters);
        return { generateResult, filterResult };
      }
      
      return { generateResult };
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  },

  /**
   * 获取完整的分析数据
   * 包含图表数据、筛选范围、数据摘要
   */
  getFullAnalysisData: async () => {
    try {
      const [charts, ranges, summary] = await Promise.all([
        getOrderCharts(),
        getOrderFilterRanges(),
        getOrderSummary()
      ]);
      
      return { charts, ranges, summary };
    } catch (error) {
      console.error('获取完整分析数据失败:', error);
      throw error;
    }
  },

  /**
   * 重置并重新生成数据
   * @param count 新的数据量
   */
  resetAndGenerate: async (count: number) => {
    try {
      await resetOrderData();
      return await generateVirtualOrders(count);
    } catch (error) {
      console.error('重置并生成数据失败:', error);
      throw error;
    }
  }
};

/**
 * 数据验证工具
 */
export const validation = {
  /**
   * 验证生成数量
   * @param count 数量
   * @returns 验证结果
   */
  validateGenerateCount: (count: number): { valid: boolean; message?: string } => {
    if (!Number.isInteger(count) || count <= 0) {
      return { valid: false, message: '数据条数必须是正整数' };
    }
    
    if (count > 10000) {
      return { valid: false, message: '数据条数不能超过10000' };
    }
    
    return { valid: true };
  },

  /**
   * 验证日期范围
   * @param dateRange 日期范围
   * @returns 验证结果
   */
  validateDateRange: (dateRange: [string, string] | null): { valid: boolean; message?: string } => {
    if (!dateRange) {
      return { valid: true };
    }
    
    const [start, end] = dateRange;
    
    if (!start || !end) {
      return { valid: false, message: '请选择完整的日期范围' };
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { valid: false, message: '日期格式无效' };
    }
    
    if (startDate > endDate) {
      return { valid: false, message: '开始日期不能晚于结束日期' };
    }
    
    return { valid: true };
  },

  /**
   * 验证销售金额范围
   * @param range 金额范围
   * @returns 验证结果
   */
  validateAmountRange: (range: [number, number] | null): { valid: boolean; message?: string } => {
    if (!range) {
      return { valid: true };
    }
    
    const [min, max] = range;
    
    if (min < 0 || max < 0) {
      return { valid: false, message: '金额不能为负数' };
    }
    
    if (min > max) {
      return { valid: false, message: '最小金额不能大于最大金额' };
    }
    
    return { valid: true };
  }
};

/**
 * 缓存管理
 */
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export const cacheUtils = {
  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存数据或null
   */
  get: <T>(key: string): T | null => {
    const cached = cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  },

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 数据
   * @param ttl 过期时间（毫秒）
   */
  set: (key: string, data: any, ttl: number = CACHE_TTL) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  },

  /**
   * 清除指定缓存
   * @param key 缓存键
   */
  delete: (key: string) => {
    cache.delete(key);
  },

  /**
   * 清除所有缓存
   */
  clear: () => {
    cache.clear();
  }
};

/**
 * 带缓存的API调用
 */
export const cachedApi = {
  /**
   * 获取带缓存的图表数据
   */
  getOrderCharts: async (): Promise<OrderChartsResponse> => {
    const cacheKey = 'order_charts';
    const cached = cacheUtils.get<OrderChartsResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const data = await getOrderCharts();
    cacheUtils.set(cacheKey, data);
    return data;
  },

  /**
   * 获取带缓存的筛选范围
   */
  getOrderFilterRanges: async (): Promise<OrderFilterRanges> => {
    const cacheKey = 'order_filter_ranges';
    const cached = cacheUtils.get<OrderFilterRanges>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const data = await getOrderFilterRanges();
    cacheUtils.set(cacheKey, data);
    return data;
  }
};

export default ordersApi;