import React, { useState } from 'react';
import Head from 'next/head';
import { FiUpload, FiDownload, FiRefreshCw, FiActivity, FiList, FiExternalLink } from 'react-icons/fi';
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
  const {
    isUploading,
    isFiltering,
    isLoadingVisualization,
    isAnalyzing,
    uploadResponse,
    visualizationData,
    filterResponse,
    analysisResponse,
    uploadSitemaps,
    fetchVisualizationData,
    filterSitemap,
    analyzeSitemap,
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

  const hasData = uploadResponse !== null;
  const hasFilteredUrls = filterResponse && filterResponse.filtered_urls.length > 0;

  // 切换选项卡内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'visualization':
        return (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-800 mb-4">网站结构可视化</h3>
            <SitemapChart
              visualizationData={visualizationData as any}
              isLoading={isLoadingVisualization}
              height={700}
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
              
              {/* 新增：导出筛选后的URLs按钮 - 使用div包装添加title */}
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
                isLoading={isFiltering}
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
                      <option value="tree">树形图</option>
                      <option value="graph">关系图</option>
                    </select>
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