import React from 'react';
import { FiLink, FiList, FiLayers } from 'react-icons/fi';
import { SitemapUploadResponse, SitemapFilterResponse, SitemapAnalysisResponse } from '../../types/sitemap';

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
      <div className="card mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // 如果没有数据，显示提示信息
  if (!uploadData) {
    return (
      <div className="card mb-6">
        <div className="text-center py-6 text-gray-500">
          <FiList className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>上传Sitemap文件以查看统计信息</p>
        </div>
      </div>
    );
  }

  // 计算筛选前后的URL数量百分比
  const totalUrls = uploadData.total_urls;
  const filteredUrls = filteredData?.total_filtered || totalUrls;
  const filteredPercentage = Math.round((filteredUrls / totalUrls) * 100);

  // 构建深度分布数据
  const depthData = uploadData.url_structure || {};
  
  // 获取最大深度值，用于计算柱状图比例
  const maxDepthCount = Object.values(depthData).length > 0 
    ? Math.max(...Object.values(depthData) as number[]) 
    : 0;

  return (
    <>
      {/* Sitemap统计信息 */}
      <div className="card mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Sitemap统计信息</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">总URL数量：</div>
            <div className="font-medium">{totalUrls.toLocaleString()}</div>
          </div>
          
          {filteredData && filteredUrls !== totalUrls && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">筛选后URL数量：</div>
              <div className="font-medium">{filteredUrls.toLocaleString()} ({filteredPercentage}%)</div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">域名数量：</div>
            <div className="font-medium">{uploadData.top_level_domains.length}</div>
          </div>
          
          {analysisData && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">平均URL深度：</div>
                <div className="font-medium">{analysisData.avg_depth?.toFixed(1) || '未知'}</div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">最大URL深度：</div>
                <div className="font-medium">{analysisData.max_depth || '未知'}</div>
              </div>
            </>
          )}
        </div>
        
        {/* 域名列表 */}
        {uploadData.top_level_domains.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">包含的域名：</div>
            <div className="bg-gray-50 p-2 rounded-md max-h-32 overflow-y-auto">
              <ul className="space-y-1">
                {uploadData.top_level_domains.map((domain, index) => (
                  <li key={index} className="text-sm">
                    <span className="inline-block w-4 h-4 bg-primary-100 text-primary-800 text-xs rounded-full text-center mr-2">
                      {index + 1}
                    </span>
                    {domain}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* URL深度分布 */}
      {Object.keys(depthData).length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">URL深度分布</h3>
          
          <div className="space-y-3">
            {Object.entries(depthData)
              .sort(([depthA], [depthB]) => parseInt(depthA) - parseInt(depthB))
              .map(([depth, count]) => {
                // 计算条形图的宽度百分比
                const widthPercentage = maxDepthCount ? Math.round((count as number / maxDepthCount) * 100) : 0;
                
                return (
                  <div key={depth} className="flex items-center">
                    <div className="w-8 text-sm text-right mr-3">{depth}</div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-sm text-xs text-white flex items-center px-2 whitespace-nowrap"
                        style={{ width: `${widthPercentage}%`, minWidth: count ? '30px' : '0' }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          
          <div className="mt-2 text-xs text-gray-500 italic">
            深度: URL路径中的层级数 (例如: /blog/2023/post = 深度3)
          </div>
        </div>
      )}
      
      {/* 扩展性信息区域 - 如果有分析数据的话 */}
      {analysisData && analysisData.depth_distribution && (
        <div className="card mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">URL分析详情</h3>
          
          {analysisData.avg_url_length && (
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">平均URL长度：</div>
              <div className="font-medium">{Math.round(analysisData.avg_url_length)} 字符</div>
            </div>
          )}
          
          {/* 文件类型分布 */}
          {analysisData.extensions && Object.keys(analysisData.extensions).length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">文件类型分布：</div>
              <div className="bg-gray-50 p-3 rounded-md grid grid-cols-2 gap-2 md:grid-cols-3">
                {Object.entries(analysisData.extensions)
                  .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                  .slice(0, 9)
                  .map(([ext, count]) => (
                    <div key={ext} className="flex items-center justify-between">
                      <span className="text-sm font-medium">.{ext}</span>
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                        {count as number}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* 常见URL模式 */}
          {analysisData.url_patterns && analysisData.url_patterns.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">常见URL模式：</div>
              <div className="bg-gray-50 p-3 rounded-md max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {analysisData.url_patterns.slice(0, 5).map((pattern, index) => (
                    <li key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{pattern.pattern}</span>
                        <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                          {pattern.count}个URL
                        </span>
                      </div>
                      {pattern.examples && pattern.examples.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          例如: {pattern.examples[0]}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SitemapStats;