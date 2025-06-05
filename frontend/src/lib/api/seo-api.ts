//frontend-new/src/lib/api/seo-api.ts
import axios from 'axios';
import {
  SEOUploadResponse,
  SEOBatchUploadResponse,
  SEOBatchResultsResponse,
  SEOCategory,
  ContentExtractor,
  SEOExportType,
  SEOBatchStats
} from '@/types/seo';

// API base URL - 更新为v1版本
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/v1`
  : 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * HTML文件上传参数接口（单文件）
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
 * HTML文件批量上传参数接口
 */
export interface BatchUploadSEOFilesParams {
  /** 要上传的HTML文件数组 */
  files: File[];
  /** 内容提取器类型，默认为自动 */
  contentExtractor?: ContentExtractor;
  /** 是否启用高级分析，默认启用 */
  enableAdvancedAnalysis?: boolean;
}

/**
 * 上传HTML文件进行SEO分析（单文件）
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
 * 批量上传HTML文件进行SEO分析
 * @param params 批量上传参数
 * @returns 批量SEO分析结果
 */
export async function batchUploadSEOFiles({
  files,
  contentExtractor = 'auto',
  enableAdvancedAnalysis = true
}: BatchUploadSEOFilesParams): Promise<SEOBatchUploadResponse> {
  const formData = new FormData();
  
  // 添加所有文件
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  formData.append('content_extractor', contentExtractor);
  formData.append('enable_advanced_analysis', enableAdvancedAnalysis.toString());
  
  // 根据文件数量设置更长的超时时间
  const timeoutMs = Math.max(300000, files.length * 60000); // 最少5分钟，每个文件额外1分钟
  
  const response = await api.post<SEOBatchUploadResponse>('/seo/batch-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: timeoutMs,
  });
  
  return response.data;
}

/**
 * 获取批量SEO分析结果
 * @returns 批量分析结果
 */
export async function getBatchSEOResults(): Promise<SEOBatchResultsResponse> {
  const response = await api.get<SEOBatchResultsResponse>('/seo/batch-results');
  return response.data;
}

/**
 * 获取批量SEO分析统计信息
 * @returns 批量分析统计
 */
export async function getBatchSEOStats(): Promise<{ success: boolean; stats: SEOBatchStats }> {
  const response = await api.get<{ success: boolean; stats: SEOBatchStats }>('/seo/batch-stats');
  return response.data;
}

/**
 * 导出批量SEO分析结果为CSV
 * @param exportType 导出类型（summary 或 detailed）
 * @returns 导出文件的URL
 */
export function exportBatchSEOResults(exportType: SEOExportType = 'summary'): string {
  return `${API_BASE_URL}/seo/batch-export?export_type=${exportType}`;
}

/**
 * 下载批量SEO分析结果CSV文件
 * @param exportType 导出类型
 * @returns Promise<Blob>
 */
export async function downloadBatchSEOResults(exportType: SEOExportType = 'summary'): Promise<Blob> {
  const response = await api.get(`/seo/batch-export?export_type=${exportType}`, {
    responseType: 'blob',
  });
  
  return response.data;
}

/**
 * 通过POST请求导出批量SEO分析结果
 * @param exportType 导出类型
 * @returns Promise<Blob>
 */
export async function postExportBatchSEOResults(exportType: SEOExportType = 'summary'): Promise<Blob> {
  const response = await api.post('/seo/batch-export', 
    { export_type: exportType }, 
    {
      responseType: 'blob',
    }
  );
  
  return response.data;
}

/**
 * 清除批量SEO分析结果
 * @returns 操作结果
 */
export async function clearBatchSEOResults(): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{ success: boolean; message: string }>('/seo/batch-results');
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
 * 检查API健康状态 - 使用通用健康检查端点
 * @returns 健康状态信息
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  // 使用通用的健康检查端点
  const rootApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  });
  const response = await rootApi.get<{ status: string; service: string }>('/health');
  return response.data;
}

/**
 * 导出分析报告为PDF（保留原有功能）
 * @param reportId 分析报告ID
 * @returns 导出的URL
 */
export function exportSEOReport(reportId: string): string {
  return `${API_BASE_URL}/seo/export/${reportId}`;
}

/**
 * 获取特定页面的历史分析记录（保留原有功能）
 * @param url 页面URL
 * @returns 历史分析记录
 */
export async function getSEOHistory(url: string): Promise<any> {
  const response = await api.get(`/seo/history`, {
    params: { url }
  });
  return response.data;
}

/**
 * 触发CSV文件下载
 * @param blob CSV数据blob
 * @param filename 文件名
 */
export function triggerCsvDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 批量下载SEO分析结果并自动触发下载
 * @param exportType 导出类型
 * @param customFilename 自定义文件名（可选）
 */
export async function downloadAndSaveBatchResults(
  exportType: SEOExportType = 'summary', 
  customFilename?: string
): Promise<void> {
  try {
    const blob = await downloadBatchSEOResults(exportType);
    
    const filename = customFilename || 
      `seo_batch_analysis_${exportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    triggerCsvDownload(blob, filename);
  } catch (error) {
    console.error('Failed to download batch results:', error);
    throw error;
  }
}

/**
 * 验证文件是否为有效的HTML文件
 * @param file 文件对象
 * @returns 是否有效
 */
export function validateHTMLFile(file: File): { valid: boolean; error?: string } {
  // 检查文件扩展名
  const validExtensions = ['.html', '.htm'];
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `文件 "${file.name}" 不是有效的HTML文件。支持的格式: ${validExtensions.join(', ')}`
    };
  }
  
  // 检查文件大小（100MB限制）
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件 "${file.name}" 大小超过限制。最大支持 ${Math.round(maxSize / (1024 * 1024))}MB`
    };
  }
  
  return { valid: true };
}

/**
 * 批量验证HTML文件
 * @param files 文件数组
 * @returns 验证结果
 */
export function validateHTMLFiles(files: File[]): { 
  valid: boolean; 
  errors: string[];
  validFiles: File[];
  invalidFiles: File[];
} {
  const errors: string[] = [];
  const validFiles: File[] = [];
  const invalidFiles: File[] = [];
  
  // 检查文件数量限制
  if (files.length > 50) {
    errors.push('一次最多只能上传50个文件');
  }
  
  // 验证每个文件
  files.forEach(file => {
    const validation = validateHTMLFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file);
      if (validation.error) {
        errors.push(validation.error);
      }
    }
  });
  
  return {
    valid: errors.length === 0 && validFiles.length > 0,
    errors,
    validFiles,
    invalidFiles
  };
}

/**
 * 全局请求错误处理器
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('SEO API请求错误:', error.response?.data || error.message);
    
    // 特殊处理批量上传超时
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('SEO批量分析超时，请尝试减少文件数量或稍后重试');
    }
    
    return Promise.reject(error);
  }
);

export default api;