// frontend/src/pages/backlink.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import { FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';
import Layout from '../components/common/Layout';
import FileUpload from '../components/common/FileUpload';
import Button from '../components/common/Button';
import BacklinkStats from '../components/backlink/BacklinkStats';
import BacklinkFilterPanel from '../components/backlink/BacklinkFilterPanel';
import BrandDomainOverlap from '../components/backlink/BrandDomainOverlap';
import DomainChart from '../components/visualizations/DomainChart';
import DomainFilter from '../components/backlink/DomainFilter';
import { useBacklinkApi } from '../hooks/useBacklinkApi';

export default function Backlink() {
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
    <Layout title="外链分析工具">
      <Head>
        <title>外链分析工具</title>
        <meta name="description" content="分析外链数据" />
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
                上传更多文件
              </Button>

              <Button
                variant="secondary"
                icon={<FiDownload />}
                onClick={() => {
                  window.open(getExportUrl(), '_blank');
                }}
                disabled={isUploading || isFiltering}
              >
                导出筛选数据
              </Button>

              <Button
                variant="secondary"
                icon={<FiDownload />}
                onClick={() => {
                  window.open(getExportUniqueUrl(), '_blank');
                }}
                disabled={isUploading || isFiltering}
              >
                导出唯一域名
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

        {/* File Upload Section */}
        {(showUpload || !hasData) && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              上传CSV或XLSX文件
            </h2>
            <p className="text-gray-600 mb-6">
              上传包含外链数据的CSV或XLSX文件进行分析。您可以一次上传多个文件。
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

              <div className="card mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">域名分布</h3>
                <DomainChart domainCounts={domainCounts} />
              </div>

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
      </div>
    </Layout>
  );
}