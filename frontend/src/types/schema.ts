//frontend/src/types/schema.ts - 增强版本

// ==============================================
// 结构化数据生成器相关类型定义（保持原有）
// ==============================================

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

export interface SchemaFieldConfig {
  label: string;
  type: 'text' | 'textarea' | 'url' | 'email' | 'date' | 'datetime-local' | 'number';
  required: boolean;
  placeholder?: string;
}

export interface SchemaTypeConfig {
  name: string;
  description: string;
  required_fields: string[];
  fields: Record<string, SchemaFieldConfig>;
}

export interface SchemaTypesResponse {
  success: boolean;
  schema_types: Record<string, SchemaTypeConfig>;
}

export interface SchemaGenerateRequest {
  schema_type: SchemaType;
  data: Record<string, any>;
}

export interface SchemaGenerateResponse {
  success: boolean;
  schema_type: string;
  schema_data: Record<string, any>;
  json_ld: string;
  html_script: string;
}

export interface SchemaApiError {
  detail: string;
  schema_type?: string;
}

// ==============================================
// 新增：动态CSV字段相关类型定义
// ==============================================

// 动态CSV模板响应
export interface DynamicCSVTemplateResponse {
  success: boolean;
  schema_type: string;
  headers: string[];
  field_descriptions: Record<string, string>;
  sample_data: Record<string, string>;
  required_fields: string[];
  csv_content: string;
  error?: string;
}

// Schema字段映射配置
export interface SchemaFieldMappings {
  [schemaType: string]: {
    [fieldName: string]: string[]; // 每个字段的可能列名
  };
}

// CSV格式类型
export type CSVFormatType = 'dynamic_fields' | 'data_json';

// 增强的CSV模板信息
export interface CSVTemplateInfo {
  name: string;
  description: string;
  schemaType: string;
  headers: string[];
  sampleData: Array<Record<string, string>>;
  downloadUrl?: string;
  formatType?: CSVFormatType; // 新增：指示模板格式类型
  fieldDescriptions?: Record<string, string>; // 新增：字段描述
  requiredFields?: string[]; // 新增：必需字段列表
}

// 动态字段验证结果
export interface DynamicFieldValidationResult {
  isValid: boolean;
  schemaType: string;
  foundFields: Record<string, string>; // 实际找到的字段映射
  missingRequiredFields: string[];
  suggestions: Record<string, string[]>; // 对于缺失字段的建议列名
  warnings: string[];
}

// CSV文件检测结果
export interface CSVFormatDetectionResult {
  formatType: CSVFormatType;
  confidence: number; // 0-1，检测置信度
  detectedSchemaTypes: string[];
  hasRequiredColumns: boolean;
  suggestions: string[];
}

// ==============================================
// 增强的批量处理相关类型定义
// ==============================================

// 增强的文件统计信息
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
  schema_types: Record<string, number>;
  unique_urls: number;
  detected_format: CSVFormatType; // 新增：检测到的格式类型
}

// 增强的批量上传响应
export interface SchemaBatchUploadResponse {
  success: boolean;
  file_stats: SchemaBatchFileStats[];
  total_rows: number;
  unique_urls: number;
  schema_types: Record<string, number>;
  processing_errors: string[];
  supported_formats: CSVFormatType[]; // 新增：支持的格式列表
}

// 批量生成请求（保持不变）
export interface SchemaBatchGenerateRequest {
  url_filter?: string;
}

// 批量生成响应（保持不变）
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

// 批量导出请求（保持不变）
export interface SchemaBatchExportRequest {
  export_type: 'combined' | 'separated';
}

export interface SchemaBatchExportCombinedResponse {
  success: boolean;
  export_type: 'combined';
  data: string;
  filename: string;
}

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

export type SchemaBatchExportResponse = 
  | SchemaBatchExportCombinedResponse 
  | SchemaBatchExportSeparatedResponse;

// 批量处理摘要（保持不变）
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

// CSV数据预览响应（保持不变）
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

// 增强的批量处理状态
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
  
  // 新增：格式相关信息
  detectedFormats: CSVFormatType[];
  formatValidation: Record<string, DynamicFieldValidationResult>;
}

// 批量处理配置（增强）
export interface SchemaBatchConfig {
  maxFileSize: number;
  maxFiles: number;
  supportedTypes: string[];
  batchSize: number;
  previewLimit: number;
  supportedFormats: CSVFormatType[]; // 新增：支持的格式列表
  enableFormatDetection: boolean; // 新增：是否启用格式自动检测
}

