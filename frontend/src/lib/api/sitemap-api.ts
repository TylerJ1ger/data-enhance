//frontend-new/src/lib/api/sitemap-api.ts
import axios from 'axios';
import {
  SitemapUploadResponse,
  SitemapFilterRequest,
  SitemapFilterResponse,
  SitemapVisualizationData,
  SitemapAnalysisResponse,
} from '@/types/sitemap';

// API base URL - 使用环境变量
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// 创建axios实例，统一配置
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 上传Sitemap文件
 * @param files 要上传的文件数组
 * @returns 上传响应数据
 */
export async function uploadSitemapFiles(files: File[]): Promise<SitemapUploadResponse> {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  try {
    const response = await api.post<SitemapUploadResponse>('/sitemap/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading sitemap files:', error);
    throw new Error('上传Sitemap文件失败');
  }
}

/**
 * 获取Sitemap可视化数据
 * @param visualizationType 可视化类型
 * @returns 可视化数据
 */
export async function getSitemapVisualization(visualizationType: string = 'tree'): Promise<SitemapVisualizationData> {
  try {
    const response = await api.get<SitemapVisualizationData>(`/sitemap/visualization?visualization_type=${visualizationType}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sitemap visualization:', error);
    throw new Error('获取Sitemap可视化数据失败');
  }
}

/**
 * 获取经过筛选的URL的可视化数据
 * @param visualizationType 可视化类型
 * @param urls 筛选后的URL列表
 * @returns 可视化数据
 */
export async function getFilteredVisualization(
  visualizationType: string = 'tree', 
  urls: string[] = []
): Promise<SitemapVisualizationData> {
  try {
    const response = await api.post<SitemapVisualizationData>(`/sitemap/filtered-visualization`, {
      visualization_type: visualizationType,
      urls: urls
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching filtered visualization:', error);
    throw new Error('获取筛选后的可视化数据失败');
  }
}

/**
 * 筛选Sitemap URL
 * @param filters 筛选条件
 * @returns 筛选结果
 */
export async function filterSitemap(filters: SitemapFilterRequest): Promise<SitemapFilterResponse> {
  try {
    // 确保paths是一个有效的数组并且过滤掉空值
    const processedFilters = {
      ...filters,
      paths: filters.paths?.filter(path => path && path.trim() !== '') || []
    };
    
    // 如果有单个path但不在paths中，添加到paths
    if (filters.path && filters.path.trim() !== '' && 
        !processedFilters.paths.includes(filters.path)) {
      processedFilters.paths.push(filters.path);
    }
    
    const response = await api.post<SitemapFilterResponse>('/sitemap/filter', processedFilters);
    return response.data;
  } catch (error) {
    console.error('Error filtering sitemap:', error);
    throw new Error('筛选Sitemap URL失败');
  }
}

/**
 * 分析Sitemap结构
 * @param detailed 是否包含详细信息
 * @returns 分析结果
 */
export async function analyzeSitemap(detailed: boolean = false): Promise<SitemapAnalysisResponse> {
  try {
    const response = await api.get<SitemapAnalysisResponse>(`/sitemap/analyze?detailed=${detailed}`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing sitemap:', error);
    throw new Error('分析Sitemap结构失败');
  }
}

/**
 * 导出合并后的Sitemap
 * @param format 导出格式
 * @returns 导出URL
 */
export function exportMergedSitemap(format: string = 'xml'): string {
  return `${API_BASE_URL}/sitemap/export?format=${format}`;
}

/**
 * 导出筛选后的URLs
 * @param format 导出格式
 * @returns 导出URL
 */
export function exportFilteredUrls(format: string = 'csv'): string {
  return `${API_BASE_URL}/sitemap/export-filtered?format=${format}`;
}

/**
 * 获取常用路径
 * @param minCount 最小出现次数
 * @returns 常用路径列表
 */
export async function getCommonPaths(minCount: number = 5): Promise<string[]> {
  try {
    const response = await api.get<{common_paths: string[]}>(`/sitemap/common-paths?min_count=${minCount}`);
    return response.data.common_paths;
  } catch (error) {
    console.error('Error fetching common paths:', error);
    return [];
  }
}

/**
 * 检查API健康状态
 * @returns 健康状态信息
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  try {
    const response = await api.get<{ status: string; service: string }>('/health');
    return response.data;
  } catch (error) {
    console.error('API health check failed:', error);
    throw new Error('API健康检查失败');
  }
}