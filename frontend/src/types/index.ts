//frontend/src/types/index.ts

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
// 结构化数据生成器相关类型定义 - 新增
// ==============================================

// 结构化数据类型枚举
export type SchemaType = 
  | 'Article'
  | 'Breadcrumb'
  | 'Event'
  | 'FAQPage'
  | 'HowTo'
  | 'Organization'
  | 'Person'
  | 'Product'
  | 'VideoObject'
  | 'WebSite';

// 结构化数据配置信息
export interface SchemaTypeConfig {
  name: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
}

// 支持的结构化数据类型响应
export interface SchemaTypesResponse {
  success: boolean;
  schema_types: Record<SchemaType, SchemaTypeConfig>;
}

// 结构化数据模板响应
export interface SchemaTemplateResponse {
  success: boolean;
  schema_type: string;
  template: Record<string, any>;
}

// 结构化数据生成请求
export interface SchemaGenerateRequest {
  schema_type: SchemaType;
  data: Record<string, any>;
}

// 结构化数据生成响应
export interface SchemaGenerateResponse {
  success: boolean;
  schema_type: string;
  schema_data: Record<string, any>;
  json_ld: string;
  html_script: string;
  is_preview?: boolean;
  message?: string;
  template?: Record<string, any>;
}

// 结构化数据验证请求
export interface SchemaValidateRequest {
  schema_type: SchemaType;
  data: Record<string, any>;
}

// 验证结果
export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// 结构化数据验证响应
export interface SchemaValidateResponse {
  success: boolean;
  schema_type: string;
  validation: ValidationResult;
}

// 面包屑导航项
export interface BreadcrumbItem {
  name: string;
  url: string;
}

// FAQ项
export interface FAQItem {
  question: string;
  answer: string;
}

// 操作步骤项
export interface HowToStep {
  name?: string;
  text: string;
  image?: string;
}

// 地址信息
export interface Address {
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
}

// 联系信息
export interface ContactPoint {
  telephone: string;
  contactType: string;
}

// 价格信息
export interface Offer {
  price: string;
  currency: string;
}

// 评分信息
export interface AggregateRating {
  ratingValue: string;
  reviewCount: string;
}

// 搜索功能配置
export interface PotentialAction {
  type: 'SearchAction';
  target: string;
}

// 结构化数据表单字段类型
export type SchemaFieldType = 
  | 'text'
  | 'textarea'
  | 'url'
  | 'email'
  | 'date'
  | 'datetime-local'
  | 'number'
  | 'array'
  | 'object';

