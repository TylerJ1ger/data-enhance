// SEO问题类型
export type SEOIssueType = 'issue' | 'warning' | 'opportunity';

// SEO问题优先级
export type SEOIssuePriority = 'high' | 'medium' | 'low';

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
}

// SEO类别
export interface SEOCategory {
  id: string;
  name: string;
  description: string;
}