import React, { useState } from 'react';
import Head from 'next/head';
import { FiUpload, FiDownload, FiRefreshCw, FiActivity, FiList, FiExternalLink, FiSettings, FiAlertTriangle } from 'react-icons/fi';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';
import SitemapUploader from '../components/sitemap/SitemapUploader';
import SitemapChart from '../components/visualizations/SitemapChart';
import SitemapFilter from '../components/sitemap/SitemapFilter';
import SitemapStats from '../components/sitemap/SitemapStats';
import SitemapAnalysis from '../components/sitemap/SitemapAnalysis';
import SitemapURLList from '../components/sitemap/SitemapURLList';
import { useSitemapApi } from '../hooks/useSitemapApi';

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
          <div className="card">
            <h3 className="text-lg font-medium text-gray-800 mb-4">网站结构可视化</h3>
            
            {/* 性能警告提示 - 独立组件 */}
            {hasLargeDataset && (
              <div className="mb-4 px-4 py-3 bg-yellow-50 text-yellow-800 rounded-md text-sm flex">
                <FiAlertTriangle className="flex-shrink-0 mt-0.5 mr-2" />
                <div>
                  <div className="font-medium">大型数据集提示</div>
                  <p>当前数据集包含大量URL，可能影响可视化性能。您可以：</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button 
                      className="px-2 py-1 bg-white border border-yellow-500 rounded-md text-yellow-700 text-xs hover:bg-yellow-100 transition-colors"
                      onClick={() => setActiveTab('urls')}
                    >
                      <FiList className="inline mr-1" />
                      切换到URL列表
                    </button>
                    <button 
                      className="px-2 py-1 bg-white border border-yellow-500 rounded-md text-yellow-700 text-xs hover:bg-yellow-100 transition-colors"
                      onClick={() => setShowChartConfig(!showChartConfig)}
                    >
                      <FiSettings className="inline mr-1" />
                      调整图表配置
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <SitemapChart
              visualizationData={visualizationData as any}
              visualizationType={visualizationType}
              isLoading={isLoadingVisualization}
              height={700}
              chartConfig={chartConfig}
            />
          </div>
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
    <Layout>
      <Head>
        <title>Sitemap分析工具</title>
        <meta name="description" content="分析网站Sitemap结构" />
      </Head>

      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Sitemap分析与可视化</h1>
        </div>

        {/* 操作栏 */}
        {hasData && (
          <div className="flex flex-wrap gap-4 justify-between mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                icon={<FiUpload />}
                onClick={() => setShowUpload(true)}
              >
                上传更多文件
              </Button>

              <Button
                variant="secondary"
                icon={<FiDownload />}
                onClick={() => {
                  window.open(getExportUrl('xml'), '_blank');
                }}
                disabled={isUploading || isFiltering}
              >
                导出合并后的Sitemap
              </Button>
              
              {/* 导出筛选后的URLs按钮 - 使用div包装添加title */}
              <div className="inline-block" title={!hasFilteredUrls ? "请先应用筛选" : ""}>
                <Button
                  variant="secondary"
                  icon={<FiExternalLink />}
                  onClick={handleExportUrls}
                  disabled={isUploading || isFiltering || !hasFilteredUrls}
                >
                  导出筛选后URLs
                  <select 
                    className="ml-1 py-0 px-1 border-none bg-transparent focus:ring-0 text-sm"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="csv">CSV</option>
                    <option value="txt">TXT</option>
                    <option value="xml">XML</option>
                  </select>
                </Button>
              </div>
              
              <Button
                variant="secondary"
                icon={<FiActivity />}
                onClick={() => {
                  analyzeSitemap(true);
                  setActiveTab('analysis');
                }}
                disabled={isUploading || isFiltering || isAnalyzing || !hasData}
              >
                分析网站结构
              </Button>
            </div>

            <Button
              variant="outline"
              icon={<FiRefreshCw />}
              onClick={handleReset}
              disabled={isUploading || isFiltering}
            >
              重置所有数据
            </Button>
          </div>
        )}

        {/* 文件上传区域 */}
        {(showUpload || !hasData) && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              上传Sitemap文件
            </h2>
            <p className="text-gray-600 mb-6">
              上传Sitemap XML文件、CSV或XLSX文件以分析网站结构。您可以同时上传多个文件，系统会自动合并和处理嵌套的Sitemap。
            </p>
            <SitemapUploader
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />
          </div>
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
              <div className="card mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">可视化选项</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      可视化类型
                    </label>
                    <select
                      value={visualizationType}
                      onChange={(e) => handleChangeVisualization(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={isLoadingVisualization || !hasData}
                    >
                      <option value="tree">标准树形图 - 传统层级结构</option>
                      <option value="tree-radial">径向树形图 - 放射状结构</option>
                      <option value="graph-label-overlap">标签网络图 - 连接关系</option>
                      <option value="graph-circular-layout">环形布局图 - 均匀分布</option>
                      <option value="graph-webkit-dep">依赖关系图 - 复杂结构</option>
                      <option value="graph-npm">箭头流向图 - 方向指示</option>
                    </select>
                  </div>
                  
                  {/* 图表配置面板 - 新增 */}
                  <details 
                    className={`bg-gray-50 p-3 rounded-md ${showChartConfig ? 'open' : ''}`}
                    open={showChartConfig}
                  >
                    <summary 
                      className="font-medium cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowChartConfig(!showChartConfig);
                      }}
                    >
                      高级图表配置
                      <FiSettings className="inline ml-2" />
                    </summary>
                    
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          初始展开深度: {chartConfig.initialDepth}
                        </label>
                        <input 
                          type="range" 
                          min={1} 
                          max={5} 
                          step={1}
                          value={chartConfig.initialDepth}
                          onChange={(e) => setChartConfig({...chartConfig, initialDepth: Number(e.target.value)})}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>更少</span>
                          <span>更多</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          节点标签显示
                        </label>
                        <select
                          value={chartConfig.labelStrategy}
                          onChange={(e) => setChartConfig({
                            ...chartConfig, 
                            labelStrategy: e.target.value as 'always' | 'hover' | 'none'
                          })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="hover">仅悬停时显示 (推荐)</option>
                          <option value="always">始终显示所有标签</option>
                          <option value="none">隐藏所有标签</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableAnimation"
                          checked={chartConfig.enableAnimation}
                          onChange={(e) => setChartConfig({...chartConfig, enableAnimation: e.target.checked})}
                          className="mr-2"
                        />
                        <label htmlFor="enableAnimation" className="text-sm text-gray-700">
                          启用动画 (大数据集建议关闭)
                        </label>
                      </div>
                      
                      <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                        提示: 大型网站结构建议使用较低的展开深度和关闭动画效果以提高性能
                      </div>
                    </div>
                  </details>
                  
                  {isLoadingVisualization && (
                    <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full mr-2"></div>
                      正在加载{visualizationType === 'tree' ? '树形图' : 
                              visualizationType === 'tree-radial' ? '径向树形图' : 
                              visualizationType === 'graph-label-overlap' ? '标签网络图' : 
                              visualizationType === 'graph-circular-layout' ? '环形布局图' : 
                              visualizationType === 'graph-webkit-dep' ? '依赖关系图' : 
                              visualizationType === 'graph-npm' ? '箭头流向图' : 
                              ''}可视化...
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
                    <p className="font-medium text-gray-700 mb-1">当前图表: {
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
                </div>
              </div>

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
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex space-x-4 border-b">
                  <button
                    className={`px-4 py-2 border-b-2 font-medium text-sm ${
                      activeTab === 'visualization'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('visualization')}
                  >
                    可视化
                  </button>
                  <button
                    className={`px-4 py-2 border-b-2 font-medium text-sm ${
                      activeTab === 'analysis'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('analysis')}
                  >
                    结构分析
                  </button>
                  <button
                    className={`px-4 py-2 border-b-2 font-medium text-sm ${
                      activeTab === 'urls'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('urls')}
                  >
                    URL列表
                  </button>
                </div>
              </div>
              
              {/* 选项卡内容 */}
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}