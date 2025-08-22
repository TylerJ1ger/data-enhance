//frontend/src/lib/api/keywords-api.ts
import axios from 'axios';
import type {
  UploadResponse,
  FilterRanges,
  FilterResponse,
  BrandOverlapResponse,
  FilterRangeValues,
  KeywordFilterResponse,
} from '@/types';

// API base URL - 使用环境变量或默认值，指向新的v1 keywords API
const KEYWORDS_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/v1/keywords`
  : 'http://localhost:8000/api/v1/keywords';

// 创建axios实例，专门用于关键词API
const keywordsApi = axios.create({
  baseURL: KEYWORDS_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 上传关键词文件到后端处理
 * @param files 要上传的文件列表
 * @returns 处理后的上传响应
 */
export const uploadKeywordFiles = async (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await keywordsApi.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * 应用关键词筛选条件
 * @param filterRanges 筛选范围参数
 * @returns 筛选后的数据结果
 */
export const applyKeywordFilters = async (filterRanges: FilterRanges): Promise<FilterResponse> => {
  const response = await keywordsApi.post<FilterResponse>('/filter', filterRanges);
  return response.data;
};

/**
 * 获取关键词品牌重叠数据
 * @returns 品牌重叠分析结果
 */
export const getKeywordBrandOverlap = async (): Promise<BrandOverlapResponse> => {
  const response = await keywordsApi.get<BrandOverlapResponse>('/brand-overlap');
  return response.data;
};

/**
 * 获取关键词筛选范围值
 * @returns 可筛选的范围值
 */
export const getKeywordFilterRanges = async (): Promise<FilterRangeValues> => {
  const response = await keywordsApi.get<FilterRangeValues>('/filter-ranges');
  return response.data;
};

/**
 * 获取导出关键词数据的URL
 * @returns 导出数据的完整URL
 */
export const exportKeywordData = (): string => {
  return `${KEYWORDS_API_BASE_URL}/export`;
};

/**
 * 获取导出唯一关键词数据的URL
 * @returns 导出唯一数据的完整URL
 */
export const exportUniqueKeywordData = (): string => {
  return `${KEYWORDS_API_BASE_URL}/export-unique`;
};

/**
 * 按关键词搜索数据 - 注意：新API使用 /search 端点
 * @param keyword 要搜索的关键词
 * @returns 关键词搜索结果
 */
export const searchByKeyword = async (keyword: string): Promise<KeywordFilterResponse> => {
  const response = await keywordsApi.post<KeywordFilterResponse>('/search', { keyword });
  return response.data;
};

export const getKeywordList = async (page: number = 1, limit: number = 20): Promise<{
  keywords: KeywordFilterResponse['results'];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}> => {
  const response = await keywordsApi.get(`/list?page=${page}&limit=${limit}`);
  return response.data;
};

/**
 * 检查关键词API健康状态
 * @returns API健康状态信息
 */
export const checkKeywordApiHealth = async (): Promise<{ status: string; module: string; version: string }> => {
  // 使用通用的health端点
  const response = await keywordsApi.get<{ status: string; module: string; version: string }>('/health');
  return response.data;
};

/**
 * 全局请求错误处理器
 */
keywordsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // 可以在这里添加全局错误处理逻辑
    console.error('关键词API请求错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default keywordsApi;