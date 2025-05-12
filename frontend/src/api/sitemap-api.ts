import axios from 'axios';
import {
  SitemapUploadResponse,
  SitemapFilterRequest,
  SitemapFilterResponse,
  SitemapVisualizationData,
  SitemapAnalysisResponse,
} from '../types/sitemap';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Upload sitemap files
export const uploadSitemapFiles = async (files: File[]): Promise<SitemapUploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await api.post<SitemapUploadResponse>('/sitemap/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Get sitemap visualization data
export const getSitemapVisualization = async (visualizationType: string = 'tree'): Promise<SitemapVisualizationData> => {
  const response = await api.get<SitemapVisualizationData>(`/sitemap/visualization?visualization_type=${visualizationType}`);
  return response.data;
};

// Get filtered visualization data
export const getFilteredVisualization = async (visualizationType: string = 'tree', urls: string[] = []): Promise<SitemapVisualizationData> => {
  // 发送可视化数据请求，附带筛选后的URL列表
  const response = await api.post<SitemapVisualizationData>(`/sitemap/filtered-visualization`, {
    visualization_type: visualizationType,
    urls: urls
  });
  return response.data;
};

// Filter sitemap URLs
export const filterSitemap = async (filters: SitemapFilterRequest): Promise<SitemapFilterResponse> => {
  const response = await api.post<SitemapFilterResponse>('/sitemap/filter', filters);
  return response.data;
};

// Analyze sitemap structure
export const analyzeSitemap = async (detailed: boolean = false): Promise<SitemapAnalysisResponse> => {
  const response = await api.get<SitemapAnalysisResponse>(`/sitemap/analyze?detailed=${detailed}`);
  return response.data;
};

// Export merged sitemap
export const exportMergedSitemap = (format: string = 'xml'): string => {
  return `${API_BASE_URL}/sitemap/export?format=${format}`;
};

// 导出筛选后的URLs
export const exportFilteredUrls = (format: string = 'csv'): string => {
  return `${API_BASE_URL}/sitemap/export-filtered?format=${format}`;
};

// 获取常用路径
export const getCommonPaths = async (minCount: number = 5): Promise<string[]> => {
  try {
    const response = await api.get<{common_paths: string[]}>(`/sitemap/common-paths?min_count=${minCount}`);
    return response.data.common_paths;
  } catch (error) {
    console.error('Error fetching common paths:', error);
    return [];
  }
};