//frontend/src/types/schema.ts

// ==============================================
// 结构化数据生成器相关类型定义
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

// 结构化数据字段配置
export interface SchemaFieldConfig {
  label: string;
  type: 'text' | 'textarea' | 'url' | 'email' | 'date' | 'datetime-local' | 'number';
  required: boolean;
  placeholder?: string;
}

// 结构化数据类型配置信息
export interface SchemaTypeConfig {
  name: string;
  description: string;
  required_fields: string[];
  fields: Record<string, SchemaFieldConfig>;
}

// 支持的结构化数据类型响应
export interface SchemaTypesResponse {
  success: boolean;
  schema_types: Record<string, SchemaTypeConfig>;
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
}

// 结构化数据API错误响应
export interface SchemaApiError {
  detail: string;
  schema_type?: string;
}

// ==============================================
// 结构化数据批量处理相关类型定义
// ==============================================

// CSV文件统计信息
export interface SchemaBatchFileStats {
  filename: string;
  stats: {
    total_rows: number;
    keyword_count: number;
    unique_keywords: number;
    brands: string[];
    min_values: Record<string, number>;
    max_values: Record<string, number>;
  };
  schema_types: Record<string, number>; // 每种类型的数量
  unique_urls: number;
}

// 批量上传响应
export interface SchemaBatchUploadResponse {
  success: boolean;
  file_stats: SchemaBatchFileStats[];
  total_rows: number;
  unique_urls: number;
  schema_types: Record<string, number>;
  processing_errors: string[];
}

// 批量生成请求
export interface SchemaBatchGenerateRequest {
  url_filter?: string; // 可选的URL过滤器
}

// 批量生成响应
export interface SchemaBatchGenerateResponse {
  success: boolean;
  total_processed: number;
  unique_urls: number;
  generation_errors: string[];
  preview: Record<string, {
    schema_count: number;
    types: string[];
  }>;
}

// 批量导出请求
export interface SchemaBatchExportRequest {
  export_type: 'combined' | 'separated';
}

// 批量导出响应 - 合并导出
export interface SchemaBatchExportCombinedResponse {
  success: boolean;
  export_type: 'combined';
  data: string; // JSON字符串
  filename: string;
}

// 批量导出响应 - 分离导出
export interface SchemaBatchExportSeparatedResponse {
  success: boolean;
  export_type: 'separated';
  data: Record<string, {
    url: string;
    schema_count: number;
    json_ld: string;
    html_script: string;
  }>;
  total_files: number;
}

// 批量导出响应联合类型
export type SchemaBatchExportResponse = 
  | SchemaBatchExportCombinedResponse 
  | SchemaBatchExportSeparatedResponse;

// 批量处理摘要
export interface SchemaBatchSummary {
  success: boolean;
  summary: {
    has_batch_data: boolean;
    total_rows: number;
    unique_urls: number;
    schema_types: Record<string, number>;
    processed_urls: number;
    files_processed: number;
    has_errors: boolean;
    error_count: number;
  };
}

// CSV数据预览响应
export interface SchemaBatchPreviewResponse {
  success: boolean;
  preview?: Array<{
    url: string;
    schema_type: string;
    data_json: string;
  }>;
  total_rows?: number;
  showing?: number;
  message?: string;
}

// 批量处理状态
export interface SchemaBatchState {
  // 上传状态
  isUploading: boolean;
  uploadProgress: number;
  
  // 生成状态  
  isGenerating: boolean;
  generateProgress: number;
  
  // 导出状态
  isExporting: boolean;
  
  // 数据状态
  hasUploadedData: boolean;
  hasGeneratedData: boolean;
  
  // 统计信息
  uploadStats: SchemaBatchUploadResponse | null;
  generateStats: SchemaBatchGenerateResponse | null;
  summary: SchemaBatchSummary['summary'] | null;
  
  // 预览数据
  previewData: SchemaBatchPreviewResponse | null;
  
  // 错误状态
  lastError: string | null;
  processingErrors: string[];
}

// 批量处理配置
export interface SchemaBatchConfig {
  maxFileSize: number; // 最大文件大小（字节）
  maxFiles: number; // 最大文件数量
  supportedTypes: string[]; // 支持的文件类型
  batchSize: number; // 批处理大小
  previewLimit: number; // 预览数据限制
}

// CSV文件验证结果
export interface CSVValidationResult {
  isValid: boolean;
  filename: string;
  errors: string[];
  warnings: string[];
  rowCount: number;
  requiredColumns: {
    url: boolean;
    schema_type: boolean;
    data_json: boolean;
  };
}

// 批量导出选项
export interface SchemaBatchExportOptions {
  exportType: 'combined' | 'separated';
  includeHtmlScript: boolean;
  formatJson: boolean;
  filenamePrefix?: string;
}

