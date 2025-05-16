//frontend-new/src/lib/api/seo-api.ts
import axios from 'axios';
import {
  SEOUploadResponse,
  SEOCategory,
  ContentExtractor
} from '@/types/seo';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * HTML文件上传参数接口
 */
export interface UploadSEOFileParams {
  /** 要上传的HTML文件 */
  file: File;
  /** 内容提取器类型，默认为自动 */
  contentExtractor?: ContentExtractor;
  /** 是否启用高级分析，默认启用 */
  enableAdvancedAnalysis?: boolean;
}

/**
 * 上传HTML文件进行SEO分析
 * @param params 上传参数
 * @returns SEO分析结果
 */
export async function uploadSEOFile({
  file,
  contentExtractor = 'auto',
  enableAdvancedAnalysis = true
}: UploadSEOFileParams): Promise<SEOUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('content_extractor', contentExtractor);
  formData.append('enable_advanced_analysis', enableAdvancedAnalysis.toString());
  
  const response = await api.post<SEOUploadResponse>('/seo/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

/**
 * 获取所有SEO分析类别
 * @returns SEO类别列表
 */
export async function getSEOCategories(): Promise<{ categories: SEOCategory[] }> {
  const response = await api.get<{ categories: SEOCategory[] }>('/seo/categories');
  return response.data;
}

/**
 * 检查API健康状态
 * @returns 健康状态信息
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await api.get<{ status: string; service: string }>('/health');
  return response.data;
}

/**
 * 导出分析报告为PDF（新增功能）
 * @param reportId 分析报告ID
 * @returns 导出的URL
 */
export function exportSEOReport(reportId: string): string {
  return `${API_BASE_URL}/seo/export/${reportId}`;
}

/**
 * 获取特定页面的历史分析记录
 * @param url 页面URL
 * @returns 历史分析记录
 */
export async function getSEOHistory(url: string): Promise<any> {
  const response = await api.get(`/seo/history`, {
    params: { url }
  });
  return response.data;
}