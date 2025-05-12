import React, { useState } from 'react';
import Head from 'next/head';
import { FiUpload, FiRefreshCw, FiFileText } from 'react-icons/fi';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';
import SEOUploader from '../components/seo/SEOUploader';
import SEOResults from '../components/seo/SEOResults';
import SEOFilter from '../components/seo/SEOFilter';
import { useSeoApi } from '../hooks/useSeoApi';

export default function SEOPage() {
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
    // 新增状态
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
    <Layout>
      <Head>
        <title>单页SEO分析 | 数据分析工具</title>
        <meta name="description" content="分析HTML文件的SEO问题，提高网站搜索引擎优化效果" />
      </Head>

      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">单页SEO分析</h1>
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
                上传新文件
              </Button>
            </div>

            <Button
              variant="outline"
              icon={<FiRefreshCw />}
              onClick={handleReset}
              disabled={isUploading}
            >
              重置分析数据
            </Button>
          </div>
        )}

        {/* 文件上传区域 */}
        {(showUpload || !hasData) && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              上传HTML文件进行SEO分析
            </h2>
            <p className="text-gray-600 mb-6">
              上传你的HTML文件，我们将对其进行全面的SEO分析，包括标题、元描述、内容、图片、链接等多个方面，并提供详细的改进建议。
            </p>
            <SEOUploader
              onFileSelected={handleFileSelected}
              disabled={isUploading}
              contentExtractor={contentExtractor}
              setContentExtractor={setContentExtractor}
              enableAdvancedAnalysis={enableAdvancedAnalysis}
              setEnableAdvancedAnalysis={setEnableAdvancedAnalysis}
            />
          </div>
        )}

        {/* 主面板 */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧面板 */}
            <div className="lg:col-span-1">
              <SEOFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                isLoading={isLoadingCategories}
                disabled={isUploading}
              />
              
              {/* SEO信息卡片 */}
              <div className="card mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">SEO分析概览</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FiFileText className="text-primary-600 mr-2" />
                        <span className="text-sm font-medium">分析的文件</span>
                      </div>
                      <span className="text-sm">
                        {analysisResults?.file_name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="text-sm font-medium mb-2">问题总数</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-red-50 p-2 rounded">
                        <span className="text-red-600 font-bold block">
                          {analysisResults?.issues_count.issues || 0}
                        </span>
                        <span className="text-xs text-red-600">问题</span>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded">
                        <span className="text-yellow-600 font-bold block">
                          {analysisResults?.issues_count.warnings || 0}
                        </span>
                        <span className="text-xs text-yellow-600">警告</span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-blue-600 font-bold block">
                          {analysisResults?.issues_count.opportunities || 0}
                        </span>
                        <span className="text-xs text-blue-600">机会</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 分析选项信息 - 新增 */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="text-sm font-medium mb-2">分析选项</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">内容提取引擎:</span>
                        <span className="font-medium">{contentExtractor === 'auto' ? '自动选择' : contentExtractor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">高级内容分析:</span>
                        <span className="font-medium">{enableAdvancedAnalysis ? '已启用' : '已禁用'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 text-gray-700 rounded-md text-sm">
                    <p>SEO分析基于200多项检查点进行评估，包括标题标签、元描述、图片优化、链接结构等关键因素。修复这些问题可以提高网站在搜索引擎中的表现。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧内容区域 */}
            <div className="lg:col-span-2 space-y-6">
              <SEOResults 
                results={analysisResults}
                isLoading={isUploading}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}