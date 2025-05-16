//frontend-new/src/lib/api/api.ts
import axios from 'axios';
import type {
  UploadResponse,
  FilterRanges,
  FilterResponse,
  BrandOverlapResponse,
  FilterRangeValues,
  KeywordFilterResponse,
} from '@/types';

// API base URL - 使用环境变量或默认值
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// 创建axios实例，带有基础配置
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 上传文件到后端处理
 * @param files 要上传的文件列表
 * @returns 处理后的上传响应
 */
export const uploadFiles = async (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * 应用筛选条件
 * @param filterRanges 筛选范围参数
 * @returns 筛选后的数据结果
 */
export const applyFilters = async (filterRanges: FilterRanges): Promise<FilterResponse> => {
  const response = await api.post<FilterResponse>('/filter', filterRanges);
  return response.data;
};

/**
 * 获取品牌重叠数据
 * @returns 品牌重叠分析结果
 */
export const getBrandOverlap = async (): Promise<BrandOverlapResponse> => {
  const response = await api.get<BrandOverlapResponse>('/brand-overlap');
  return response.data;
};

/**
 * 获取筛选范围值
 * @returns 可筛选的范围值
 */
export const getFilterRanges = async (): Promise<FilterRangeValues> => {
  const response = await api.get<FilterRangeValues>('/filter-ranges');
  return response.data;
};

/**
 * 获取导出数据的URL
 * @returns 导出数据的完整URL
 */
export const exportData = (): string => {
  return `${API_BASE_URL}/export`;
};

/**
 * 获取导出唯一数据的URL
 * @returns 导出唯一数据的完整URL
 */
export const exportUniqueData = (): string => {
  return `${API_BASE_URL}/export-unique`;
};

/**
 * 按关键词筛选数据
 * @param keyword 要筛选的关键词
 * @returns 关键词筛选结果
 */
export const filterByKeyword = async (keyword: string): Promise<KeywordFilterResponse> => {
  const response = await api.post<KeywordFilterResponse>('/keyword-filter', { keyword });
  return response.data;
};

/**
 * 检查API健康状态
 * @returns API健康状态信息
 */
export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get<{ status: string; service: string }>('/health');
  return response.data;
};

/**
 * 全局请求错误处理器
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 可以在这里添加全局错误处理逻辑
    console.error('API请求错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;