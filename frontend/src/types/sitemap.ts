//frontend-new/src/types/sitemap.ts
export interface SitemapFileStats {
  /** 文件名 */
  filename: string;
  /** 文件类型 */
  type: string;
  /** URL数量 */
  url_count: number;
  /** 是否为Sitemap索引 */
  is_sitemap_index: boolean;
}

/**
 * Sitemap上传响应
 */
export interface SitemapUploadResponse {
  /** 文件统计信息 */
  file_stats: SitemapFileStats[];
  /** 总URL数量 */
  total_urls: number;
  /** 顶级域名列表 */
  top_level_domains: string[];
  /** URL结构统计 */
  url_structure: Record<string, number>;
}

/**
 * 路径筛选类型枚举
 */
export enum PathFilterType {
  /** 包含路径 */
  CONTAINS = 'contains',
  /** 不包含路径 */
  NOT_CONTAINS = 'not_contains'
}

/**
 * Sitemap筛选请求
 */
export interface SitemapFilterRequest {
  /** 域名筛选 */
  domain?: string;
  /** 多路径筛选（新版本支持） */
  paths?: string[];
  /** 单一路径筛选（兼容旧版本） */
  path?: string;
  /** 路径筛选类型 */
  path_filter_type?: string;
  /** URL深度筛选 */
  depth?: number;
}

/**
 * Sitemap筛选响应
 */
export interface SitemapFilterResponse {
  /** 筛选后的URL列表 */
  filtered_urls: string[];
  /** 筛选后的URL总数 */
  total_filtered: number;
  /** URL层级结构 */
  url_hierarchy: any;
}

/**
 * 树节点基本结构
 */
export interface TreeNode {
  /** 节点名称 */
  name: string;
  /** 节点路径 */
  path?: string;
  /** 子节点 */
  children?: TreeNode[];
  /** 节点值 */
  value?: number;
  /** 是否为叶子节点 */
  isLeaf?: boolean;
  /** 节点样式 */
  itemStyle?: {
    color?: string;
    [key: string]: any;
  };
  /** 是否折叠 */
  collapsed?: boolean;
}

/**
 * 图形节点
 */
export interface GraphNode {
  /** 节点ID */
  id: number;
  /** 节点名称 */
  name: string;
  /** 节点类别 */
  category: number;
  /** 节点大小 */
  symbolSize: number;
  /** 节点路径 */
  path?: string;
  /** 节点值 */
  value?: any;
  /** 节点样式 */
  itemStyle?: {
    color?: string;
    [key: string]: any;
  };
}

/**
 * 图形连接
 */
export interface GraphLink {
  /** 源节点ID */
  source: number;
  /** 目标节点ID */
  target: number;
  /** 连接值 */
  value?: number;
}

/**
 * 树形可视化数据
 */
export interface TreeVisualizationData {
  /** 根节点名称 */
  name: string;
  /** 子节点 */
  children: TreeNode[];
  /** 折叠状态 */
  collapsed?: boolean;
  /** 路径 */
  path?: string;
}

/**
 * 图形可视化数据
 */
export interface GraphVisualizationData {
  /** 节点列表 */
  nodes: GraphNode[];
  /** 连接列表 */
  links: GraphLink[];
}

/**
 * Sitemap可视化数据联合类型
 */
export type SitemapVisualizationData = 
  | TreeVisualizationData 
  | GraphVisualizationData 
  | { error: string };

/**
 * URL模式
 */
export interface UrlPattern {
  /** 模式字符串 */
  pattern: string;
  /** 匹配数量 */
  count: number;
  /** 示例URL */
  examples: string[];
}

/**
 * Sitemap分析响应
 */
export interface SitemapAnalysisResponse {
  /** 总URL数量 */
  total_urls: number;
  /** 平均URL长度 */
  avg_url_length?: number;
  /** 平均深度 */
  avg_depth?: number;
  /** 最大深度 */
  max_depth?: number;
  /** 域名统计 */
  domains: Record<string, number>;
  /** 顶级路径段统计 */
  top_path_segments: Record<string, [string, number][]>;
  /** 路径段数量 */
  path_segment_counts: Record<string, number>;
  /** 参数统计 */
  parameters: [string, number][];
  /** 深度分布 */
  depth_distribution?: Record<string, number>;
  /** 扩展名统计 */
  extensions?: Record<string, number>;
  /** URL模式 */
  url_patterns?: UrlPattern[];
  /** 可视化数据 */
  visualization_data?: TreeVisualizationData;
  /** 错误信息 */
  error?: string;
}