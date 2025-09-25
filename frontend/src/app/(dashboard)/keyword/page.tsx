//frontend/src/app/(dashboard)/keyword/page.tsx
"use client";

import { useState } from 'react';
import { Upload, Download, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { KeywordStats } from "@/components/keyword/keyword-stats";
import { FilterPanel } from "@/components/keyword/filter-panel";
import { BrandOverlap } from "@/components/keyword/brand-overlap";
import { KeywordList } from "@/components/keyword/keyword-list";
import { useKeywordsApi } from "@/hooks/use-keywords-api"; // 更新：使用新的hook
import { FilterRanges } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { exportKeywordsToCSV, ExportableData } from "@/lib/csv-export";

export default function KeywordPage() {
  const [showUpload, setShowUpload] = useState(true);
  const [exportTrigger, setExportTrigger] = useState(false);
  
  // 更新：使用新的关键词专用API hook
  const {
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingKeywordList,
    fileStats,
    mergedStats,
    filteredStats,
    brandOverlapData,
    keywordListData,
    filterRanges,
    uploadFiles,
    applyFilters,
    getExportUrl,
    resetData,
  } = useKeywordsApi();

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      await uploadFiles(files);
      setShowUpload(false);
    } catch (error) {
      console.error('Error processing keyword files:', error);
    }
  };

  const handleApplyFilter = async (filters: FilterRanges) => {
    try {
      await applyFilters(filters);
    } catch (error) {
      console.error('Error applying keyword filters:', error);
    }
  };

  const handleReset = () => {
    resetData();
    setShowUpload(true);
  };

  const hasData = fileStats.length > 0 && mergedStats !== null;
  
  // 处理导出唯一数据
  const handleExportUniqueData = () => {
    setExportTrigger(true); // 设置为true来触发导出
    // 立即重置，确保下次点击时能再次触发
    setTimeout(() => setExportTrigger(false), 0);
  };
  
  // 处理导出数据回调
  const handleExportData = (data: ExportableData[]) => {
    exportKeywordsToCSV(data, 'unique_keywords', false); // 保持原始列名
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">关键词分析</h1>
        {/* 添加v1 API指示 */}
        <div className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded">
          API v1
        </div>
      </div>
      <Separator />
      
      {/* Action Bar */}
      {hasData && (
        <div className="flex flex-wrap gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowUpload(true)}
              className="gap-2"
              disabled={isUploading || isFiltering}
            >
              <Upload className="h-4 w-4" />
              上传更多文件
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.open(getExportUrl(), '_blank');
              }}
              disabled={isUploading || isFiltering}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              导出筛选数据
            </Button>

            <Button
              variant="outline"
              onClick={handleExportUniqueData}
              disabled={isUploading || isFiltering}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              导出唯一数据
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isUploading || isFiltering}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重置所有数据
          </Button>
        </div>
      )}

      {/* File Upload Section */}
      {(showUpload || !hasData) && (
        <Card>
          <CardHeader>
            <CardTitle>上传CSV或XLSX文件</CardTitle>
            <CardDescription>
              上传CSV或XLSX文件以处理和分析关键词数据。您可以一次上传多个文件。
              <span className="block text-xs text-muted-foreground mt-1">
                正在使用API v1 - 新的关键词分析接口
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />
          </CardContent>
        </Card>
      )}

      {/* 加载状态 */}
      {isUploading && (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-[100px] w-full rounded-xl" />
            <Skeleton className="h-[100px] w-full rounded-xl" />
            <Skeleton className="h-[100px] w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      {hasData && !isUploading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1">
            <FilterPanel
              filterRanges={filterRanges}
              onApplyFilter={handleApplyFilter}
              isLoading={isFiltering || isLoadingRanges}
              disabled={isUploading}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <KeywordStats
              originalStats={mergedStats}
              filteredStats={filteredStats}
              isLoading={isUploading || isFiltering}
            />



            <KeywordList
              keywords={keywordListData.keywords}
              isLoading={isLoadingKeywordList}
              totalCount={keywordListData.total_count}
              exportTrigger={exportTrigger}
              onExportData={handleExportData}
            />

            <BrandOverlap
              brandOverlapData={brandOverlapData}
              isLoading={isLoadingOverlap}
            />
          </div>
        </div>
      )}
    </div>
  );
}