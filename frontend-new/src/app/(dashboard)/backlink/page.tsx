//frontend-new/src/app/(dashboard)/backlink/page.tsx
"use client";

import { useState } from 'react';
import { 
  Upload, 
  Download, 
  RefreshCw 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/file-upload";
import { BacklinkStats } from "@/components/backlink/backlink-stats";
import { BacklinkFilterPanel } from "@/components/backlink/backlink-filter-panel";
import { BrandDomainOverlap } from "@/components/backlink/brand-domain-overlap";
import { DomainChart } from "@/visualizations/domain-chart";
import { DomainFilter } from "@/components/backlink/domain-filter";
import { useBacklinkApi } from "@/hooks/use-backlink-api";

export default function BacklinkPage() {
  const [showUpload, setShowUpload] = useState(true);
  const {
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingDomainFilter,
    fileStats,
    mergedStats,
    filteredStats,
    domainCounts,
    brandOverlapData,
    domainFilterResults,
    filterRanges,
    uploadFiles,
    applyFilters,
    filterByDomain,
    getExportUrl,
    getExportUniqueUrl,
    resetData,
  } = useBacklinkApi();

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">外链分析</h1>
      </div>
      
      <Separator className="my-4" />
      
      {/* Action Bar */}
      {hasData && (
        <div className="flex flex-wrap gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              上传更多文件
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.open(getExportUrl(), '_blank');
              }}
              disabled={isUploading || isFiltering}
            >
              <Download className="mr-2 h-4 w-4" />
              导出筛选数据
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.open(getExportUniqueUrl(), '_blank');
              }}
              disabled={isUploading || isFiltering}
            >
              <Download className="mr-2 h-4 w-4" />
              导出唯一域名
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isUploading || isFiltering}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
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
              上传包含外链数据的CSV或XLSX文件进行分析。您可以一次上传多个文件。
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

      {/* Main Dashboard */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1">
            <BacklinkFilterPanel
              filterRanges={filterRanges}
              onApplyFilter={handleApplyFilter}
              isLoading={isFiltering || isLoadingRanges}
              disabled={isUploading}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <BacklinkStats
              originalStats={mergedStats}
              filteredStats={filteredStats}
              isLoading={isUploading || isFiltering}
            />

            <Card>
              <CardHeader>
                <CardTitle>域名分布</CardTitle>
              </CardHeader>
              <CardContent>
                <DomainChart domainCounts={domainCounts} />
              </CardContent>
            </Card>

            <DomainFilter
              onFilter={filterByDomain}
              results={domainFilterResults}
              isLoading={isLoadingDomainFilter}
              disabled={isUploading || !hasData}
            />

            <BrandDomainOverlap
              brandOverlapData={brandOverlapData}
              isLoading={isLoadingOverlap}
            />
          </div>
        </div>
      )}
      
      {isUploading && (
        <Alert className="mt-4">
          <AlertDescription>
            正在处理文件，请稍候...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}