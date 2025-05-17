//frontend-new/src/components/seo/seo-results.tsx
"use client";

import { useState } from 'react';
import { AlertCircle, AlertTriangle, Search, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { SEOIssue, SEOUploadResponse } from '@/types/seo';
import { ContentDisplay } from './content-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface SEOResultsProps {
  results: SEOUploadResponse | null;
  isLoading?: boolean;
}

export function SeoResults({
  results,
  isLoading = false,
}: SEOResultsProps) {
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">上传HTML文件以查看SEO分析结果</p>
        </CardContent>
      </Card>
    );
  }

  const toggleIssue = (issueKey: string) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueKey]: !prev[issueKey]
    }));
  };

  // 问题类型对应的UI配置
  const issueTypeConfig = {
    issue: {
      icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      badgeVariant: "destructive" as const,
      headerClass: "bg-destructive/10 text-destructive-foreground",
      borderClass: "border-destructive/20",
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
      badgeVariant: "warning" as const,
      headerClass: "bg-warning/10 text-warning-foreground",
      borderClass: "border-warning/20",
    },
    opportunity: {
      icon: <Search className="h-5 w-5 text-info" />,
      badgeVariant: "info" as const,
      headerClass: "bg-info/10 text-info-foreground",
      borderClass: "border-info/20",
    },
  };

  // 优先级对应的Badge配置
  const priorityConfig = {
    high: { label: "高优先级", variant: "destructive" as const },
    medium: { label: "中优先级", variant: "warning" as const },
    low: { label: "低优先级", variant: "outline" as const },
  };

  const renderIssueItem = (issue: SEOIssue, index: number, type: "issue" | "warning" | "opportunity") => {
    const issueKey = `${type}-${index}`;
    const isExpanded = expandedIssues[issueKey] || false;
    const config = issueTypeConfig[type];
    const priorityBadge = priorityConfig[issue.priority];

    return (
      <div 
        key={issueKey}
        className={`mb-4 rounded-lg border ${config.borderClass} overflow-hidden`}
      >
        <div 
          className={`p-4 ${config.headerClass} flex items-center justify-between cursor-pointer`}
          onClick={() => toggleIssue(issueKey)}
        >
          <div className="flex items-center">
            <div className="mr-3">{config.icon}</div>
            <div>
              <div className="font-medium">{issue.issue}</div>
              <div className="text-sm">[{issue.category}]</div>
            </div>
          </div>
          <div className="flex items-center">
            <Badge variant={priorityBadge.variant}>{priorityBadge.label}</Badge>
            <Button variant="ghost" size="icon" className="ml-2">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 bg-card">
            <p className="mb-3 text-card-foreground">{issue.description}</p>
            
            {issue.affected_element && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-1">受影响的元素:</h4>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {issue.affected_element}
                </pre>
              </div>
            )}
            
            {issue.affected_resources && issue.affected_resources.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-1">受影响的资源:</h4>
                <ul className="bg-muted p-3 rounded-md text-xs space-y-1">
                  {issue.affected_resources.map((resource, i) => (
                    <li key={i} className="break-all">{resource}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面信息 */}
      <Card>
        <CardHeader>
          <CardTitle>页面信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <span className="font-medium w-24">文件名:</span>
            <span>{results.file_name}</span>
          </div>
          {results.page_url && (
            <div className="flex items-center">
              <span className="font-medium w-24">页面URL:</span>
              <a 
                href={results.page_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center"
              >
                {results.page_url} <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 内容展示组件 */}
      {results.extracted_content && (
        <ContentDisplay 
          content={results.extracted_content} 
          isLoading={isLoading}
        />
      )}

      {/* 统计摘要 */}
      <Card>
        <CardHeader>
          <CardTitle>SEO问题概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-destructive/10 rounded-lg border border-destructive/20 p-4 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <div className="text-xl font-bold text-destructive">{results.issues_count.issues}</div>
              <div className="text-sm text-destructive-foreground">需要修复的问题</div>
            </div>
            
            <div className="bg-warning/10 rounded-lg border border-warning/20 p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
              <div className="text-xl font-bold text-warning">{results.issues_count.warnings}</div>
              <div className="text-sm text-warning-foreground">需要检查的警告</div>
            </div>
            
            <div className="bg-info/10 rounded-lg border border-info/20 p-4 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-info" />
              <div className="text-xl font-bold text-info">{results.issues_count.opportunities}</div>
              <div className="text-sm text-info-foreground">可改进的机会</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 问题列表 */}
      {results.issues_count.issues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>需要修复的问题</CardTitle>
            <CardDescription>
              这些问题可能会严重影响您的搜索引擎排名，建议尽快修复
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.issues.issues.map((issue, index) => renderIssueItem(issue, index, "issue"))}
          </CardContent>
        </Card>
      )}

      {/* 警告列表 */}
      {results.issues_count.warnings > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>需要检查的警告</CardTitle>
            <CardDescription>
              这些警告可能影响用户体验或搜索引擎理解网页内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.issues.warnings.map((issue, index) => renderIssueItem(issue, index, "warning"))}
          </CardContent>
        </Card>
      )}

      {/* 机会列表 */}
      {results.issues_count.opportunities > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>可改进的机会</CardTitle>
            <CardDescription>
              这些优化机会可以帮助您提升网页的SEO表现
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.issues.opportunities.map((issue, index) => renderIssueItem(issue, index, "opportunity"))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}