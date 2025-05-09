import React, { useState } from 'react';
import Head from 'next/head';
import { FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';
import Layout from '../components/common/Layout';
import FileUpload from '../components/common/FileUpload';
import Button from '../components/common/Button';
import KeywordStats from '../components/dashboard/KeywordStats';
import FileStats from '../components/dashboard/FileStats';
import FilterPanel from '../components/dashboard/FilterPanel';
import BrandOverlap from '../components/dashboard/BrandOverlap';
import KeywordChart from '../components/visualizations/KeywordChart';
import { useApi } from '../hooks/useApi';

export default function Home() {
  const [showUpload, setShowUpload] = useState(true);
  const {
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    fileStats,
    mergedStats,
    filteredStats,
    keywordCounts,
    brandOverlapData,
    filterRanges,
    uploadFiles,
    applyFilters,
    getExportUrl,
    getExportUniqueUrl, // 新增导出唯一数据URL方法
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
    <Layout>
      <Head>
        <title>CSV Processor Tool</title>
        <meta name="description" content="Process and analyze CSV files" />
      </Head>

      <div className="space-y-6">
        {/* Action Bar */}
        {hasData && (
          <div className="flex flex-wrap gap-4 justify-between mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                icon={<FiUpload />}
                onClick={() => setShowUpload(true)}
              >
                Upload More Files
              </Button>

              <Button
                variant="secondary"
                icon={<FiDownload />}
                onClick={() => {
                  window.open(getExportUrl(), '_blank');
                }}
                disabled={isUploading || isFiltering}
              >
                Export Filtered Data
              </Button>

              {/* 新增的Export Unique Data按钮 */}
              <Button
                variant="secondary"
                icon={<FiDownload />}
                onClick={() => {
                  window.open(getExportUniqueUrl(), '_blank');
                }}
                disabled={isUploading || isFiltering}
              >
                Export Unique Data
              </Button>
            </div>

            <Button
              variant="outline"
              icon={<FiRefreshCw />}
              onClick={handleReset}
              disabled={isUploading || isFiltering}
            >
              Reset All Data
            </Button>
          </div>
        )}

        {/* File Upload Section */}
        {(showUpload || !hasData) && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Upload CSV or XLSX Files
            </h2>
            <p className="text-gray-600 mb-6">
              Upload your CSV or XLSX files to process and analyze keyword data. You can upload multiple files at once.
            </p>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />
          </div>
        )}

        {/* Main Dashboard */}
        {hasData && (
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

              <div className="card mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Keyword Distribution</h3>
                <KeywordChart keywordCounts={keywordCounts} />
              </div>

              <BrandOverlap
                brandOverlapData={brandOverlapData}
                isLoading={isLoadingOverlap}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}