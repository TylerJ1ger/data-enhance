// src/types/keystore.ts

// 关键词实体（优化版本）
export interface Keyword {
  id: string;
  keyword: string;
  qpm: number;
  diff: number;
  group: string;
  force_group?: boolean;
}

// 详细关键词实体（用于单个组详情）
export interface KeywordDetail extends Keyword {
  original_group?: string;
  task_name?: string;
  created_at?: string;
}

// 关键词组信息
export interface KeywordGroup {
  group_name: string;
  cluster_name?: string;
  keywords: string[];
  keyword_count: number;
  total_qpm: number;
  avg_diff: number;
  avg_qpm: number;
  max_qpm: number;
  min_qpm: number;
  data: Keyword[];
}

// 关键词族信息
export interface KeywordCluster {
  cluster_name: string;
  group_names: string[];
  total_keywords: number;
  total_qpm: number;
  avg_diff: number;
}

// 重复关键词信息
export interface DuplicateKeyword {
  keyword: string;
  groups: Array<{
    group: string;
    qpm: number;
    diff: number;
  }>;
  group_count: number;
  total_qpm: number;
}

// 文件统计信息
export interface KeystoreFileStats {
  filename: string;
  rows: number;
  keywords: number;
  groups: number;
}

// 上传响应
export interface KeystoreUploadResponse {
  success: boolean;
  file_stats: KeystoreFileStats[];
  summary: KeystoreSummary;
  groups_overview: GroupOverview[];
}

// 关键词库摘要
export interface KeystoreSummary {
  total_keywords: number;
  unique_keywords?: number;
  total_groups: number;
  total_clusters: number;
  duplicate_keywords_count: number;
  total_qpm: number;
  avg_diff?: number;
}

// 组概览
export interface GroupOverview {
  group_name: string;
  cluster_name?: string;
  keyword_count: number;
  total_qpm: number;
  avg_diff?: number;
}

// 可视化数据
export interface KeystoreVisualizationData {
  nodes: Array<{
    id: string;
    name: string;
    category: number;
    value: number;
    symbolSize: number;
    itemStyle: { color: string };
    label: { show: boolean };
    tooltip?: { formatter: string };
  }>;
  links: Array<{
    source: string;
    target: string;
    lineStyle: { width: number };
  }>;
  categories: Array<{
    name: string;
    itemStyle: { color: string };
  }>;
}

// 重复关键词分析
export interface DuplicateKeywordsAnalysis {
  total_duplicates: number;
  details: DuplicateKeyword[];
}

// API请求类型
export interface KeywordMoveRequest {
  keyword: string;
  source_group: string;
  target_group: string;
}

export interface KeywordRemoveRequest {
  keyword: string;
  group: string;
}

export interface GroupRenameRequest {
  old_name: string;
  new_name: string;
}

export interface ClusterCreateRequest {
  cluster_name: string;
  group_names: string[];
}

export interface ClusterUpdateRequest {
  cluster_name: string;
  group_names: string[];
}

// API响应类型
export interface KeystoreApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface KeystoreGroupsResponse extends KeystoreApiResponse {
  groups: Record<string, KeywordGroup>;
}

export interface KeystoreClustersResponse extends KeystoreApiResponse {
  clusters: Record<string, string[]>;
}

export interface KeystoreVisualizationResponse extends KeystoreApiResponse {
  visualization: KeystoreVisualizationData;
}

export interface KeystoreDuplicatesResponse extends KeystoreApiResponse {
  duplicates: DuplicateKeywordsAnalysis;
}