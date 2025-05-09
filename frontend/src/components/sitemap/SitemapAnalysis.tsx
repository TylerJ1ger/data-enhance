import React, { useState } from 'react';
import { FiSearch, FiList, FiPieChart, FiLayers, FiInfo } from 'react-icons/fi';
import { SitemapAnalysisResponse, UrlPattern } from '../../types';

interface SitemapAnalysisProps {
  analysisData: SitemapAnalysisResponse | null;
  isLoading?: boolean;
}

const SitemapAnalysis: React.FC<SitemapAnalysisProps> = ({
  analysisData,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>('patterns');

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="card">
        <div className="text-center py-6 text-gray-500">
          <FiSearch className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>请先分析Sitemap结构以查看详细信息</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'patterns':
        return renderPatterns();
      case 'segments':
        return renderPathSegments();
      case 'parameters':
        return renderParameters();
      default:
        return renderPatterns();
    }
  };

  const renderPatterns = () => {
    if (!analysisData.url_patterns || analysisData.url_patterns.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <p>没有发现URL模式</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          识别到 {analysisData.url_patterns.length} 种URL模式结构
        </p>
        
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">模式</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">示例</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisData.url_patterns.map((pattern: UrlPattern, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{pattern.pattern}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pattern.count}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                    <div className="truncate">{pattern.examples[0]}</div>
                    {pattern.examples.length > 1 && (
                      <div className="truncate text-xs text-gray-400 mt-1">+ {pattern.examples.length - 1} 更多示例</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPathSegments = () => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          URL路径各层级分段的分布情况
        </p>
        
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(analysisData.top_path_segments).map(([depth, segments]) => (
            <div key={depth} className="bg-white rounded-lg border border-gray-200 p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                层级 {depth.replace('depth_', '')} ({analysisData.path_segment_counts[depth]} 个不同的段)
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {segments.map(([segment, count], i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span className="truncate mr-2 font-mono">{segment}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderParameters = () => {
    if (!analysisData.parameters || analysisData.parameters.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <p>没有发现URL参数</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          URL中常见的查询参数
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisData.parameters.map(([param, count], index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm truncate mr-2">{param}</span>
                <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                  {count} URLs
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'patterns', label: 'URL模式', icon: <FiList className="mr-1" /> },
    { id: 'segments', label: '路径段', icon: <FiLayers className="mr-1" /> },
    { id: 'parameters', label: 'URL参数', icon: <FiPieChart className="mr-1" /> },
  ];

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">Sitemap结构分析</h3>
      
      {/* 提示信息 */}
      <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm flex">
        <FiInfo className="mr-2 flex-shrink-0 mt-0.5" />
        <div>
          分析了 <strong>{analysisData.total_urls}</strong> 个URL，识别了 <strong>{Object.keys(analysisData.domains).length}</strong> 个域名。
          分析包括URL模式识别、路径层级结构和URL参数统计。
        </div>
      </div>
      
      {/* 选项卡 */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* 内容区域 */}
      <div className="py-2">
        {renderTab()}
      </div>
    </div>
  );
};

export default SitemapAnalysis;