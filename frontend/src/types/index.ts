// File statistics
export interface FileStats {
  filename: string;
  stats: DataStats;
}

// Data statistics
export interface DataStats {
  total_rows: number;
  keyword_count: number;
  unique_keywords: number;
  brands: string[];
  min_values: Record<string, number>;
  max_values: Record<string, number>;
}

// Upload response
export interface UploadResponse {
  file_stats: FileStats[];
  merged_stats: DataStats;
}

// Filter ranges
export interface FilterRanges {
  position_range?: [number, number];
  search_volume_range?: [number, number];
  keyword_difficulty_range?: [number, number];
  cpc_range?: [number, number];
  keyword_frequency_range?: [number, number]; // 新增关键词重复次数范围
}

// Filter response
export interface FilterResponse {
  filtered_stats: DataStats;
  keyword_counts: Record<string, number>;
}

// Brand overlap data
export interface BrandOverlapResponse {
  overlap_matrix: Record<string, Record<string, number>>;
  brand_stats: Record<string, BrandStats>;
}

// Brand statistics
export interface BrandStats {
  total_keywords: number;
  unique_keywords: number;
}

// Filter range values
export interface FilterRangeValues {
  position: [number, number];
  search_volume: [number, number];
  keyword_difficulty: [number, number];
  cpc: [number, number];
  keyword_frequency: [number, number]; // 新增关键词重复次数范围
}

// API error
export interface ApiError {
  detail: string;
}

// Keyword filter result
export interface KeywordFilterItem {
  keyword: string;
  brand: string;
  position?: number;
  url?: string;
  traffic?: number;
}

export interface BrandKeywordData {
  brand: string;
  data: KeywordFilterItem[];
}

export interface KeywordFilterResponse {
  results: KeywordFilterItem[];
}

// ==============================================
// Sitemap 相关类型定义
// ==============================================

// Sitemap file statistics
export interface SitemapFileStats {
  filename: string;
  type: string;
  url_count: number;
  is_sitemap_index: boolean;
}

// Sitemap upload response
export interface SitemapUploadResponse {
  file_stats: SitemapFileStats[];
  total_urls: number;
  top_level_domains: string[];
  url_structure: Record<string, number>;
}

// Sitemap filter request
export interface SitemapFilterRequest {
  domain?: string;
  path?: string;
  depth?: number;
}

// Sitemap filter response
export interface SitemapFilterResponse {
  filtered_urls: string[];
  total_filtered: number;
  url_hierarchy: any;
}

// Base node for tree visualization
export interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
  value?: number;
  isLeaf?: boolean;
}

// Graph node for graph visualization
export interface GraphNode {
  id: number;
  name: string;
  category: number;
  symbolSize: number;
}

// Graph link for graph visualization
export interface GraphLink {
  source: number;
  target: number;
}

// Visualization data for tree format
export interface TreeVisualizationData {
  name: string;
  children: TreeNode[];
}

// Visualization data for graph format
export interface GraphVisualizationData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Combined type for sitemap visualization data
export type SitemapVisualizationData = TreeVisualizationData | GraphVisualizationData | { error: string };

// URL pattern
export interface UrlPattern {
  pattern: string;
  count: number;
  examples: string[];
}

// URL analysis results
export interface SitemapAnalysisResponse {
  total_urls: number;
  domains: Record<string, number>;
  top_path_segments: Record<string, [string, number][]>;
  path_segment_counts: Record<string, number>;
  parameters: [string, number][];
  url_patterns?: UrlPattern[];
  visualization_data?: TreeVisualizationData;
  error?: string;
}