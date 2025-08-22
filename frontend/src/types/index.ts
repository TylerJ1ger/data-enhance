//frontend/src/types/index.ts

// ==============================================
// 重新导出结构化数据生成器相关类型
// ==============================================
export * from './schema';
export * from './keystore';

// ==============================================
// 通用类型定义
// ==============================================

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

// API错误
export interface ApiError {
  detail: string;
}

// 图表数据点
export interface ChartDataPoint {
  [key: string]: any;
}

// 图表配置
export interface ChartConfig {
  type: "pie" | "line" | "bar";
  title: string;
  data: ChartDataPoint[] | Record<string, number>;
}

// ==============================================
// 关键词分析相关类型定义
// ==============================================

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
// 外链分析相关类型定义
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
export interface ChartConfigInterface {
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

// ==============================================
// 虚拟订单分析相关类型定义
// ==============================================

// 日期范围接口 - 新增
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// 日期范围验证结果 - 新增
export interface DateRangeValidation {
  isValid: boolean;
  error?: string;
  daysDiff?: number;
}

// 订单生成配置接口 - 新增
export interface OrderGenerationConfig {
  count: number;
  startDate: Date;
  endDate: Date;
}

// 虚拟数据生成请求 - 更新支持日期范围
export interface VirtualDataGenerateRequest {
  count: number;
  date_range?: {
    start_date: string;  // ISO格式日期字符串 YYYY-MM-DD
    end_date: string;    // ISO格式日期字符串 YYYY-MM-DD
  };
}

// 虚拟数据生成响应
export interface VirtualDataGenerateResponse {
  success: boolean;
  generated_count: number;
  stats: OrderStats;
  message: string;
  error?: string;
}

// 订单统计信息
export interface OrderStats {
  total_orders: number;
  unique_users: number;
  date_range: {
    start: string;
    end: string;
  };
  order_types: Record<string, number>;
  license_distribution: Record<string, number>;
  currency_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  total_revenue: Record<string, number>;
  avg_order_value: Record<string, number>;
  coupon_usage_rate?: number;
  ab_test_participation_rate?: number;
  success_rate?: number;
  user_behavior?: {
    avg_orders_per_user: number;
    max_orders_per_user: number;
    repeat_customers: number;
    repeat_customer_rate: number;
  };
  generation_date_range?: {
    requested_start: string;
    requested_end: string;
    days_span: number;
  };
}

// 订单筛选请求
export interface OrderFilterRequest {
  date_range?: [string, string] | null;
  order_types?: string[] | null;
  license_ids?: number[] | null;
  currencies?: string[] | null;
  payment_platforms?: string[] | null;
  order_statuses?: string[] | null;
  sales_amount_range?: [number, number] | null;
  has_coupon?: boolean | null;
  ab_test_filter?: "with" | "without" | null;
}

// 订单筛选响应
export interface OrderFilterResponse {
  success: boolean;
  filtered_count: number;
  filtered_stats: OrderStats;
  message: string;
  error?: string;
}

// 订单图表数据响应
export interface OrderChartsResponse {
  charts: {
    order_type_distribution: ChartConfig;
    daily_orders_trend: ChartConfig;
    license_sales_distribution: ChartConfig;
    currency_revenue_distribution: ChartConfig;
    payment_platform_stats: ChartConfig;
    order_status_distribution: ChartConfig;
    coupon_usage: ChartConfig;
    ab_test_participation: ChartConfig;
    cart_source_distribution: ChartConfig;
  };
  error?: string;
}

// 订单筛选范围
export interface OrderFilterRanges {
  date_range: {
    min: string;
    max: string;
  };
  sales_amount_range: {
    min: number;
    max: number;
  };
  available_options: {
    order_types: string[];
    license_ids: number[];
    currencies: string[];
    payment_platforms: string[];
    order_statuses: string[];
  };
  error?: string;
}

// 订单数据摘要
export interface OrderSummary {
  total_orders: number;
  filtered_orders: number;
  has_data: boolean;
  last_generation_params: {
    count?: number;
    date_range?: {
      start_date: string;
      end_date: string;
    };
  };
}

// 订单筛选配置
export interface OrderFilterConfig {
  enabled: boolean;
  values: any;
}

// 订单筛选状态
export interface OrderFilterState {
  dateRange: OrderFilterConfig;
  orderTypes: OrderFilterConfig;
  licenseIds: OrderFilterConfig;
  currencies: OrderFilterConfig;
  paymentPlatforms: OrderFilterConfig;
  orderStatuses: OrderFilterConfig;
  salesAmountRange: OrderFilterConfig;
  hasCoupon: OrderFilterConfig;
  abTestFilter: OrderFilterConfig;
}

// License ID 映射
export const LICENSE_MAPPINGS = {
  1: { name: "月度订阅", price: 9.99 },
  2: { name: "季度订阅", price: 19.99 },
  3: { name: "年度订阅", price: 46.99 },
  4: { name: "1000 Credit", price: 4.99 },
  5: { name: "5000 Credit", price: 14.99 },
} as const;

// 优惠券映射
export const COUPON_MAPPINGS = {
  601: { name: "10% 折扣", discount: 0.10 },
  602: { name: "20% 折扣", discount: 0.20 },
  603: { name: "30% 折扣", discount: 0.30 },
} as const;

// 订单API错误响应
export interface OrderApiError {
  detail: string;
}

// ==============================================
// 日期工具类型定义 - 新增
// ==============================================

// 日期格式化选项
export interface DateFormatOptions {
  locale?: string;
  includeTime?: boolean;
  format?: 'short' | 'long' | 'iso';
}

// 日期范围预设
export interface DateRangePreset {
  label: string;
  value: DateRange;
  description?: string;
}

// 常用日期范围预设
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: "最近7天",
    value: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    description: "过去一周的数据"
  },
  {
    label: "最近30天",
    value: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    description: "过去一个月的数据"
  },
  {
    label: "最近90天",
    value: {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    description: "过去三个月的数据"
  },
  {
    label: "本年度",
    value: {
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date()
    },
    description: "从年初到现在的数据"
  }
];

// ==============================================
// 通用响应类型
// ==============================================

// 基础API响应
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 批量操作响应
export interface BatchOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
  message: string;
}

// ==============================================
// 导出所有类型（确保向后兼容）
// ==============================================

// 重新导出常用类型以保持兼容性
export type OrderGenerationRequest = VirtualDataGenerateRequest;
export type OrderGenerationResponse = VirtualDataGenerateResponse;