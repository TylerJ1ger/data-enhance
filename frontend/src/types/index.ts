//frontend-new/src/types/index.ts
// 文件统计信息
export interface FileStats {
  filename: string;
  stats: DataStats;
}

// 数据统计信息
export interface DataStats {
  total_rows: number;
  keyword_count: number;
  unique_keywords: number;
  brands: string[];
  min_values: Record<string, number>;
  max_values: Record<string, number>;
}

// 上传响应
export interface UploadResponse {
  file_stats: FileStats[];
  merged_stats: DataStats;
}

// 筛选范围
export interface FilterRanges {
  position_range?: [number, number] | null;
  search_volume_range?: [number, number] | null;
  keyword_difficulty_range?: [number, number] | null;
  cpc_range?: [number, number] | null;
  keyword_frequency_range?: [number, number] | null;
}

// 筛选项配置
export interface FilterConfig {
  enabled: boolean;
  range: [number, number];
}

// 筛选配置对象
export interface FilterConfigs {
  position: FilterConfig;
  search_volume: FilterConfig;
  keyword_difficulty: FilterConfig;
  cpc: FilterConfig;
  keyword_frequency: FilterConfig;
}

// 筛选响应
export interface FilterResponse {
  filtered_stats: DataStats;
  keyword_counts: Record<string, number>;
}

// 品牌重叠数据
export interface BrandOverlapResponse {
  overlap_matrix: Record<string, Record<string, number>>;
  brand_stats: Record<string, BrandStats>;
}

// 品牌统计信息
export interface BrandStats {
  total_keywords: number;
  unique_keywords: number;
}

// 筛选范围值
export interface FilterRangeValues {
  position: [number, number];
  search_volume: [number, number];
  keyword_difficulty: [number, number];
  cpc: [number, number];
  keyword_frequency: [number, number]; // 关键词重复次数范围
}

// API错误
export interface ApiError {
  detail: string;
}

// 关键词筛选结果项
export interface KeywordFilterItem {
  keyword: string;
  brand: string;
  position?: number;
  url?: string;
  traffic?: number;
}

// 品牌关键词数据
export interface BrandKeywordData {
  brand: string;
  data: KeywordFilterItem[];
}

// 关键词筛选响应
export interface KeywordFilterResponse {
  results: KeywordFilterItem[];
}

// ==============================================
// 外链相关类型定义
// ==============================================

// 外链筛选范围
export interface BacklinkFilterRanges {
  domain_ascore_range?: [number, number];
  backlinks_range?: [number, number];
  domain_frequency_range?: [number, number];
}

// 外链筛选响应
export interface BacklinkFilterResponse {
  filtered_stats: BacklinkDataStats;
  domain_counts: Record<string, number>;
}

// 外链数据统计信息
export interface BacklinkDataStats {
  total_rows: number;
  domain_count: number;
  unique_domains: number;
  brands: string[];
  min_values: Record<string, number>;
  max_values: Record<string, number>;
}

// 外链筛选范围值
export interface BacklinkFilterRangeValues {
  domain_ascore: [number, number];
  backlinks: [number, number];
  domain_frequency: [number, number];
}

// 外链上传响应
export interface BacklinkUploadResponse {
  file_stats: FileStats[];
  merged_stats: BacklinkDataStats;
}

// 域名筛选结果项
export interface DomainFilterItem {
  domain: string;
  brand: string;
  domain_ascore?: number;
  backlinks?: number;
  ip_address?: string;
  country?: string;
  first_seen?: string;
  last_seen?: string;
}

// 域名筛选响应
export interface DomainFilterResponse {
  results: DomainFilterItem[];
}

// 品牌域名重叠数据
export interface BrandDomainOverlapResponse {
  overlap_matrix: Record<string, Record<string, number>>;
  brand_stats: Record<string, BrandDomainStats>;
}

// 品牌域名统计信息
export interface BrandDomainStats {
  total_domains: number;
  unique_domains: number;
}

// ==============================================
// Sitemap 相关类型定义
// ==============================================

// Sitemap文件统计信息
export interface SitemapFileStats {
  filename: string;
  type: string;
  url_count: number;
  is_sitemap_index: boolean;
}

// Sitemap上传响应
export interface SitemapUploadResponse {
  file_stats: SitemapFileStats[];
  total_urls: number;
  top_level_domains: string[];
  url_structure: Record<string, number>;
}

// 路径筛选类型枚举
export enum PathFilterType {
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains'
}

// Sitemap筛选请求
export interface SitemapFilterRequest {
  domain?: string;
  paths?: string[]; // 支持多路径筛选
  path?: string;    // 保留原来的path以保持向后兼容
  path_filter_type?: string;
  depth?: number;
}

// Sitemap筛选响应
export interface SitemapFilterResponse {
  filtered_urls: string[];
  total_filtered: number;
  url_hierarchy: any;
}

// 树形节点
export interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
  value?: number;
  isLeaf?: boolean;
}

// 图形节点
export interface GraphNode {
  id: number;
  name: string;
  category: number;
  symbolSize: number;
}

// 图形连接
export interface GraphLink {
  source: number;
  target: number;
}

// 树形可视化数据
export interface TreeVisualizationData {
  name: string;
  children: TreeNode[];
}

// 图形可视化数据
export interface GraphVisualizationData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Sitemap可视化数据联合类型
export type SitemapVisualizationData = TreeVisualizationData | GraphVisualizationData | { error: string };

// URL模式
export interface UrlPattern {
  pattern: string;
  count: number;
  examples: string[];
}

// URL分析结果
export interface SitemapAnalysisResponse {
  total_urls: number;
  avg_url_length?: number;
  avg_depth?: number;
  max_depth?: number;
  domains: Record<string, number>;
  top_path_segments: Record<string, [string, number][]>;
  path_segment_counts: Record<string, number>;
  parameters: [string, number][];
  depth_distribution?: Record<string, number>;
  extensions?: Record<string, number>;
  url_patterns?: UrlPattern[];
  visualization_data?: TreeVisualizationData;
  error?: string;
}

// 图表配置接口
export interface ChartConfig {
  maxNodes?: number;
  initialDepth?: number;
  enableAnimation?: boolean;
  labelStrategy?: 'always' | 'hover' | 'none';
}

// 可视化类型
export type VisualizationType = 
  | 'tree' 
  | 'tree-radial' 
  | 'graph-label-overlap' 
  | 'graph-circular-layout'
  | 'graph-webkit-dep'
  | 'graph-npm';

// 导出格式类型
export type ExportFormat = 'csv' | 'xml' | 'txt' | 'json';