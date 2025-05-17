//frontend-new/src/app/%28dashboard%29/sitemap/page.tsx
"use client";

import { useState } from 'react';
import { Upload, Download, RefreshCw, Activity, List, ExternalLink, Settings, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/file-upload";
import { SitemapChart } from "@/visualizations/sitemap-chart";
import { SitemapFilter } from "@/components/sitemap/sitemap-filter";
import { SitemapStats } from "@/components/sitemap/sitemap-stats";
import { SitemapAnalysis } from "@/components/sitemap/sitemap-analysis";
import { SitemapURLList } from "@/components/sitemap/sitemap-url-list";
import { useSitemapApi } from "@/hooks/use-sitemap-api";

export default function SitemapPage() {
  const [showUpload, setShowUpload] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('visualization');
  const [visualizationType, setVisualizationType] = useState<string>('tree');
  const [exportFormat, setExportFormat] = useState<string>('csv');
  const [showChartConfig, setShowChartConfig] = useState(false);

  // 图表配置状态
  const [chartConfig, setChartConfig] = useState({
    maxNodes: 300,           // 最大显示节点数
    initialDepth: 3,         // 初始展开深度
    enableAnimation: true,   // 是否启用动画
    labelStrategy: 'hover' as 'always' | 'hover' | 'none',  // 标签显示策略
  });

  const {
    isUploading,
    isFiltering,
    isLoadingVisualization,
    isAnalyzing,
    isLoadingCommonPaths,
    uploadResponse,
    visualizationData,
    filterResponse,
    analysisResponse,
    commonPaths,
    uploadSitemaps,
    fetchVisualizationData,
    filterSitemap,
    analyzeSitemap,
    fetchCommonPaths,
    getExportUrl,
    getExportFilteredUrl,
    resetData,
  } = useSitemapApi();

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      await uploadSitemaps(files);
      setShowUpload(false);

      // 获取详细分析
      await analyzeSitemap(true);

      // 获取常用路径
      await fetchCommonPaths(5);
    } catch (error) {
      console.error('Error processing sitemap files:', error);
    }
  };

  const handleApplyFilter = async (filters: any) => {
    try {
      await filterSitemap(filters);
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const handleChangeVisualization = async (type: string) => {
    setVisualizationType(type);
    await fetchVisualizationData(type);
  };

  const handleReset = () => {
    resetData();
    setShowUpload(true);
    setActiveTab('visualization');
  };

  const handleExportUrls = () => {
    window.open(getExportFilteredUrl(exportFormat), '_blank');
  };

  // 计算节点总数的辅助函数，用于检测性能问题
  const countNodes = (node: any): number => {
    if (!node) return 0;
    let count = 1; // 当前节点

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => {
        count += countNodes(child);
      });
    }

    return count;
  };

  // 检查是否有大量节点，决定是否显示性能警告
  const hasLargeDataset = visualizationData && countNodes(visualizationData) > 500;

  const hasData = uploadResponse !== null;
  const hasFilteredUrls = filterResponse && filterResponse.filtered_urls.length > 0;

  // 切换选项卡内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'visualization':
        return (
          <Card>
            <CardHeader>
              <CardTitle>网站结构可视化</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 性能警告提示 - 独立组件 */}
              {hasLargeDataset && (
                <Alert className="mb-4" variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">大型数据集提示</div>
                    <p>当前数据集包含大量URL，可能影响可视化性能。您可以：</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('urls')}
                      >
                        <List className="mr-2 h-4 w-4" />
                        切换到URL列表
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChartConfig(!showChartConfig)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        调整图表配置
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <SitemapChart
                visualizationData={visualizationData as any}
                visualizationType={visualizationType}
                isLoading={isLoadingVisualization}
                height={700}
                chartConfig={chartConfig}
              />
            </CardContent>
          </Card>
        );
      case 'analysis':
        return <SitemapAnalysis analysisData={analysisResponse} isLoading={isAnalyzing} />;
      case 'urls':
        return (
          <SitemapURLList
            urlData={filterResponse}
            isLoading={isFiltering}
            onExport={handleExportUrls}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Sitemap分析与可视化</h1>
      </div>
      <Separator />
      {/* 操作栏 */}
      {hasData && (
        <div className="flex flex-wrap gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowUpload(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              上传更多文件
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.open(getExportUrl('xml'), '_blank');
              }}
              disabled={isUploading || isFiltering}
            >
              <Download className="mr-2 h-4 w-4" />
              导出合并后的Sitemap
            </Button>

            {/* 导出筛选后的URLs按钮 */}
            <div className="relative flex items-center gap-2" title={!hasFilteredUrls ? "请先应用筛选" : ""}>
              <Button
                variant="outline"
                onClick={handleExportUrls}
                disabled={isUploading || isFiltering || !hasFilteredUrls}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                导出筛选后URLs
              </Button>
              <div className="ml-1"> {/* 添加一个包装容器和间距 */}
                <Select
                  value={exportFormat}
                  onValueChange={setExportFormat}
                >
                  <SelectTrigger className="w-[70px] h-7 border bg-transparent">
                    <SelectValue placeholder="格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="txt">TXT</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                analyzeSitemap(true);
                setActiveTab('analysis');
              }}
              disabled={isUploading || isFiltering || isAnalyzing || !hasData}
            >
              <Activity className="mr-2 h-4 w-4" />
              分析网站结构
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

      {/* 文件上传区域 */}
      {(showUpload || !hasData) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>上传Sitemap文件</CardTitle>
            <CardDescription>
              上传Sitemap XML文件、CSV或XLSX文件以分析网站结构。您可以同时上传多个文件，系统会自动合并和处理嵌套的Sitemap。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
              accept={{
                'text/xml': ['.xml'],
                'application/xml': ['.xml'],
                'text/csv': ['.csv'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* 主面板 */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧面板 */}
          <div className="lg:col-span-1">
            <SitemapFilter
              onApplyFilter={handleApplyFilter}
              domains={uploadResponse?.top_level_domains || []}
              commonPaths={commonPaths || []}
              isLoading={isFiltering}
              isLoadingCommonPaths={isLoadingCommonPaths}
              disabled={isUploading}
            />

            {/* 可视化选项 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>可视化选项</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    可视化类型
                  </label>
                  <Select
                    value={visualizationType}
                    onValueChange={handleChangeVisualization}
                    disabled={isLoadingVisualization || !hasData}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择可视化类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tree">标准树形图 - 传统层级结构</SelectItem>
                      <SelectItem value="tree-radial">径向树形图 - 放射状结构</SelectItem>
                      <SelectItem value="graph-label-overlap">标签网络图 - 连接关系</SelectItem>
                      <SelectItem value="graph-circular-layout">环形布局图 - 均匀分布</SelectItem>
                      <SelectItem value="graph-webkit-dep">依赖关系图 - 复杂结构</SelectItem>
                      <SelectItem value="graph-npm">箭头流向图 - 方向指示</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 图表配置面板 */}
                <div className={`${showChartConfig ? 'block' : 'hidden'} bg-muted p-3 rounded-md space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">高级图表配置</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChartConfig(!showChartConfig)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      初始展开深度: {chartConfig.initialDepth}
                    </label>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[chartConfig.initialDepth]}
                      onValueChange={values => setChartConfig({ ...chartConfig, initialDepth: values[0] })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>更少</span>
                      <span>更多</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      节点标签显示
                    </label>
                    <Select
                      value={chartConfig.labelStrategy}
                      onValueChange={(value) => setChartConfig({
                        ...chartConfig,
                        labelStrategy: value as 'always' | 'hover' | 'none'
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择标签显示策略" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hover">仅悬停时显示 (推荐)</SelectItem>
                        <SelectItem value="always">始终显示所有标签</SelectItem>
                        <SelectItem value="none">隐藏所有标签</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAnimation"
                      checked={chartConfig.enableAnimation}
                      onCheckedChange={(checked) => setChartConfig({ ...chartConfig, enableAnimation: checked })}
                    />
                    <label htmlFor="enableAnimation" className="text-sm text-muted-foreground">
                      启用动画 (大数据集建议关闭)
                    </label>
                  </div>

                  <Alert className="mt-2">
                    <AlertDescription className="text-xs">
                      提示: 大型网站结构建议使用较低的展开深度和关闭动画效果以提高性能
                    </AlertDescription>
                  </Alert>
                </div>

                {isLoadingVisualization && (
                  <Alert>
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                      正在加载{visualizationType === 'tree' ? '树形图' :
                        visualizationType === 'tree-radial' ? '径向树形图' :
                          visualizationType === 'graph-label-overlap' ? '标签网络图' :
                            visualizationType === 'graph-circular-layout' ? '环形布局图' :
                              visualizationType === 'graph-webkit-dep' ? '依赖关系图' :
                                visualizationType === 'graph-npm' ? '箭头流向图' :
                                  ''}可视化...
                    </div>
                  </Alert>
                )}

                <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                  <p className="font-medium text-sm mb-1">当前图表: {
                    visualizationType === 'tree' ? '标准树形图' :
                      visualizationType === 'tree-radial' ? '径向树形图' :
                        visualizationType === 'graph-label-overlap' ? '标签网络图' :
                          visualizationType === 'graph-circular-layout' ? '环形布局图' :
                            visualizationType === 'graph-webkit-dep' ? '依赖关系图' :
                              visualizationType === 'graph-npm' ? '箭头流向图' :
                                '未知图表类型'
                  }</p>
                  <p>{
                    visualizationType === 'tree' ? '展示标准的网站层级结构，清晰直观' :
                      visualizationType === 'tree-radial' ? '以放射状展示树形结构，适合大型站点' :
                        visualizationType === 'graph-label-overlap' ? '显示节点之间的连接关系，自动避免标签重叠' :
                          visualizationType === 'graph-circular-layout' ? '将节点均匀分布在圆周上，突出整体结构' :
                            visualizationType === 'graph-webkit-dep' ? '复杂网站结构的依赖关系可视化' :
                              visualizationType === 'graph-npm' ? '带有方向指示的网络图，展示页面间导航关系' :
                                '请选择图表类型'
                  }</p>
                </div>
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <SitemapStats
              uploadData={uploadResponse}
              analysisData={analysisResponse}
              filteredData={filterResponse}
              isLoading={isUploading || isFiltering || isAnalyzing}
            />
          </div>

          {/* 右侧内容区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 选项卡 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="visualization">可视化</TabsTrigger>
                <TabsTrigger value="analysis">结构分析</TabsTrigger>
                <TabsTrigger value="urls">URL列表</TabsTrigger>
              </TabsList>

              {/* 选项卡内容 */}
              <TabsContent value={activeTab} className="mt-4">
                {renderTabContent()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}