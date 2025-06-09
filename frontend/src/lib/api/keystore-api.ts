// src/lib/api/keystore-api.ts
import axios from 'axios';
import type {
  KeystoreUploadResponse,
  KeystoreSummary,
  KeystoreGroupsResponse,
  KeystoreClustersResponse,
  KeystoreVisualizationResponse,
  KeystoreDuplicatesResponse,
  KeywordMoveRequest,
  KeywordRemoveRequest,
  GroupRenameRequest,
  ClusterCreateRequest,
  ClusterUpdateRequest,
  KeystoreApiResponse,
  GroupOverview
} from '@/types/keystore';

// API base URL
const KEYSTORE_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/v1/keystore`
  : 'http://localhost:8000/api/v1/keystore';

// 创建axios实例
const keystoreApi = axios.create({
  baseURL: KEYSTORE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 上传关键词库文件
 */
export const uploadKeystoreFiles = async (files: File[]): Promise<KeystoreUploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await keystoreApi.post<KeystoreUploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * 获取关键词库摘要
 */
export const getKeystoreSummary = async (): Promise<{ summary: KeystoreSummary; groups_overview: GroupOverview[] }> => {
  const response = await keystoreApi.get<{ 
    success: boolean; 
    summary: KeystoreSummary; 
    groups_overview: GroupOverview[] 
  }>('/summary');
  return {
    summary: response.data.summary,
    groups_overview: response.data.groups_overview
  };
};

/**
 * 获取所有组数据
 */
export const getKeystoreGroups = async (): Promise<Record<string, any>> => {
  const response = await keystoreApi.get<KeystoreGroupsResponse>('/groups');
  return response.data.groups;
};

/**
 * 获取所有族数据
 */
export const getKeystoreClusters = async (): Promise<Record<string, string[]>> => {
  const response = await keystoreApi.get<KeystoreClustersResponse>('/clusters');
  return response.data.clusters;
};

/**
 * 获取可视化数据
 */
export const getKeystoreVisualization = async (): Promise<any> => {
  const response = await keystoreApi.get<KeystoreVisualizationResponse>('/visualization');
  return response.data.visualization;
};

/**
 * 获取重复关键词分析
 */
export const getKeystoreDuplicates = async (): Promise<any> => {
  const response = await keystoreApi.get<KeystoreDuplicatesResponse>('/duplicates');
  return response.data.duplicates;
};

/**
 * 移动关键词到其他组
 */
export const moveKeyword = async (request: KeywordMoveRequest): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.post<KeystoreApiResponse>('/keywords/move', request);
  return response.data;
};

/**
 * 从组中删除关键词
 */
export const removeKeyword = async (request: KeywordRemoveRequest): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.post<KeystoreApiResponse>('/keywords/remove', request);
  return response.data;
};

/**
 * 重命名组
 */
export const renameGroup = async (request: GroupRenameRequest): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.post<KeystoreApiResponse>('/groups/rename', request);
  return response.data;
};

/**
 * 创建族
 */
export const createCluster = async (request: ClusterCreateRequest): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.post<KeystoreApiResponse>('/clusters/create', request);
  return response.data;
};

/**
 * 更新族
 */
export const updateCluster = async (request: ClusterUpdateRequest): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.put<KeystoreApiResponse>('/clusters/update', request);
  return response.data;
};

/**
 * 删除族
 */
export const deleteCluster = async (clusterName: string): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.delete<KeystoreApiResponse>(`/clusters/${encodeURIComponent(clusterName)}`);
  return response.data;
};

/**
 * 导出关键词库数据
 */
export const exportKeystoreData = (): string => {
  return `${KEYSTORE_API_BASE_URL}/export`;
};

/**
 * 重置关键词库数据
 */
export const resetKeystoreData = async (): Promise<KeystoreApiResponse> => {
  const response = await keystoreApi.post<KeystoreApiResponse>('/reset');
  return response.data;
};

/**
 * 检查关键词库API健康状态
 */
export const checkKeystoreApiHealth = async (): Promise<{ status: string; module: string; version: string }> => {
  const response = await keystoreApi.get<{ status: string; module: string; version: string }>('/health');
  return response.data;
};

/**
 * 全局请求错误处理器
 */
keystoreApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('关键词库API请求错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default keystoreApi;