// 批量处理步骤状态
export interface SchemaBatchStepStatus {
  step: 'upload' | 'validate' | 'generate' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  errors?: string[];
}

// URL过滤选项
export interface URLFilterOptions {
  enabled: boolean;
  pattern: string;
  caseSensitive: boolean;
  isRegex: boolean;
}

// 结构化数据类型统计
export interface SchemaTypeStats {
  type: string;
  count: number;
  percentage: number;
  sampleUrls: string[];
}

// 批量处理进度信息
export interface SchemaBatchProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepProgress: number;
  overallProgress: number;
  estimatedTimeRemaining?: number;
  processedItems: number;
  totalItems: number;
}

// 批量处理错误类型
export interface SchemaBatchError {
  type: 'validation' | 'processing' | 'generation' | 'export';
  message: string;
  details?: string;
  url?: string;
  schemaType?: string;
  row?: number;
  filename?: string;
}

// 导出文件信息
export interface ExportFileInfo {
  filename: string;
  url: string;
  schemaCount: number;
  schemaTypes: string[];
  fileSize: number;
  downloadUrl: string;
}

// 批量导出结果统计
export interface SchemaBatchExportStats {
  totalUrls: number;
  totalSchemas: number;
  exportType: 'combined' | 'separated';
  fileCount: number;
  totalSize: number;
  exportedAt: string;
  errors: SchemaBatchError[];
}

// CSV模板信息
export interface CSVTemplateInfo {
  name: string;
  description: string;
  schemaType: string;
  headers: string[];
  sampleData: Array<Record<string, string>>;
  downloadUrl?: string;
}

// 批量处理API错误响应
export interface SchemaBatchApiError {
  detail: string;
  type?: 'validation' | 'processing' | 'system';
  errors?: string[];
}

// ==============================================
// 常量和配置定义
// ==============================================

// 常用的结构化数据类型模板
export const SCHEMA_CSV_TEMPLATES: CSVTemplateInfo[] = [
  {
    name: "文章模板",
    description: "适用于博客文章、新闻文章等内容",
    schemaType: "Article",
    headers: ["url", "schema_type", "data_json"],
    sampleData: [
      {
        url: "https://example.com/article1",
        schema_type: "Article",
        data_json: JSON.stringify({
          headline: "如何优化网站SEO",
          author: "张三",
          datePublished: "2024-01-15",
          description: "完整的SEO优化指南"
        })
      }
    ]
  },
  {
    name: "产品模板", 
    description: "适用于电商产品、服务产品等",
    schemaType: "Product",
    headers: ["url", "schema_type", "data_json"],
    sampleData: [
      {
        url: "https://example.com/product1",
        schema_type: "Product", 
        data_json: JSON.stringify({
          name: "无线蓝牙耳机",
          description: "高音质无线耳机",
          brand: "TechBrand",
          price: "299",
          currency: "CNY"
        })
      }
    ]
  },
  {
    name: "组织模板",
    description: "适用于公司、机构等组织信息",
    schemaType: "Organization",
    headers: ["url", "schema_type", "data_json"],
    sampleData: [
      {
        url: "https://example.com/about",
        schema_type: "Organization",
        data_json: JSON.stringify({
          name: "创新科技公司",
          url: "https://example.com",
          description: "专注AI技术的创新公司"
        })
      }
    ]
  },
  {
    name: "人物模板",
    description: "适用于团队成员、专家介绍等",
    schemaType: "Person",
    headers: ["url", "schema_type", "data_json"],
    sampleData: [
      {
        url: "https://example.com/team/ceo",
        schema_type: "Person",
        data_json: JSON.stringify({
          name: "王五",
          jobTitle: "首席执行官",
          worksFor: "创新科技公司",
          description: "拥有15年技术管理经验"
        })
      }
    ]
  },
  {
    name: "事件模板",
    description: "适用于会议、活动、演出等事件",
    schemaType: "Event",
    headers: ["url", "schema_type", "data_json"],
    sampleData: [
      {
        url: "https://example.com/events/conference-2024",
        schema_type: "Event",
        data_json: JSON.stringify({
          name: "2024年前端技术大会",
          startDate: "2024-06-15T09:00:00",
          location: "北京国际会议中心",
          description: "探讨最新的前端技术趋势"
        })
      }
    ]
  }
];

// 默认批量处理配置
export const DEFAULT_BATCH_CONFIG: SchemaBatchConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  supportedTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  batchSize: 100,
  previewLimit: 10
};

// 批量处理步骤定义
export const BATCH_PROCESSING_STEPS = [
  { key: 'upload', name: '上传文件', description: '上传CSV文件并验证格式' },
  { key: 'validate', name: '验证数据', description: '检查数据完整性和格式' },
  { key: 'generate', name: '生成数据', description: '批量生成结构化数据' },
  { key: 'export', name: '导出结果', description: '导出生成的结构化数据' }
] as const;