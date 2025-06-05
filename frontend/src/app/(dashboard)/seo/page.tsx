//frontend-new/src/app/(dashboard)/seo/page.tsx
"use client";

import { useState } from 'react';
import { 
  Upload,
  RefreshCw,
  FileText,
  AlertCircle,
  AlertTriangle,
  Search,
  Users,
  Download
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSeoApi } from "@/hooks/use-seo-api";

// 导入SEO组件
import { SeoUploader } from "@/components/seo/seo-uploader";
import { SeoResults } from "@/components/seo/seo-results";
import { SeoResultsBatch } from "@/components/seo/seo-batch-results";
import { SeoFilter } from "@/components/seo/seo-filter";

export default function SeoPage() {
  const [showUpload, setShowUpload] = useState(true);
  const [analysisMode, setAnalysisMode] = useState<'single' | 'batch'>('single');
  
  const {
    // 状态
    isUploading,
    isBatchUploading,
    isLoadingCategories,
    isLoadingBatchResults,
    isExporting,
    
    // 单文件分析数据
    analysisResults,
    categories,
    selectedCategory,
    filteredIssues,
    
    // 批量分析数据
    batchResults,
    batchAnalysisResults,
    batchStats,
    isBatchMode,
    
    // 高级选项
    contentExtractor,
    setContentExtractor,
    enableAdvancedAnalysis,
    setEnableAdvancedAnalysis,
    
    // 操作方法
    uploadSEOFile,
    batchUploadSEOFiles,
    setSelectedCategory,
    fetchBatchResults,
    exportBatchResults,
    clearBatchResults,
    resetData,
    switchMode,
    getBatchSummary
  } = useSeoApi();

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    try {
      await uploadSEOFile(file);
      setShowUpload(false);
    } catch (error) {
      console.error('Error analyzing file:', error);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    try {
      await batchUploadSEOFiles(files);
      setShowUpload(false);
    } catch (error) {
      console.error('Error analyzing files:', error);
    }
  };

  const handleModeChange = (mode: 'single' | 'batch') => {
    setAnalysisMode(mode);
    switchMode(mode);
    setShowUpload(true);
  };

  const handleReset = () => {
    resetData();
    setShowUpload(true);
  };

  const handleExport = async (exportType: 'summary' | 'detailed') => {
    try {
      await exportBatchResults(exportType);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const hasData = isBatchMode ? !!batchResults : !!analysisResults;
  const isProcessing = isBatchMode ? isBatchUploading : isUploading;
  const batchSummary = getBatchSummary();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">SEO分析工具</h1>
        {/* 添加v1 API指示 */}
        <div className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded">
          API v1
        </div>
      </div>
      <Separator />

      {/* 操作栏 */}
      {hasData && (
        <div className="flex flex-wrap gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => setShowUpload(true)}
              disabled={isProcessing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isBatchMode ? '上传新文件批次' : '上传新文件'}
            </Button>
            
            {isBatchMode && batchResults && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleExport('summary')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出摘要报告
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleExport('detailed')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出详细报告
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {isBatchMode && (
              <Button
                variant="outline"
                onClick={clearBatchResults}
                disabled={isProcessing || isExporting}
              >
                清除批量结果
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isProcessing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重置分析数据
            </Button>
          </div>
        </div>
      )}

      {/* 文件上传区域 */}
      {(showUpload || !hasData) && (
        <Card>
          <CardHeader>
            <CardTitle>HTML文件SEO分析</CardTitle>
            <CardDescription>
              选择单文件分析进行详细检查，或批量分析多个文件。我们将对HTML文件进行全面的SEO分析，
              包括标题、元描述、内容、图片、链接等多个方面，并提供详细的改进建议。
              <span className="block text-xs text-muted-foreground mt-1">
                正在使用API v1 - 支持单文件和批量分析
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeoUploader
              onFileSelected={handleFileSelected}
              onFilesSelected={handleFilesSelected}
              disabled={isProcessing}
              contentExtractor={contentExtractor}
              setContentExtractor={setContentExtractor}
              enableAdvancedAnalysis={enableAdvancedAnalysis}
              setEnableAdvancedAnalysis={setEnableAdvancedAnalysis}
              mode={analysisMode}
              onModeChange={handleModeChange}
            />
          </CardContent>
        </Card>
      )}

      {/* 处理中状态 */}
      {isProcessing && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isBatchMode ? '批量分析进行中...' : '分析进行中...'}
          </AlertTitle>
          <AlertDescription>
            {isBatchMode ? (
              <>
                正在分析多个HTML文件，这可能需要几分钟时间。请耐心等待，不要关闭页面。
                {batchResults && (
                  <div className="mt-2">
                    预计剩余时间: 约 {Math.max(1, Math.ceil((batchStats?.total_files || 0) * 30 / 60))} 分钟
                  </div>
                )}
              </>
            ) : (
              '正在分析HTML文件的SEO问题，通常需要10-30秒时间。'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 主面板 */}
      {hasData && !isProcessing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧面板 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 分析模式指示器 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {isBatchMode ? (
                    <Users className="mr-2 h-5 w-5" />
                  ) : (
                    <FileText className="mr-2 h-5 w-5" />
                  )}
                  {isBatchMode ? '批量分析模式' : '单文件分析模式'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isBatchMode ? (
                  <div className="space-y-2">
                    {batchSummary ? (
                      <>
                        <div className="text-sm">
                          <strong>分析概览:</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>文件总数: {batchSummary.totalFiles}</div>
                          <div>成功处理: {batchSummary.successfulFiles}</div>
                          <div>处理失败: {batchSummary.failedFiles}</div>
                          <div>平均得分: {batchSummary.averageScore}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          总计发现 {batchSummary.totalIssues + batchSummary.totalWarnings + batchSummary.totalOpportunities} 个SEO相关问题
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        正在加载批量分析数据...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>分析文件:</strong> {analysisResults?.file_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      详细的单页面SEO分析结果
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 单文件模式显示筛选器 */}
            {!isBatchMode && (
              <SeoFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                isLoading={isLoadingCategories}
                disabled={isUploading}
              />
            )}
            
            {/* SEO信息卡片 */}
            <Card>
              <CardHeader>
                <CardTitle>SEO分析概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isBatchMode ? (
                  // 批量模式信息
                  <>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="text-primary mr-2 h-4 w-4" />
                          <span className="text-sm font-medium">批量分析</span>
                        </div>
                        <span className="text-sm">
                          {batchSummary?.totalFiles || 0} 个文件
                        </span>
                      </div>
                    </div>
                    
                    {batchSummary && (
                      <div className="bg-muted rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-2">问题总数</h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-destructive/10 p-2 rounded">
                            <span className="text-destructive font-bold block">
                              {batchSummary.totalIssues}
                            </span>
                            <span className="text-xs text-destructive">问题</span>
                          </div>
                          <div className="bg-yellow-100 p-2 rounded">
                            <span className="text-yellow-700 font-bold block">
                              {batchSummary.totalWarnings}
                            </span>
                            <span className="text-xs text-yellow-700">警告</span>
                          </div>
                          <div className="bg-blue-100 p-2 rounded">
                            <span className="text-blue-700 font-bold block">
                              {batchSummary.totalOpportunities}
                            </span>
                            <span className="text-xs text-blue-700">机会</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // 单文件模式信息
                  <>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="text-primary mr-2 h-4 w-4" />
                          <span className="text-sm font-medium">分析的文件</span>
                        </div>
                        <span className="text-sm">
                          {analysisResults?.file_name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">问题总数</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-destructive/10 p-2 rounded">
                          <span className="text-destructive font-bold block">
                            {analysisResults?.issues_count.issues || 0}
                          </span>
                          <span className="text-xs text-destructive">问题</span>
                        </div>
                        <div className="bg-yellow-100 p-2 rounded">
                          <span className="text-yellow-700 font-bold block">
                            {analysisResults?.issues_count.warnings || 0}
                          </span>
                          <span className="text-xs text-yellow-700">警告</span>
                        </div>
                        <div className="bg-blue-100 p-2 rounded">
                          <span className="text-blue-700 font-bold block">
                            {analysisResults?.issues_count.opportunities || 0}
                          </span>
                          <span className="text-xs text-blue-700">机会</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* 分析选项信息 */}
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">分析选项</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">内容提取引擎:</span>
                      <Badge variant="outline">
                        {contentExtractor === 'auto' ? '自动选择' : contentExtractor}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">高级内容分析:</span>
                      <Badge variant={enableAdvancedAnalysis ? "default" : "secondary"}>
                        {enableAdvancedAnalysis ? '已启用' : '已禁用'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 text-blue-800 rounded-md text-sm flex items-start">
                  <Search className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    SEO分析基于200多项检查点进行评估，包括标题标签、元描述、图片优化、链接结构等关键因素。
                    {isBatchMode ? '批量分析可以快速发现多个页面的共同问题。' : '修复这些问题可以提高网站在搜索引擎中的表现。'}
                  </p>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-destructive mr-2"></span>
                    <span className="text-xs"><strong>问题</strong>: 确定存在的SEO错误</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                    <span className="text-xs"><strong>警告</strong>: 需要检查的潜在问题</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                    <span className="text-xs"><strong>机会</strong>: 可以优化改进的部分</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧内容区域 */}
          <div className="lg:col-span-2 space-y-6">
            {isBatchMode ? (
              <SeoResultsBatch 
                batchResults={batchResults}
                detailedResults={batchAnalysisResults}
                isLoading={isLoadingBatchResults}
                isExporting={isExporting}
                onExport={handleExport}
                onClearResults={clearBatchResults}
              />
            ) : (
              <SeoResults 
                results={analysisResults}
                isLoading={isUploading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}