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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CrossAnalysisForm } from "@/components/backlink/cross-analysis-form";
import { CrossAnalysisResults } from "@/components/backlink/cross-analysis-results";
import { toast } from 'react-toastify';

// 导出参数接口定义
interface ExportParams {
  displayMode: 'flat' | 'compare';
  searchTerm: string;
  sortColumn: string; 
  sortDirection: 'asc' | 'desc';
  comparisonData?: any;
  cellDisplayType?: string;
}

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
    
    // 交叉分析相关
    isCrossAnalysisFirstRound,
    isCrossAnalysisSecondRound,
    crossAnalysisFirstRoundComplete,
    crossAnalysisSecondRoundComplete,
    crossAnalysisResults,
    domainData,  // 来自第一轮上传文件的域名和权重数据
    uploadCrossAnalysisFirstRound,
    uploadCrossAnalysisSecondRound,
    exportCrossAnalysisResults,
    resetCrossAnalysis,
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

  // 处理交叉分析导出 - 修正版本
  const handleCrossAnalysisExport = async (params: ExportParams) => {
    try {
      // 导出方式提示
      const exportType = params.displayMode === 'flat' ? '平铺视图' : '对比视图';
      toast.info(`正在导出${exportType}数据...`);
      
      // 使用异步导出方法，该方法会根据不同模式选择合适的导出方式
      if (params.displayMode === 'compare' && params.comparisonData) {
        // 对比视图使用POST请求导出，会自动触发下载
        await exportCrossAnalysisResults(params);
      } else {
        // 平铺视图使用GET请求导出
        const exportUrl = await exportCrossAnalysisResults(params);
        if (exportUrl) {
          window.open(exportUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出数据时出错，请重试');
    }
  };

  const hasData = fileStats.length > 0 && mergedStats !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">外链分析</h1>
      </div>
      
      <Separator className="my-4" />
      
      {/* Tabs组件 */}
      <Tabs defaultValue="referral-domains" className="w-full">
        <TabsList className="grid w-xl grid-cols-2 mb-4">
          <TabsTrigger value="referral-domains">引荐域名分析</TabsTrigger>
          <TabsTrigger value="cross-analysis">交叉分析</TabsTrigger>
        </TabsList>
        
        {/* 原有功能放在引荐域名分析标签页中 */}
        <TabsContent value="referral-domains" className="space-y-6">
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
                    // 修复：添加异步处理
                    getExportUrl().then(url => {
                      window.open(url, '_blank');
                    }).catch(error => {
                      console.error('获取导出URL失败:', error);
                      toast.error('获取导出URL失败，请重试');
                    });
                  }}
                  disabled={isUploading || isFiltering}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出筛选数据
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    // 修复：添加异步处理
                    getExportUniqueUrl().then(url => {
                      window.open(url, '_blank');
                    }).catch(error => {
                      console.error('获取导出URL失败:', error);
                      toast.error('获取导出URL失败，请重试');
                    });
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
        </TabsContent>
        
        {/* 交叉分析标签页 */}
        <TabsContent value="cross-analysis" className="space-y-6">
          {/* 交叉分析表单组件 */}
          <CrossAnalysisForm
            onSubmitFirstRound={uploadCrossAnalysisFirstRound}
            onSubmitSecondRound={uploadCrossAnalysisSecondRound}
            isLoadingFirstRound={isCrossAnalysisFirstRound}
            isLoadingSecondRound={isCrossAnalysisSecondRound}
            firstRoundComplete={crossAnalysisFirstRoundComplete}
            secondRoundComplete={crossAnalysisSecondRoundComplete}
            onReset={resetCrossAnalysis}
          />
          
          {/* 交叉分析结果 */}
          {crossAnalysisSecondRoundComplete && (
            <CrossAnalysisResults
              results={crossAnalysisResults}
              domainData={domainData}
              isLoading={isCrossAnalysisSecondRound}
              onExport={handleCrossAnalysisExport}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}