// CSV文件验证结果（增强）
export interface CSVValidationResult {
  isValid: boolean;
  filename: string;
  errors: string[];
  warnings: string[];
  rowCount: number;
  detectedFormat: CSVFormatType; // 新增：检测到的格式
  requiredColumns: {
    url: boolean;
    schema_type: boolean;
    data_json?: boolean; // 对于传统格式
  };
  dynamicFieldValidation?: DynamicFieldValidationResult; // 新增：动态字段验证
}

// 批量导出选项（保持不变）
export interface SchemaBatchExportOptions {
  exportType: 'combined' | 'separated';
  includeHtmlScript: boolean;
  formatJson: boolean;
  filenamePrefix?: string;
}

// 批量处理步骤状态（保持不变）
export interface SchemaBatchStepStatus {
  step: 'upload' | 'validate' | 'generate' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  errors?: string[];
}

// URL过滤选项（保持不变）
export interface URLFilterOptions {
  enabled: boolean;
  pattern: string;
  caseSensitive: boolean;
  isRegex: boolean;
}

// 结构化数据类型统计（保持不变）
export interface SchemaTypeStats {
  type: string;
  count: number;
  percentage: number;
  sampleUrls: string[];
}

// 批量处理进度信息（保持不变）
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

// 批量处理错误类型（增强）
export interface SchemaBatchError {
  type: 'validation' | 'processing' | 'generation' | 'export' | 'format_detection'; // 新增format_detection
  message: string;
  details?: string;
  url?: string;
  schemaType?: string;
  row?: number;
  filename?: string;
  fieldName?: string; // 新增：字段名（用于动态字段错误）
  suggestedFieldNames?: string[]; // 新增：建议的字段名
}

// 导出文件信息（保持不变）
export interface ExportFileInfo {
  filename: string;
  url: string;
  schemaCount: number;
  schemaTypes: string[];
  fileSize: number;
  downloadUrl: string;
}

// 批量导出结果统计（保持不变）
export interface SchemaBatchExportStats {
  totalUrls: number;
  totalSchemas: number;
  exportType: 'combined' | 'separated';
  fileCount: number;
  totalSize: number;
  exportedAt: string;
  errors: SchemaBatchError[];
}

// 批量处理API错误响应（保持不变）
export interface SchemaBatchApiError {
  detail: string;
  type?: 'validation' | 'processing' | 'system';
  errors?: string[];
}

// ==============================================
// 新增：智能模板推荐相关类型
// ==============================================

// 模板推荐结果
export interface TemplateRecommendation {
  schemaType: string;
  confidence: number;
  reasons: string[];
  suggestedTemplate: CSVTemplateInfo;
  fieldMappingSuggestions: Record<string, string[]>;
}

// 智能字段映射建议
export interface FieldMappingSuggestion {
  originalFieldName: string;
  suggestedFieldName: string;
  confidence: number;
  reasoning: string;
}

// CSV分析结果
export interface CSVAnalysisResult {
  filename: string;
  detectedFormat: CSVFormatType;
  schemaTypeRecommendations: TemplateRecommendation[];
  fieldMappingSuggestions: Record<string, FieldMappingSuggestion[]>;
  qualityScore: number; // 0-1，数据质量评分
  issues: string[];
  suggestions: string[];
}

// ==============================================
// 增强的常量和配置定义
// ==============================================

