// SEO问题类型
export type SEOIssueType = 'issue' | 'warning' | 'opportunity';

// SEO问题优先级
export type SEOIssuePriority = 'high' | 'medium' | 'low';

// 文本提取引擎类型
export type ContentExtractor = 'auto' | 'trafilatura' | 'newspaper' | 'readability' | 'goose3' | 'custom';

// 拼写错误
export interface SpellingError {
  text: string;
  offset: number;
  length: number;
  message: string;
  replacements: string[];
}

// 语法错误
export interface GrammarError {
  text: string;
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  rule_id: string;
}

// 提取的内容
export interface ExtractedContent {
  text: string;
  spelling_errors: SpellingError[];
  grammar_errors: GrammarError[];
}

// SEO问题
export interface SEOIssue {
  category: string;
  issue: string;
  description: string;
  priority: SEOIssuePriority;
  affected_element?: string;
  affected_resources?: string[];
}

// SEO上传响应
export interface SEOUploadResponse {
  file_name: string;
  page_url: string | null;
  issues_count: {
    issues: number;
    warnings: number;
    opportunities: number;
  };
  issues: {
    issues: SEOIssue[];
    warnings: SEOIssue[];
    opportunities: SEOIssue[];
  };
  extracted_content: ExtractedContent;
}

// SEO类别
export interface SEOCategory {
  id: string;
  name: string;
  description: string;
}

// 上传SEO文件参数
export interface UploadSEOFileParams {
  file: File;
  contentExtractor?: ContentExtractor;
  enableAdvancedAnalysis?: boolean;
}