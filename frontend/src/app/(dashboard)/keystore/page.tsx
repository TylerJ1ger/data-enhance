// src/app/(dashboard)/keystore/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Upload, Download, RefreshCw, Database, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { FileUpload } from "@/components/file-upload";
import { KeystoreStats } from "@/components/keystore/keystore-stats";
import { KeystoreUploader } from "@/components/keystore/keystore-uploader";
import { KeystoreVisualization } from "@/components/keystore/keystore-visualization";
import { KeystoreGroupsManager } from "@/components/keystore/keystore-groups-manager";
import { KeystoreClustersManager } from "@/components/keystore/keystore-clusters-manager";
import { KeystoreDuplicatesManager } from "@/components/keystore/keystore-duplicates-manager";

import { useKeystoreApi } from "@/hooks/use-keystore-api";
import { toast } from 'react-toastify';

export default function KeystorePage() {
  const [showUpload, setShowUpload] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isInitialized, setIsInitialized] = useState(false);
  
  const {
    isUploading,
    isLoadingSummary,
    isLoadingVisualization,
    isLoadingGroups,
    isLoadingClusters,
    isLoadingDuplicates,
    isProcessing,
    summary,
    groupsOverview,
    groupsData,
    clustersData,
    visualizationData,
    duplicatesData,
    fileStats,
    triggerId, // 新增：监听数据更新触发器
    uploadFiles,
    fetchSummary,
    fetchGroupsData,
    fetchClustersData,
    fetchVisualizationData,
    fetchDuplicatesData,
    getExportUrl,
    resetData,
  } = useKeystoreApi();

  // 检查是否有数据
  const hasData = summary !== null && Object.keys(groupsData).length > 0;

  // 初始化检查：如果有数据但显示上传界面，自动隐藏上传界面
  useEffect(() => {
    if (!isInitialized && hasData) {
      setShowUpload(false);
      setIsInitialized(true);
    }
  }, [hasData, isInitialized]);

  // 监听 triggerId 变化，确保界面实时更新
  useEffect(() => {
    if (triggerId > 0) {
      console.log('数据已更新，triggerId:', triggerId);
      // 可以在这里添加额外的UI反馈逻辑
    }
  }, [triggerId]);

  // 处理文件上传
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      await uploadFiles(files);
      setShowUpload(false);
      setActiveTab("overview");
      setIsInitialized(true);
      
      // 显示成功消息
      toast.success(`成功上传并处理了 ${files.length} 个文件`);
    } catch (error) {
      console.error('Error processing keystore files:', error);
      toast.error('文件处理失败，请重试');
    }
  };

  // 处理数据重置
  const handleReset = async () => {
    if (!confirm('确定要重置所有关键词库数据吗？此操作不可撤销。')) {
      return;
    }

    try {
      await resetData();
      setShowUpload(true);
      setActiveTab("overview");
      setIsInitialized(false);
      toast.success('数据已重置');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('重置数据失败，请重试');
    }
  };

  // 处理导出
  const handleExport = useCallback(() => {
    if (!hasData) {
      toast.error('没有可导出的数据');
      return;
    }

    try {
      const exportUrl = getExportUrl();
      window.open(exportUrl, '_blank');
      toast.success('开始下载关键词库数据');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('导出失败，请重试');
    }
  }, [hasData, getExportUrl]);

  // 刷新所有数据
  const handleRefreshAll = async () => {
    if (!hasData) return;

    try {
      toast.info('正在刷新数据...');
      await Promise.all([
        fetchSummary(),
        fetchGroupsData(),
        fetchClustersData(),
        fetchVisualizationData(),
        fetchDuplicatesData(),
      ]);
      toast.success('数据刷新完成');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('刷新数据失败，请重试');
    }
  };

  // 获取加载状态
  const isAnyLoading = isUploading || isLoadingSummary || isLoadingGroups || 
                      isLoadingClusters || isLoadingVisualization || isLoadingDuplicates;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-8 w-8" />
            关键词库
          </h1>
          <p className="text-muted-foreground mt-1">
            构建和管理您的关键词库，分析关键词组关系和重复情况
          </p>
        </div>
        {/* API版本指示 */}
        <div className="flex items-center gap-2">
          {hasData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isAnyLoading}
              className="gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          )}
          <div className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded">
            API v1
          </div>
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
              disabled={isUploading || isProcessing}
            >
              <Upload className="h-4 w-4" />
              上传更多文件
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isUploading || isProcessing || !hasData}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              导出关键词库
            </Button>
          </div>

          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isUploading || isProcessing}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重置所有数据
          </Button>
        </div>
      )}

      {/* 状态信息 */}
      {isProcessing && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            正在处理数据，请稍候...
          </AlertDescription>
        </Alert>
      )}

      {/* File Upload Section */}
      {(showUpload || !hasData) && (
        <div className="space-y-4">
          <KeystoreUploader
            onFilesSelected={handleFilesSelected}
            isUploading={isUploading}
          />
          
          {hasData && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowUpload(false)}
                disabled={isUploading}
              >
                隐藏上传界面
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 加载状态 */}
      {isUploading && (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[150px] w-full rounded-xl" />
            <Skeleton className="h-[150px] w-full rounded-xl" />
            <Skeleton className="h-[150px] w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      {hasData && !isUploading && (
        <div className="space-y-6">
          {/* 统计信息 */}
          <KeystoreStats
            summary={summary}
            groupsOverview={groupsOverview}
            fileStats={fileStats}
            isLoading={isLoadingSummary}
          />

          {/* 主要功能标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="visualization">可视化</TabsTrigger>
              <TabsTrigger value="groups">组管理</TabsTrigger>
              <TabsTrigger value="clusters">族管理</TabsTrigger>
              <TabsTrigger value="duplicates">重复分析</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 可视化预览 */}
                <Card>
                  <CardHeader>
                    <CardTitle>关键词组关系图</CardTitle>
                    <CardDescription>
                      关键词组之间的关系可视化预览
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KeystoreVisualization
                      visualizationData={visualizationData}
                      isLoading={isLoadingVisualization}
                      height={300}
                      showToolbar={false}
                    />
                  </CardContent>
                </Card>

                {/* 重复关键词概览 */}
                <Card>
                  <CardHeader>
                    <CardTitle>重复关键词概览</CardTitle>
                    <CardDescription>
                      存在于多个组中的关键词统计
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KeystoreDuplicatesManager
                      duplicatesData={duplicatesData}
                      groupsData={groupsData}
                      previewMode={true}
                      isLoading={isLoadingDuplicates}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* 快速统计信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Object.keys(groupsData).length}
                      </div>
                      <div className="text-sm text-muted-foreground">关键词组数量</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Object.keys(clustersData).length}
                      </div>
                      <div className="text-sm text-muted-foreground">关键词族数量</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {duplicatesData?.total_duplicates || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">重复关键词</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="visualization">
              <KeystoreVisualization
                key={`visualization-${triggerId}`}
                visualizationData={visualizationData}
                isLoading={isLoadingVisualization}
                height={600}
                showToolbar={true}
              />
            </TabsContent>

            <TabsContent value="groups">
              <KeystoreGroupsManager
                key={`groups-${triggerId}`}
                groupsData={groupsData}
                clustersData={clustersData}
                isLoading={isLoadingGroups}
              />
            </TabsContent>

            <TabsContent value="clusters">
              <KeystoreClustersManager
                key={`clusters-${triggerId}`}
                clustersData={clustersData}
                groupsData={groupsData}
                isLoading={isLoadingClusters}
              />
            </TabsContent>

            <TabsContent value="duplicates">
              <KeystoreDuplicatesManager
                key={`duplicates-${triggerId}`}
                duplicatesData={duplicatesData}
                groupsData={groupsData}
                previewMode={false}
                isLoading={isLoadingDuplicates}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* 空状态 */}
      {!hasData && !isUploading && !showUpload && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有关键词库数据</h3>
            <p className="text-muted-foreground mb-4">
              上传CSV文件来开始构建您的关键词库
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              上传文件
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}