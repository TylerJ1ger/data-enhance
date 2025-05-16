//frontend-new/src/types/seo.ts

// SEO问题类型
export type SEOIssueType = 'issue' | 'warning' | 'opportunity';

// SEO问题优先级
export type SEOIssuePriority = 'high' | 'medium' | 'low';

// 文本提取引擎类型
export type ContentExtractor = 
  | 'auto' 
  | 'trafilatura' 
  | 'newspaper' 
  | 'readability' 
  | 'goose3' 
  | 'custom';

/**
 * 拼写错误结构
 */
export interface SpellingError {
  text: string;           // 包含错误的文本
  offset: number;         // 错误在文本中的偏移量
  length: number;         // 错误文本的长度
  message: string;        // 错误描述
  replacements: string[]; // 建议替换的文本
}

/**
 * 语法错误结构
 */
export interface GrammarError {
  text: string;           // 包含错误的文本
  offset: number;         // 错误在文本中的偏移量
  length: number;         // 错误文本的长度
  message: string;        // 错误描述
  replacements: string[]; // 建议替换的文本
  rule_id: string;        // 语法规则ID
}

/**
 * 提取的内容结构
 */
export interface ExtractedContent {
  text: string;                   // 提取的文本内容
  spelling_errors: SpellingError[]; // 拼写错误列表
  grammar_errors: GrammarError[];   // 语法错误列表
  word_count?: number;            // 字数统计
  character_count?: number;       // 字符数统计
  readability_score?: number;     // 可读性评分
}

/**
 * SEO问题结构
 */
export interface SEOIssue {
  category: string;               // 问题类别
  issue: string;                  // 问题标题
  description: string;            // 问题描述
  priority: SEOIssuePriority;     // 问题优先级
  affected_element?: string;      // 受影响的元素
  affected_resources?: string[];  // 受影响的资源
  recommendation?: string;        // 解决建议
}

/**
 * SEO问题分组
 */
export interface SEOIssueGroups {
  issues: SEOIssue[];       // 严重问题
  warnings: SEOIssue[];     // 警告
  opportunities: SEOIssue[]; // 优化机会
}

/**
 * SEO分析结果统计
 */
export interface SEOIssueCount {
  issues: number;       // 严重问题数量
  warnings: number;     // 警告数量
  opportunities: number; // 优化机会数量
}

/**
 * SEO上传响应
 */
export interface SEOUploadResponse {
  file_name: string;                // 文件名
  page_url: string | null;          // 页面URL
  issues_count: SEOIssueCount;      // 问题数量统计
  issues: SEOIssueGroups;           // 问题分组
  extracted_content: ExtractedContent; // 提取的内容
  metadata?: SEOPageMetadata;       // 页面元数据
}

/**
 * SEO页面元数据
 */
export interface SEOPageMetadata {
  title?: string;                  // 页面标题
  meta_description?: string;       // 元描述
  canonical_url?: string;          // 规范URL
  h1_count?: number;               // H1标签数量
  image_count?: number;            // 图片数量
  internal_links_count?: number;   // 内部链接数量
  external_links_count?: number;   // 外部链接数量
  word_count?: number;             // 总字数
  page_size?: number;              // 页面大小(字节)
  load_time?: number;              // 加载时间(毫秒)
}

/**
 * SEO类别
 */
export interface SEOCategory {
  id: string;           // 类别ID
  name: string;         // 类别名称
  description: string;  // 类别描述
  icon?: string;        // 类别图标
}

/**
 * 上传SEO文件参数
 */
export interface UploadSEOFileParams {
  file: File;                               // 上传的文件
  contentExtractor?: ContentExtractor;      // 内容提取器
  enableAdvancedAnalysis?: boolean;         // 是否启用高级分析
}

/**
 * 筛选SEO问题请求
 */
export interface FilterSEOIssuesRequest {
  category?: string;            // 按类别筛选
  priority?: SEOIssuePriority;  // 按优先级筛选
  type?: SEOIssueType;          // 按类型筛选
  search_term?: string;         // 搜索词
}

/**
 * SEO问题筛选结果
 */
export interface FilteredSEOIssues {
  filtered_issues: SEOIssueGroups;       // 筛选后的问题
  filtered_count: SEOIssueCount;         // 筛选后的问题数量
  filter_applied: FilterSEOIssuesRequest; // 应用的筛选条件
}

/**
 * SEO分析状态
 */
export type SEOAnalysisStatus = 
  | 'idle'         // 空闲状态
  | 'uploading'    // 上传中
  | 'analyzing'    // 分析中
  | 'filtering'    // 筛选中
  | 'completed'    // 完成
  | 'error';       // 错误

/**
 * SEO分析错误
 */
export interface SEOAnalysisError {
  message: string;      // 错误消息
  code?: string;        // 错误代码
  details?: unknown;    // 错误详情
}