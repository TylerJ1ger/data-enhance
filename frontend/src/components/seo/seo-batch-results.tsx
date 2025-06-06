//frontend-new/src/components/seo/seo-batch-results.tsx
"use client";

import { useState } from 'react';
import { 
  FileText, AlertCircle, AlertTriangle, Search, CheckCircle, 
  XCircle, Download, Eye, ChevronDown, ChevronUp, BarChart3,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { 
  SEOBatchUploadResponse, 
  SEOUploadResponse, 
  SEOBatchStats,
  SEOExportType
} from '@/types/seo';

interface SEOBatchResultsProps {
  batchResults: SEOBatchUploadResponse | null;
  detailedResults: SEOUploadResponse[];
  isLoading?: boolean;
  isExporting?: boolean;
  onExport?: (exportType: SEOExportType) => void;
  onViewDetails?: (fileIndex: number) => void;
  onClearResults?: () => void;
}

export function SeoResultsBatch({
  batchResults,
  detailedResults,
  isLoading = false,
  isExporting = false,
  onExport,
  onViewDetails,
  onClearResults
}: SEOBatchResultsProps) {
  const [expandedFile, setExpandedFile] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!batchResults) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">开始批量分析以查看结果</p>
        </CardContent>
      </Card>
    );
  }

  const stats = batchResults.batch_stats;
  const successRate = stats.total_files > 0 ? (stats.processed_files / stats.total_files) * 100 : 0;

  // 计算平均分数
  const successfulResults = detailedResults.filter(r => !r.error);
  const averageScore = successfulResults.length > 0 
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.seo_score, 0) / successfulResults.length)
    : 0;

  // 获取分数分布
  const getScoreDistribution = () => {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    successfulResults.forEach(result => {
      if (result.seo_score >= 90) distribution.excellent++;
      else if (result.seo_score >= 70) distribution.good++;
      else if (result.seo_score >= 50) distribution.fair++;
      else distribution.poor++;
    });
    return distribution;
  };

  const scoreDistribution = getScoreDistribution();

  const renderFileRow = (result: SEOUploadResponse, index: number) => {
    const isExpanded = expandedFile === index;
    const hasError = !!result.error;

    return (
      <div key={index} className="border rounded-lg mb-2">
        <div 
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExpandedFile(isExpanded ? null : index)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasError ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              
              <div className="flex-1">
                <div className="font-medium">{result.file_name}</div>
                {hasError ? (
                  <div className="text-sm text-destructive">错误: {result.error}</div>
                ) : (
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>SEO得分: {result.seo_score}</span>
                    <span>问题: {result.issues_count.issues}</span>
                    <span>警告: {result.issues_count.warnings}</span>
                    <span>机会: {result.issues_count.opportunities}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!hasError && (
                <>
                  <Badge 
                    variant={result.seo_score >= 70 ? "default" : result.seo_score >= 50 ? "secondary" : "destructive"}
                  >
                    {result.seo_score >= 70 ? "良好" : result.seo_score >= 50 ? "一般" : "需改进"}
                  </Badge>
                  
                  {result.has_critical_issues && (
                    <Badge variant="destructive">关键问题</Badge>
                  )}
                </>
              )}
              
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </div>

        {isExpanded && !hasError && (
          <div className="border-t p-4 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{result.issues_count.issues}</div>
                <div className="text-sm text-muted-foreground">问题</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.issues_count.warnings}</div>
                <div className="text-sm text-muted-foreground">警告</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.issues_count.opportunities}</div>
                <div className="text-sm text-muted-foreground">机会</div>
              </div>
            </div>

            {result.categories && result.categories.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">涉及的问题类别:</div>
                <div className="flex flex-wrap gap-1">
                  {result.categories.map((category, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {onViewDetails && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(index);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                查看详情
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 总体统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            批量分析结果概览
          </CardTitle>
          <CardDescription>
            共分析 {stats.total_files} 个文件，成功 {stats.processed_files} 个，失败 {stats.failed_files} 个
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{stats.processed_files}</div>
              <div className="text-sm text-muted-foreground">成功处理</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">{stats.failed_files}</div>
              <div className="text-sm text-muted-foreground">处理失败</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{averageScore}</div>
              <div className="text-sm text-muted-foreground">平均SEO得分</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{Math.round(successRate)}%</div>
              <div className="text-sm text-muted-foreground">成功率</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>处理进度</span>
                <span>{stats.processed_files}/{stats.total_files}</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>

            {/* 分数分布 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
              <div>
                <div className="font-bold text-green-600">{scoreDistribution.excellent}</div>
                <div className="text-muted-foreground">优秀 (90+)</div>
              </div>
              <div>
                <div className="font-bold text-blue-600">{scoreDistribution.good}</div>
                <div className="text-muted-foreground">良好 (70-89)</div>
              </div>
              <div>
                <div className="font-bold text-yellow-600">{scoreDistribution.fair}</div>
                <div className="text-muted-foreground">一般 (50-69)</div>
              </div>
              <div>
                <div className="font-bold text-destructive">{scoreDistribution.poor}</div>
                <div className="text-muted-foreground">需改进 (50)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={() => onExport?.('summary')}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          导出摘要报告
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => onExport?.('detailed')}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          导出详细报告
        </Button>

        {onClearResults && (
          <Button 
            variant="destructive" 
            onClick={onClearResults}
            disabled={isExporting}
          >
            清除结果
          </Button>
        )}
      </div>

      {/* 详细结果 */}
      <Card>
        <CardHeader>
          <CardTitle>详细分析结果</CardTitle>
          <CardDescription>
            点击文件行查看详细信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">汇总视图</TabsTrigger>
              <TabsTrigger value="detailed">详细列表</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <div className="space-y-4">
                {/* 问题汇总 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-destructive mr-3" />
                        <div>
                          <div className="text-2xl font-bold">{stats.total_issues}</div>
                          <div className="text-sm text-muted-foreground">总问题数</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold">{stats.total_warnings}</div>
                          <div className="text-sm text-muted-foreground">总警告数</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold">{stats.total_opportunities}</div>
                          <div className="text-sm text-muted-foreground">总机会数</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 分析摘要 */}
                {batchResults.analysis_summary && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>分析摘要</AlertTitle>
                    <AlertDescription>
                      {batchResults.analysis_summary.message ? (
                        <p>{batchResults.analysis_summary.message}</p>
                      ) : (
                        <div className="space-y-2">
                          {batchResults.analysis_summary.avg_seo_score !== undefined && (
                            <p>平均SEO得分: {batchResults.analysis_summary.avg_seo_score}</p>
                          )}
                          {batchResults.analysis_summary.files_with_critical_issues !== undefined && (
                            <p>有关键问题的文件: {batchResults.analysis_summary.files_with_critical_issues} 个</p>
                          )}
                          {batchResults.analysis_summary.top_issue_categories && (
                            <div>
                              <p>主要问题类别:</p>
                              <ul className="ml-4 list-disc">
                                {batchResults.analysis_summary.top_issue_categories.map((cat, idx) => (
                                  <li key={idx}>{cat.category}: {cat.count} 次</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="mt-4">
              <div className="space-y-2">
                {detailedResults.map((result, index) => renderFileRow(result, index))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}