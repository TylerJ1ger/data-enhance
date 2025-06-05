//frontend-new/src/types/seo.ts

// SEO问题类型
export type SEOIssueType = 'issues' | 'warnings' | 'opportunities';

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
 * HTML结构元素
 */
export interface StructureElement {
  type: string;        // 元素类型，如 h1, h2, strong, emphasis 等
  text: string;        // 元素文本内容
  start: number;       // 在纯文本中的起始位置
  end: number;         // 在纯文本中的结束位置
}

/**
 * 提取的内容结构
 */
export interface ExtractedContent {
  text: string;                     // 提取的文本内容
  spelling_errors: SpellingError[]; // 拼写错误列表
  grammar_errors: GrammarError[];   // 语法错误列表
  title: string;                    // 页面标题
  description: string;              // 页面描述
  structure: StructureElement[];    // 结构化内容元素
  word_count?: number;              // 字数统计（可选）
  character_count?: number;         // 字符数统计（可选）
  readability_score?: number;       // 可读性评分（可选）
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
  issue_type?: SEOIssueType;      // 问题类型（可选，用于内部分类）
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
 * SEO页面元数据
 */
export interface SEOPageMetadata {
  title?: string;                  // 页面标题
  meta_description?: string;       // 元描述
  canonical_url?: string;          // 规范URL
  h1_count?: number;               // H1标签数量
  h2_count?: number;               // H2标签数量
  h3_count?: number;               // H3标签数量
  image_count?: number;            // 图片数量
  internal_links_count?: number;   // 内部链接数量
  external_links_count?: number;   // 外部链接数量
  word_count?: number;             // 总字数
  page_size?: number;              // 页面大小(字节)
  load_time?: number;              // 加载时间(毫秒)
  structure_elements_count?: number; // 结构元素数量
}

/**
 * SEO上传响应（单文件）
 */
export interface SEOUploadResponse {
  file_name: string;                // 文件名
  page_url: string | null;          // 页面URL
  seo_score: number;                // SEO得分
  issues_count: SEOIssueCount;      // 问题数量统计
  issues: SEOIssueGroups;           // 问题分组
  extracted_content: ExtractedContent; // 提取的内容
  categories: string[];             // 问题类别列表
  high_priority_issues: SEOIssue[]; // 高优先级问题
  has_critical_issues: boolean;     // 是否有关键问题
  metadata?: SEOPageMetadata;       // 页面元数据（可选）
  analysis_time?: number;           // 分析耗时（毫秒）
  extractor_used?: ContentExtractor; // 实际使用的提取器
  error?: string;                   // 错误信息（如果有）
}

/**
 * 批量SEO分析文件统计
 */
export interface SEOFileStats {
  filename: string;                 // 文件名
  status: 'success' | 'error';      // 处理状态
  seo_score?: number;               // SEO得分
  issues_count: SEOIssueCount;      // 问题数量统计
  has_critical_issues?: boolean;    // 是否有关键问题
  error?: string;                   // 错误信息（如果有）
}

/**
 * 批量SEO分析统计信息
 */
export interface SEOBatchStats {
  total_files: number;              // 总文件数
  processed_files: number;          // 成功处理的文件数
  failed_files: number;             // 失败的文件数
  total_issues: number;             // 总问题数
  total_warnings: number;           // 总警告数
  total_opportunities: number;      // 总机会数
}

/**
 * 批量分析摘要
 */
export interface SEOBatchAnalysisSummary {
  avg_seo_score?: number;           // 平均SEO得分
  files_with_critical_issues?: number; // 有关键问题的文件数
  top_issue_categories?: Array<{    // 最常见的问题类别
    category: string;
    count: number;
  }>;
  total_unique_issues?: number;     // 总的唯一问题数
  message?: string;                 // 摘要信息
}

/**
 * 批量SEO分析响应
 */
export interface SEOBatchUploadResponse {
  success: boolean;                 // 是否成功
  message: string;                  // 响应消息
  file_stats: SEOFileStats[];       // 文件处理统计
  batch_stats: SEOBatchStats;       // 批量处理统计
  total_files: number;              // 总文件数
  successful_files: number;         // 成功处理的文件数
  failed_files: number;             // 失败的文件数
  analysis_summary: SEOBatchAnalysisSummary; // 分析摘要
  processing_timeout?: number;      // 处理超时时间
}

/**
 * 批量SEO结果响应
 */
export interface SEOBatchResultsResponse {
  success: boolean;                 // 是否成功
  results: SEOUploadResponse[];     // 详细分析结果列表
  stats: SEOBatchStats;             // 统计信息
  total_results: number;            // 结果总数
}

/**
 * SEO类别
 */
export interface SEOCategory {
  id: string;           // 类别ID
  name: string;         // 类别名称
  description: string;  // 类别描述
  icon?: string;        // 类别图标
  color?: string;       // 类别颜色
}

/**
 * SEO类别响应
 */
export interface SEOCategoriesResponse {
  categories: SEOCategory[];
}

/**
 * 上传SEO文件参数（单文件）
 */
export interface UploadSEOFileParams {
  file: File;                               // 上传的文件
  contentExtractor?: ContentExtractor;      // 内容提取器
  enableAdvancedAnalysis?: boolean;         // 是否启用高级分析
}

/**
 * 批量上传SEO文件参数
 */
export interface BatchUploadSEOFilesParams {
  files: File[];                            // 上传的文件列表
  contentExtractor?: ContentExtractor;      // 内容提取器
  enableAdvancedAnalysis?: boolean;         // 是否启用高级分析
}

/**
 * SEO导出请求类型
 */
export type SEOExportType = 'summary' | 'detailed';

/**
 * SEO导出请求
 */
export interface SEOExportRequest {
  export_type: SEOExportType;
}

/**
 * 筛选SEO问题请求
 */
export interface FilterSEOIssuesRequest {
  category?: string;            // 按类别筛选
  priority?: SEOIssuePriority;  // 按优先级筛选
  type?: SEOIssueType;          // 按类型筛选
  search_term?: string;         // 搜索词
  limit?: number;               // 结果限制数量
  offset?: number;              // 分页偏移量
}

/**
 * SEO问题筛选结果
 */
export interface FilteredSEOIssues {
  filtered_issues: SEOIssueGroups;       // 筛选后的问题
  filtered_count: SEOIssueCount;         // 筛选后的问题数量
  filter_applied: FilterSEOIssuesRequest; // 应用的筛选条件
  total_count: SEOIssueCount;            // 总问题数量
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
  timestamp?: number;   // 错误时间戳
}

/**
 * SEO分析配置
 */
export interface SEOAnalysisConfig {
  contentExtractor: ContentExtractor;     // 内容提取器
  enableAdvancedAnalysis: boolean;        // 是否启用高级分析
  maxFileSize?: number;                   // 最大文件大小（字节）
  timeout?: number;                       // 分析超时时间（毫秒）
  batchMode?: boolean;                    // 是否批量模式
}

/**
 * SEO分析进度
 */
export interface SEOAnalysisProgress {
  stage: string;                          // 当前阶段
  progress: number;                       // 进度百分比 (0-100)
  message?: string;                       // 进度消息
  eta?: number;                          // 预计剩余时间（毫秒）
  current_file?: string;                  // 当前处理的文件（批量模式）
  processed_files?: number;               // 已处理文件数（批量模式）
  total_files?: number;                   // 总文件数（批量模式）
}

/**
 * SEO分析会话
 */
export interface SEOAnalysisSession {
  id: string;                            // 会话ID
  fileName: string;                      // 文件名（单文件）或描述（多文件）
  status: SEOAnalysisStatus;             // 分析状态
  config: SEOAnalysisConfig;             // 分析配置
  progress?: SEOAnalysisProgress;        // 分析进度
  result?: SEOUploadResponse | SEOBatchUploadResponse;  // 分析结果
  error?: SEOAnalysisError;              // 错误信息
  startTime: number;                     // 开始时间戳
  endTime?: number;                      // 结束时间戳
  isBatch?: boolean;                     // 是否批量分析
}

/**
 * SEO报告导出格式
 */
export type SEOReportFormat = 'pdf' | 'html' | 'json' | 'csv';

/**
 * SEO报告导出请求
 */
export interface SEOReportExportRequest {
  format: SEOReportFormat;               // 导出格式
  includeContent?: boolean;              // 是否包含内容
  includeStructure?: boolean;            // 是否包含结构信息
  includeErrors?: boolean;               // 是否包含错误信息
  categories?: string[];                 // 包含的类别
  priorities?: SEOIssuePriority[];       // 包含的优先级
}

/**
 * 内容高亮选项
 */
export interface ContentHighlightOptions {
  highlightStructure: boolean;           // 是否高亮结构元素
  highlightErrors: boolean;              // 是否高亮错误
  showTooltips: boolean;                 // 是否显示提示信息
  maxErrorsToShow?: number;              // 最大错误显示数量
}

/**
 * SEO建议
 */
export interface SEORecommendation {
  id: string;                            // 建议ID
  category: string;                      // 所属类别
  title: string;                         // 建议标题
  description: string;                   // 建议描述
  priority: SEOIssuePriority;            // 建议优先级
  effort: 'low' | 'medium' | 'high';     // 实施难度
  impact: 'low' | 'medium' | 'high';     // 预期影响
  resources?: string[];                  // 相关资源链接
}

/**
 * SEO性能分数
 */
export interface SEOPerformanceScore {
  overall: number;                       // 总体得分 (0-100)
  technical: number;                     // 技术得分
  content: number;                       // 内容得分
  accessibility: number;                 // 无障碍得分
  mobile: number;                        // 移动端得分
  recommendations: SEORecommendation[];  // 改进建议
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: string;                        // 服务状态
  service: string;                       // 服务名称
  timestamp: number;                     // 时间戳
  version?: string;                      // 版本信息
}

/**
 * 批量分析模式设置
 */
export interface SEOBatchModeConfig {
  enabled: boolean;                      // 是否启用批量模式
  maxFiles: number;                      // 最大文件数限制
  concurrentLimit: number;               // 并发处理限制
  timeoutPerFile: number;                // 每文件超时时间（秒）
}

/**
 * SEO分析统计摘要（用于仪表板展示）
 */
export interface SEOAnalysisStatsSummary {
  mode: 'single' | 'batch';              // 分析模式
  totalAnalyzed: number;                 // 总分析数量
  averageScore: number;                  // 平均得分
  highPriorityIssues: number;            // 高优先级问题数
  lastAnalysisDate?: Date;               // 最后分析日期
  topIssueCategory?: string;             // 最主要问题类别
}

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  valid: boolean;                        // 是否有效
  error?: string;                        // 错误信息
  warnings?: string[];                   // 警告信息
}

/**
 * 批量文件验证结果
 */
export interface BatchFileValidationResult {
  valid: boolean;                        // 整体是否有效
  errors: string[];                      // 错误列表
  validFiles: File[];                    // 有效文件列表
  invalidFiles: File[];                  // 无效文件列表
  warnings?: string[];                   // 警告信息
}

// 导出所有类型的联合类型，便于类型检查
export type SEOTypes = 
  | SEOIssue
  | SEOIssueGroups
  | SEOUploadResponse
  | SEOBatchUploadResponse
  | ExtractedContent
  | StructureElement
  | SpellingError
  | GrammarError
  | SEOCategory
  | SEOAnalysisSession
  | SEORecommendation
  | SEOPerformanceScore
  | SEOFileStats
  | SEOBatchStats
  | SEOBatchAnalysisSummary;