// 表单字段配置
export interface SchemaFieldConfig {
  key: string;
  label: string;
  type: SchemaFieldType;
  required: boolean;
  placeholder?: string;
  description?: string;
  items?: SchemaFieldConfig[]; // 用于数组和对象类型
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// 结构化数据表单状态
export interface SchemaFormState {
  selectedType: SchemaType | null;
  formData: Record<string, any>;
  errors: Record<string, string>;
  isValid: boolean;
}

// 结构化数据输出格式
export type SchemaOutputFormat = 'json-ld' | 'html';

// 结构化数据编辑器状态
export interface SchemaEditorState {
  activeTab: 'form' | 'preview' | 'output';
  outputFormat: SchemaOutputFormat;
  showValidation: boolean;
  isGenerating: boolean;
  lastGenerated?: SchemaGenerateResponse;
}

// 预定义的结构化数据示例
export interface SchemaExample {
  title: string;
  description: string;
  data: Record<string, any>;
}

// 结构化数据保存/加载配置
export interface SchemaConfig {
  id: string;
  name: string;
  schema_type: SchemaType;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 结构化数据API错误响应
export interface SchemaApiError {
  detail: string;
  schema_type?: string;
  field_errors?: Record<string, string[]>;
}

// 表单验证状态
export interface FormValidationState {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  lastValidated: string | null;
}

// 结构化数据统计信息
export interface SchemaStats {
  total_generated: number;
  most_used_type: SchemaType;
  success_rate: number;
  last_generated: string;
}

// 结构化数据类型的字段映射
export const SCHEMA_FIELD_CONFIGS: Record<SchemaType, SchemaFieldConfig[]> = {
  Article: [
    { key: 'headline', label: '标题', type: 'text', required: true, placeholder: '文章标题' },
    { key: 'author', label: '作者', type: 'text', required: true, placeholder: '作者姓名' },
    { key: 'datePublished', label: '发布日期', type: 'date', required: true },
    { key: 'description', label: '描述', type: 'textarea', required: false, placeholder: '文章描述' },
    { key: 'image', label: '图片URL', type: 'url', required: false, placeholder: 'https://example.com/image.jpg' },
    { key: 'publisher', label: '发布者', type: 'text', required: false, placeholder: '发布机构名称' },
    { key: 'dateModified', label: '修改日期', type: 'date', required: false }
  ],
  Breadcrumb: [
    {
      key: 'itemListElement',
      label: '面包屑导航项',
      type: 'array',
      required: true,
      items: [
        { key: 'name', label: '名称', type: 'text', required: true, placeholder: '页面名称' },
        { key: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://example.com/page' }
      ]
    }
  ],
  Event: [
    { key: 'name', label: '事件名称', type: 'text', required: true, placeholder: '活动名称' },
    { key: 'startDate', label: '开始时间', type: 'datetime-local', required: true },
    { key: 'location', label: '地点', type: 'text', required: true, placeholder: '活动地点' },
    { key: 'description', label: '描述', type: 'textarea', required: false, placeholder: '活动描述' },
    { key: 'endDate', label: '结束时间', type: 'datetime-local', required: false },
    { key: 'organizer', label: '主办方', type: 'text', required: false, placeholder: '主办机构' },
    {
      key: 'offers',
      label: '票价信息',
      type: 'object',
      required: false,
      items: [
        { key: 'price', label: '价格', type: 'number', required: false, placeholder: '0' },
        { key: 'currency', label: '货币', type: 'text', required: false, placeholder: 'USD' }
      ]
    }
  ],
  FAQPage: [
    {
      key: 'mainEntity',
      label: 'FAQ列表',
      type: 'array',
      required: true,
      items: [
        { key: 'question', label: '问题', type: 'text', required: true, placeholder: '常见问题' },
        { key: 'answer', label: '答案', type: 'textarea', required: true, placeholder: '问题答案' }
      ]
    }
  ],
  HowTo: [
    { key: 'name', label: '指南标题', type: 'text', required: true, placeholder: '操作指南标题' },
    { key: 'description', label: '描述', type: 'textarea', required: false, placeholder: '指南描述' },
    { key: 'image', label: '图片URL', type: 'url', required: false, placeholder: 'https://example.com/image.jpg' },
    { key: 'totalTime', label: '总耗时', type: 'text', required: false, placeholder: 'PT30M (30分钟)' },
    {
      key: 'supply',
      label: '所需用品',
      type: 'array',
      required: false,
      items: [
        { key: 'name', label: '用品名称', type: 'text', required: true, placeholder: '所需用品' }
      ]
    },
    {
      key: 'tool',
      label: '所需工具',
      type: 'array',
      required: false,
      items: [
        { key: 'name', label: '工具名称', type: 'text', required: true, placeholder: '所需工具' }
      ]
    },
    {
      key: 'step',
      label: '操作步骤',
      type: 'array',
      required: true,
      items: [
        { key: 'name', label: '步骤名称', type: 'text', required: false, placeholder: '步骤标题' },
        { key: 'text', label: '步骤描述', type: 'textarea', required: true, placeholder: '详细步骤说明' },
        { key: 'image', label: '步骤图片', type: 'url', required: false, placeholder: 'https://example.com/step.jpg' }
      ]
    }
  ],
  Organization: [
    { key: 'name', label: '组织名称', type: 'text', required: true, placeholder: '公司或组织名称' },
    { key: 'url', label: '网站URL', type: 'url', required: false, placeholder: 'https://example.com' },
    { key: 'logo', label: 'Logo URL', type: 'url', required: false, placeholder: 'https://example.com/logo.png' },
    { key: 'description', label: '描述', type: 'textarea', required: false, placeholder: '组织描述' },
    {
      key: 'address',
      label: '地址信息',
      type: 'object',
      required: false,
      items: [
        { key: 'streetAddress', label: '街道地址', type: 'text', required: false, placeholder: '街道地址' },
        { key: 'city', label: '城市', type: 'text', required: false, placeholder: '城市' },
        { key: 'postalCode', label: '邮政编码', type: 'text', required: false, placeholder: '邮政编码' },
        { key: 'country', label: '国家', type: 'text', required: false, placeholder: '国家' }
      ]
    },
    {
      key: 'contactPoint',
      label: '联系方式',
      type: 'object',
      required: false,
      items: [
        { key: 'telephone', label: '电话', type: 'text', required: false, placeholder: '+1-555-123-4567' },
        { key: 'contactType', label: '联系类型', type: 'text', required: false, placeholder: 'customer service' }
      ]
    }
  ],
  Person: [
    { key: 'name', label: '姓名', type: 'text', required: true, placeholder: '人物姓名' },
    { key: 'jobTitle', label: '职位', type: 'text', required: false, placeholder: '职位头衔' },
    { key: 'worksFor', label: '工作单位', type: 'text', required: false, placeholder: '公司或组织名称' },
    { key: 'url', label: '个人网站', type: 'url', required: false, placeholder: 'https://example.com' },
    { key: 'image', label: '头像URL', type: 'url', required: false, placeholder: 'https://example.com/avatar.jpg' },
    { key: 'description', label: '个人描述', type: 'textarea', required: false, placeholder: '个人介绍' }
  ],
  Product: [
    { key: 'name', label: '产品名称', type: 'text', required: true, placeholder: '产品名称' },
    { key: 'description', label: '产品描述', type: 'textarea', required: false, placeholder: '产品详细描述' },
    { key: 'image', label: '产品图片', type: 'url', required: false, placeholder: 'https://example.com/product.jpg' },
    { key: 'brand', label: '品牌', type: 'text', required: false, placeholder: '品牌名称' },
    {
      key: 'offers',
      label: '价格信息',
      type: 'object',
      required: false,
      items: [
        { key: 'price', label: '价格', type: 'number', required: false, placeholder: '99.99' },
        { key: 'currency', label: '货币', type: 'text', required: false, placeholder: 'USD' }
      ]
    },
    {
      key: 'aggregateRating',
      label: '评分信息',
      type: 'object',
      required: false,
      items: [
        { key: 'ratingValue', label: '评分', type: 'number', required: false, placeholder: '4.5' },
        { key: 'reviewCount', label: '评价数量', type: 'number', required: false, placeholder: '100' }
      ]
    }
  ],
  VideoObject: [
    { key: 'name', label: '视频标题', type: 'text', required: true, placeholder: '视频标题' },
    { key: 'description', label: '视频描述', type: 'textarea', required: true, placeholder: '视频内容描述' },
    { key: 'thumbnailUrl', label: '缩略图URL', type: 'url', required: true, placeholder: 'https://example.com/thumbnail.jpg' },
    { key: 'uploadDate', label: '上传日期', type: 'date', required: true },
    { key: 'duration', label: '视频时长', type: 'text', required: false, placeholder: 'PT1H30M (1小时30分钟)' },
    { key: 'contentUrl', label: '视频URL', type: 'url', required: false, placeholder: 'https://example.com/video.mp4' },
    { key: 'embedUrl', label: '嵌入URL', type: 'url', required: false, placeholder: 'https://example.com/embed/video' },
    { key: 'publisher', label: '发布者', type: 'text', required: false, placeholder: '发布机构名称' }
  ],
  WebSite: [
    { key: 'name', label: '网站名称', type: 'text', required: true, placeholder: '网站名称' },
    { key: 'url', label: '网站URL', type: 'url', required: true, placeholder: 'https://example.com' },
    { key: 'description', label: '网站描述', type: 'textarea', required: false, placeholder: '网站描述' },
    {
      key: 'potentialAction',
      label: '搜索功能',
      type: 'object',
      required: false,
      items: [
        { key: 'type', label: '功能类型', type: 'text', required: false, placeholder: 'SearchAction' },
        { key: 'target', label: '搜索URL模板', type: 'text', required: false, placeholder: 'https://example.com/search?q={search_term_string}' }
      ]
    }
  ]
};

// 结构化数据示例
export const SCHEMA_EXAMPLES: Record<SchemaType, SchemaExample[]> = {
  Article: [
    {
      title: '博客文章示例',
      description: '标准的博客文章结构化数据',
      data: {
        headline: '如何优化网站SEO',
        author: '张三',
        datePublished: '2024-01-15',
        description: '本文介绍了网站SEO优化的基本方法和技巧',
        publisher: '技术博客'
      }
    }
  ],
  Event: [
    {
      title: '会议活动示例',
      description: '技术会议活动的结构化数据',
      data: {
        name: '2024年前端技术大会',
        startDate: '2024-06-15T09:00:00',
        endDate: '2024-06-15T18:00:00',
        location: '北京国际会议中心',
        description: '探讨最新的前端技术趋势和实践',
        organizer: '前端技术社区'
      }
    }
  ],
  Product: [
    {
      title: '电商产品示例',
      description: '电商网站产品页面的结构化数据',
      data: {
        name: 'iPhone 15 Pro',
        description: '最新的苹果智能手机，搭载A17 Pro芯片',
        brand: 'Apple',
        offers: {
          price: '999',
          currency: 'USD'
        },
        aggregateRating: {
          ratingValue: '4.8',
          reviewCount: '1250'
        }
      }
    }
  ],
  // 其他类型的示例...
  Breadcrumb: [],
  FAQPage: [],
  HowTo: [],
  Organization: [],
  Person: [],
  VideoObject: [],
  WebSite: []
};

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