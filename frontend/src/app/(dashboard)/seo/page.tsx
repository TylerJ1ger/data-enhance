//frontend-new/src/app/(dashboard)/seo/page.tsx
"use client";

import { useState } from 'react';
import { 
  Upload,
  RefreshCw,
  FileText,
  AlertCircle,
  AlertTriangle,
  Search
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

import { useSeoApi } from "@/hooks/use-seo-api";

// 导入SEO组件
import { SeoUploader } from "@/components/seo/seo-uploader";
import { SeoResults } from "@/components/seo/seo-results";
import { SeoFilter } from "@/components/seo/seo-filter";

export default function SeoPage() {
  const [showUpload, setShowUpload] = useState(true);
  const {
    isUploading,
    isLoadingCategories,
    analysisResults,
    categories,
    selectedCategory,
    filteredIssues,
    uploadSEOFile,
    setSelectedCategory,
    resetData,
    contentExtractor,
    setContentExtractor,
    enableAdvancedAnalysis,
    setEnableAdvancedAnalysis
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

  const handleReset = () => {
    resetData();
    setShowUpload(true);
  };

  const hasData = analysisResults !== null;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">单页SEO分析</h1>
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
            >
              <Upload className="mr-2 h-4 w-4" />
              上传新文件
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isUploading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重置分析数据
          </Button>
        </div>
      )}

      {/* 文件上传区域 */}
      {(showUpload || !hasData) && (
        <Card>
          <CardHeader>
            <CardTitle>上传HTML文件进行SEO分析</CardTitle>
            <CardDescription>
              上传你的HTML文件，我们将对其进行全面的SEO分析，包括标题、元描述、内容、图片、链接等多个方面，并提供详细的改进建议。
              <span className="block text-xs text-muted-foreground mt-1">
                正在使用API v1 - 新的SEO分析接口
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeoUploader
              onFileSelected={handleFileSelected}
              disabled={isUploading}
              contentExtractor={contentExtractor}
              setContentExtractor={setContentExtractor}
              enableAdvancedAnalysis={enableAdvancedAnalysis}
              setEnableAdvancedAnalysis={setEnableAdvancedAnalysis}
            />
          </CardContent>
        </Card>
      )}

      {/* 主面板 */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧面板 */}
          <div className="lg:col-span-1 space-y-6">
            <SeoFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              isLoading={isLoadingCategories}
              disabled={isUploading}
            />
            
            {/* SEO信息卡片 */}
            <Card>
              <CardHeader>
                <CardTitle>SEO分析概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <p>SEO分析基于200多项检查点进行评估，包括标题标签、元描述、图片优化、链接结构等关键因素。修复这些问题可以提高网站在搜索引擎中的表现。</p>
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
            <SeoResults 
              results={analysisResults}
              isLoading={isUploading}
            />
          </div>
        </div>
      )}
    </div>
  );
}