// 动态字段CSV模板配置
export const DYNAMIC_FIELD_SCHEMA_TEMPLATES: CSVTemplateInfo[] = [
  {
    name: "文章模板（动态字段）",
    description: "使用分离字段格式，更易于填写和管理",
    schemaType: "Article",
    headers: ["url", "schema_type", "headline", "author", "datePublished", "description", "image", "publisher"],
    sampleData: [
      {
        url: "https://example.com/article1",
        schema_type: "Article",
        headline: "如何优化网站SEO",
        author: "张三",
        datePublished: "2024-01-15",
        description: "完整的SEO优化指南",
        image: "https://example.com/images/seo-guide.jpg",
        publisher: "技术博客"
      }
    ],
    formatType: "dynamic_fields",
    requiredFields: ["headline", "author", "datePublished"],
    fieldDescriptions: {
      url: "目标网页URL",
      schema_type: "结构化数据类型",
      headline: "文章标题（必需）",
      author: "作者姓名（必需）",
      datePublished: "发布日期（必需）",
      description: "文章描述（可选）",
      image: "文章配图URL（可选）",
      publisher: "发布机构（可选）"
    }
  },
  {
    name: "产品模板（动态字段）", 
    description: "使用分离字段格式的产品信息模板",
    schemaType: "Product",
    headers: ["url", "schema_type", "name", "description", "brand", "price", "currency"],
    sampleData: [
      {
        url: "https://example.com/product1",
        schema_type: "Product", 
        name: "无线蓝牙耳机",
        description: "高音质无线耳机",
        brand: "TechBrand",
        price: "299",
        currency: "CNY"
      }
    ],
    formatType: "dynamic_fields",
    requiredFields: ["name"],
    fieldDescriptions: {
      url: "产品页面URL",
      schema_type: "结构化数据类型",
      name: "产品名称（必需）",
      description: "产品描述（可选）",
      brand: "品牌名称（可选）",
      price: "价格（可选）",
      currency: "货币代码（可选）"
    }
  },
  {
    name: "组织模板（动态字段）",
    description: "使用分离字段格式的组织信息模板",
    schemaType: "Organization",
    headers: ["url", "schema_type", "name", "description", "logo", "telephone"],
    sampleData: [
      {
        url: "https://example.com/about",
        schema_type: "Organization",
        name: "创新科技公司",
        description: "专注AI技术的创新公司",
        logo: "https://example.com/logo.jpg",
        telephone: "+86-10-12345678"
      }
    ],
    formatType: "dynamic_fields",
    requiredFields: ["name"],
    fieldDescriptions: {
      url: "组织页面URL",
      schema_type: "结构化数据类型",
      name: "组织名称（必需）",
      description: "组织描述（可选）",
      logo: "组织LOGO URL（可选）",
      telephone: "联系电话（可选）"
    }
  },
  {
    name: "人物模板（动态字段）",
    description: "使用分离字段格式的人物信息模板",
    schemaType: "Person",
    headers: ["url", "schema_type", "name", "jobTitle", "worksFor", "description"],
    sampleData: [
      {
        url: "https://example.com/team/ceo",
        schema_type: "Person",
        name: "王五",
        jobTitle: "首席执行官",
        worksFor: "创新科技公司",
        description: "拥有15年技术管理经验"
      }
    ],
    formatType: "dynamic_fields",
    requiredFields: ["name"],
    fieldDescriptions: {
      url: "人物介绍页面URL",
      schema_type: "结构化数据类型",
      name: "姓名（必需）",
      jobTitle: "职位（可选）",
      worksFor: "工作单位（可选）",
      description: "个人描述（可选）"
    }
  },
  {
    name: "事件模板（动态字段）",
    description: "使用分离字段格式的事件信息模板",
    schemaType: "Event",
    headers: ["url", "schema_type", "name", "startDate", "location", "description"],
    sampleData: [
      {
        url: "https://example.com/events/conference-2024",
        schema_type: "Event",
        name: "2024年前端技术大会",
        startDate: "2024-06-15T09:00:00",
        location: "北京国际会议中心",
        description: "探讨最新的前端技术趋势"
      }
    ],
    formatType: "dynamic_fields",
    requiredFields: ["name", "startDate", "location"],
    fieldDescriptions: {
      url: "事件页面URL",
      schema_type: "结构化数据类型",
      name: "事件名称（必需）",
      startDate: "开始时间（必需）",
      location: "事件地点（必需）",
      description: "事件描述（可选）"
    }
  }
];

// 默认批量处理配置（增强）
export const DEFAULT_BATCH_CONFIG: SchemaBatchConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  supportedTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  batchSize: 100,
  previewLimit: 10,
  supportedFormats: ['dynamic_fields', 'data_json'], // 新增：支持的格式
  enableFormatDetection: true // 新增：启用格式检测
};

// 批量处理步骤定义（保持不变）
export const BATCH_PROCESSING_STEPS = [
  { key: 'upload', name: '上传文件', description: '上传CSV文件并验证格式' },
  { key: 'validate', name: '验证数据', description: '检查数据完整性和格式' },
  { key: 'generate', name: '生成数据', description: '批量生成结构化数据' },
  { key: 'export', name: '导出结果', description: '导出生成的结构化数据' }
] as const;

// 字段类型映射（增强）
export const FIELD_TYPE_LABELS = {
  text: '文本',
  textarea: '多行文本',
  url: '网址',
  email: '邮箱',
  date: '日期',
  'datetime-local': '日期时间',
  number: '数字'
} as const;

// 格式类型标签
export const FORMAT_TYPE_LABELS = {
  dynamic_fields: '动态字段格式',
  data_json: '传统JSON格式'
} as const;

// 格式类型描述
export const FORMAT_TYPE_DESCRIPTIONS = {
  dynamic_fields: '每个字段使用独立的列，更易于编辑和维护',
  data_json: '使用JSON格式存储所有字段，适合高级用户'
} as const;