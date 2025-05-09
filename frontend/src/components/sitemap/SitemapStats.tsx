import React from 'react';
import { FiFileText, FiGlobe, FiLayers } from 'react-icons/fi';
import { SitemapUploadResponse, SitemapAnalysisResponse, SitemapFilterResponse } from '../../types/sitemap';

interface SitemapStatsProps {
  uploadData: SitemapUploadResponse | null;
  analysisData: SitemapAnalysisResponse | null;
  filteredData: SitemapFilterResponse | null;
  isLoading?: boolean;
}

const SitemapStats: React.FC<SitemapStatsProps> = ({
  uploadData,
  analysisData,
  filteredData,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!uploadData) {
    return (
      <div className="card">
        <div className="text-center py-6 text-gray-500">
          <FiFileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>上传Sitemap文件以查看统计信息</p>
        </div>
      </div>
    );
  }

  // 计算筛选后的URL百分比
  const percentageRetained = filteredData
    ? Math.round((filteredData.total_filtered / uploadData.total_urls) * 100)
    : 100;

  // 统计卡片组件
  const StatCard = ({
    icon,
    title,
    originalValue,
    filteredValue,
    formatter = (val: number) => val.toLocaleString(),
  }: {
    icon: React.ReactNode;
    title: string;
    originalValue: number;
    filteredValue?: number;
    formatter?: (val: number) => string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center mb-2">
        <div className="mr-2 text-primary-600">{icon}</div>
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>
      <div className="flex justify-between items-end">
        <div className="text-2xl font-bold text-gray-900">
          {formatter(filteredValue !== undefined ? filteredValue : originalValue)}
        </div>
        {filteredValue !== undefined && filteredValue !== originalValue && (
          <div className="text-sm">
            <span className="text-gray-500">原始: </span>
            <span className="font-medium">{formatter(originalValue)}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">Sitemap统计信息</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<FiFileText />}
          title="URL总数"
          originalValue={uploadData.total_urls}
          filteredValue={filteredData?.total_filtered}
        />
        
        <StatCard
          icon={<FiGlobe />}
          title="域名数量"
          originalValue={uploadData.top_level_domains.length}
        />
        
        <StatCard
          icon={<FiLayers />}
          title="最大URL深度"
          originalValue={Math.max(...Object.keys(uploadData.url_structure).map(k => parseInt(k)))}
        />
      </div>
      
      {/* 显示URL深度分布 */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">URL深度分布</h4>
        <div className="flex items-end space-x-1 h-32">
          {Object.entries(uploadData.url_structure).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([depth, count]) => {
            const maxCount = Math.max(...Object.values(uploadData.url_structure));
            const percentage = Math.round((count / maxCount) * 100);
            
            return (
              <div 
                key={depth} 
                className="flex flex-col items-center"
                style={{ width: `${100 / Object.keys(uploadData.url_structure).length}%` }}
              >
                <div 
                  className="w-full bg-primary-500 rounded-t"
                  style={{ height: `${percentage}%` }}
                ></div>
                <div className="text-xs mt-1 text-center">
                  <div className="font-medium">{depth}</div>
                  <div className="text-gray-500">{count}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          URL深度 (路径层级数)
        </div>
      </div>
      
      {filteredData && filteredData.total_filtered !== uploadData.total_urls && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
          <div className="font-medium">已应用筛选</div>
          <div className="mt-1">
            显示 {filteredData.total_filtered.toLocaleString()} 个URL，共 {uploadData.total_urls.toLocaleString()} 个URL ({percentageRetained}%)
          </div>
        </div>
      )}
      
      {/* 如果有分析数据，显示更多统计信息 */}
      {analysisData && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">详细分析</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 域名分布 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">域名分布</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(analysisData.domains).sort((a, b) => b[1] - a[1]).map(([domain, count]) => (
                  <div key={domain} className="flex justify-between items-center text-sm">
                    <span className="truncate mr-2">{domain}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 参数分布 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">常见URL参数</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {analysisData.parameters.length > 0 ? (
                  analysisData.parameters.map(([param, count], index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-mono truncate mr-2">{param}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">没有发现URL参数</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitemapStats;