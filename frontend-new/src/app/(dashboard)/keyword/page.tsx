//frontend-new/src/app/page.tsx
"use client";

import { useState } from 'react';
import { Upload, Download, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { KeywordStats } from "@/components/dashboard/keyword-stats";
import { FilterPanel } from "@/components/dashboard/filter-panel";
import { BrandOverlap } from "@/components/dashboard/brand-overlap";
import { KeywordChart } from "@/visualizations/keyword-chart";
import { KeywordFilter } from "@/components/dashboard/keyword-filter";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const [showUpload, setShowUpload] = useState(true);
  const {
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingKeywordFilter,
    fileStats,
    mergedStats,
    filteredStats,
    keywordCounts,
    brandOverlapData,
    keywordFilterResults,
    filterRanges,
    uploadFiles,
    applyFilters,
    filterByKeyword,
    getExportUrl,
    getExportUniqueUrl,
    resetData,
  } = useApi();

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      await uploadFiles(files);
      setShowUpload(false);
    } catch (error) {
      console.error('Error processing files:', error);
    }
  };

  const handleApplyFilter = async (filters: any) => {
    try {
      await applyFilters(filters);
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const handleReset = () => {
    resetData();
    setShowUpload(true);
  };

  const hasData = fileStats.length > 0 && mergedStats !== null;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">关键词分析</h1>
      </div>
      <Separator />
      {/* Action Bar */}
      {hasData && (
        <div className="flex flex-wrap gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowUpload(true)}
              className="gap-2"
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
              onClick={() => {
                window.open(getExportUniqueUrl(), '_blank');
              }}
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

            <Card>
              <CardHeader>
                <CardTitle>关键词分布</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isFiltering ? (
                  <Skeleton className="h-[400px] w-full rounded-xl" />
                ) : (
                  <KeywordChart keywordCounts={keywordCounts} />
                )}
              </CardContent>
            </Card>

            <KeywordFilter
              onFilter={filterByKeyword}
              results={keywordFilterResults}
              isLoading={isLoadingKeywordFilter}
              disabled={isUploading || !hasData}
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