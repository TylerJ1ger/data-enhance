//frontend-new/src/lib/api/backlink-api.ts
import axios, { AxiosError } from 'axios';
import {
  BacklinkUploadResponse,
  BacklinkFilterRanges,
  BacklinkFilterResponse,
  BrandDomainOverlapResponse,
  BacklinkFilterRangeValues,
  DomainFilterResponse,
} from '@/types';

interface ApiErrorResponse {
  detail: string;
  [key: string]: any; // 允许有其他属性
}

// 交叉分析导出参数接口
export interface CrossAnalysisExportParams {
  displayMode: 'flat' | 'compare';
  searchTerm: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  comparisonData?: any;
  cellDisplayType?: string;
}

// API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 错误处理器
const handleApiError = (error: AxiosError | Error): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>; // 使用泛型指定响应数据类型
    const errorMsg = axiosError.response?.data?.detail || axiosError.message || '未知错误';
    console.error(`API错误: ${errorMsg}`, axiosError);
    throw new Error(`请求失败: ${errorMsg}`);
  }
  
  console.error('API调用出错:', error);
  throw error;
};

/**
 * 上传外链文件
 * @param files 要上传的文件数组
 * @returns 上传响应数据
 */
export const uploadBacklinkFiles = async (files: File[]): Promise<BacklinkUploadResponse> => {
  try {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await api.post<BacklinkUploadResponse>('/backlink/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 应用外链筛选条件
 * @param filterRanges 筛选范围参数
 * @returns 筛选结果
 */
export const applyBacklinkFilters = async (filterRanges: BacklinkFilterRanges): Promise<BacklinkFilterResponse> => {
  try {
    const response = await api.post<BacklinkFilterResponse>('/backlink/filter', filterRanges);
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 获取品牌域名重叠数据
 * @returns 品牌域名重叠响应数据
 */
export const getBacklinkBrandOverlap = async (): Promise<BrandDomainOverlapResponse> => {
  try {
    const response = await api.get<BrandDomainOverlapResponse>('/backlink/brand-overlap');
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 获取筛选范围值
 * @returns 筛选范围值
 */
export const getBacklinkFilterRanges = async (): Promise<BacklinkFilterRangeValues> => {
  try {
    const response = await api.get<BacklinkFilterRangeValues>('/backlink/filter-ranges');
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 获取导出数据的URL
 * @returns 导出数据的URL
 */
export const exportBacklinkData = (): string => {
  return `${API_BASE_URL}/backlink/export`;
};

/**
 * 获取导出唯一域名数据的URL
 * @returns 导出唯一域名数据的URL
 */
export const exportUniqueBacklinkData = (): string => {
  return `${API_BASE_URL}/backlink/export-unique`;
};

/**
 * 通过域名筛选
 * @param domain 要筛选的域名
 * @returns 域名筛选结果
 */
export const filterByDomain = async (domain: string): Promise<DomainFilterResponse> => {
  try {
    const response = await api.post<DomainFilterResponse>('/backlink/domain-filter', { domain });
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 检查API健康状况
 * @returns API健康状况响应
 */
export const checkBacklinkHealth = async (): Promise<{ status: string; service: string }> => {
  try {
    const response = await api.get<{ status: string; service: string }>('/health');
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 上传交叉分析第一轮文件
 * @param files 要上传的文件数组
 * @returns 上传响应数据
 */
export const uploadCrossAnalysisFirstRound = async (files: File[]) => {
  try {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await api.post<any>('/backlink/cross-analysis/upload-first', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 上传交叉分析第二轮文件
 * @param files 要上传的文件数组
 * @returns 交叉分析结果
 */
export const uploadCrossAnalysisSecondRound = async (files: File[]) => {
  try {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await api.post<any>('/backlink/cross-analysis/upload-second', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    return handleApiError(error as Error);
  }
};

/**
 * 获取交叉分析结果的导出URL - 增强版,支持筛选参数
 * @param params 导出参数,包括显示模式、搜索词、排序等
 * @returns 导出数据的URL或blob URL
 */
export const exportCrossAnalysisResults = async (params?: CrossAnalysisExportParams): Promise<string> => {
  // 如果没有提供参数,使用原始导出URL
  if (!params) {
    return `${API_BASE_URL}/backlink/cross-analysis/export`;
  }
  
  try {
    // 发送POST请求获取带有筛选条件的导出数据
    const response = await api.post('/backlink/cross-analysis/export', params, {
      responseType: 'blob', // 指定响应类型为blob
    });
    
    // 创建Blob URL以便直接下载
    const blob = new Blob([response.data], { type: 'text/csv' });
    const blobUrl = window.URL.createObjectURL(blob);
    
    // 构造文件名
    let filename = 'cross_analysis_results.csv';
    if (params.displayMode === 'compare') {
      filename = 'cross_analysis_comparison.csv';
    }
    
    // 创建一个临时链接元素并触发下载
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理Blob URL
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
    
    return blobUrl;
  } catch (error) {
    console.error('导出交叉分析结果失败:', error);
    
    // 出错时回退到基本导出URL
    return `${API_BASE_URL}/backlink/cross-analysis/export`;
  }
};

/**
 * 批量处理API请求
 * @param requests 要批量处理的请求数组
 * @returns 批量处理结果
 */
export const batchProcessRequests = async <T>(requests: Promise<T>[]): Promise<T[]> => {
  try {
    return await Promise.all(requests);
  } catch (error) {
    return handleApiError(error as Error);
  }
};

export default {
  uploadBacklinkFiles,
  applyBacklinkFilters,
  getBacklinkBrandOverlap,
  getBacklinkFilterRanges,
  exportBacklinkData,
  exportUniqueBacklinkData,
  filterByDomain,
  checkBacklinkHealth,
  batchProcessRequests,
  uploadCrossAnalysisFirstRound,
  uploadCrossAnalysisSecondRound,
  exportCrossAnalysisResults,
};