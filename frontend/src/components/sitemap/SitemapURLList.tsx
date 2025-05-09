import React, { useState, useEffect } from 'react';
import { FiSearch, FiExternalLink, FiFilter, FiDownload, FiInfo } from 'react-icons/fi';
import { SitemapFilterResponse } from '../../types';
import Button from '../common/Button';

interface SitemapURLListProps {
  urlData: SitemapFilterResponse | null;
  isLoading?: boolean;
  onExport?: () => void;
}

const SitemapURLList: React.FC<SitemapURLListProps> = ({
  urlData,
  isLoading = false,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filteredUrls, setFilteredUrls] = useState<string[]>([]);

  // 过滤URL并分页
  useEffect(() => {
    if (!urlData || !urlData.filtered_urls) {
      setFilteredUrls([]);
      return;
    }

    let urls = [...urlData.filtered_urls];
    
    // 搜索过滤
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      urls = urls.filter(url => url.toLowerCase().includes(term));
    }
    
    setFilteredUrls(urls);
    setCurrentPage(1); // 重置到第一页
  }, [urlData, searchTerm]);

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!urlData || urlData.filtered_urls.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-6 text-gray-500">
          <FiSearch className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>没有URL数据可显示</p>
        </div>
      </div>
    );
  }

  // 计算总页数
  const totalPages = Math.ceil(filteredUrls.length / itemsPerPage);
  
  // 获取当前页的数据
  const currentUrls = filteredUrls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 翻页处理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 每页显示数量变化处理
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // 重置到第一页
  };

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">URL列表</h3>
      
      {/* 搜索和操作 */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex-grow">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="搜索URL..."
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">每页显示:</span>
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded-md text-sm p-1"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        {onExport && (
          <Button
            variant="secondary"
            size="sm"
            icon={<FiDownload />}
            onClick={onExport}
          >
            导出所有URL
          </Button>
        )}
      </div>
      
      {/* 统计信息 */}
      <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-md text-sm">
        <FiInfo className="text-gray-500 mr-2" />
        显示 {filteredUrls.length} 个URL {searchTerm ? `(已筛选: "${searchTerm}")` : ''}
      </div>
      
      {/* URL列表 */}
      <div className="border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUrls.map((url, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900 break-all">
                    {url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary-600 hover:text-primary-800"
                    >
                      <FiExternalLink className="mr-1" />
                      访问
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUrls.length)} 项，共 {filteredUrls.length} 项
          </div>
          
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              首页
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              上一页
            </button>
            
            <span className="px-2 py-1 text-sm">
              第 {currentPage} / {totalPages} 页
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              下一页
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              末页
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default SitemapURLList;