import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiSearch, FiExternalLink, FiFilter, FiDownload, FiInfo, FiCopy, FiChevronDown, FiChevronUp, FiRefreshCw, FiClipboard } from 'react-icons/fi';
import { SitemapFilterResponse } from '../../types';
import Button from '../common/Button';

interface SitemapURLListProps {
  urlData: SitemapFilterResponse | null;
  isLoading?: boolean;
  onExport?: () => void;
}

// URL组分类辅助函数
const getDomainFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    // 如果URL解析失败，尝试基本提取
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/i);
    return match ? match[1] : url;
  }
};

const getPathFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch (e) {
    // 如果URL解析失败，尝试基本提取
    const match = url.match(/^(?:https?:\/\/)?[^\/]+(\/.+)/i);
    return match ? match[1] : '';
  }
};

// 检查是否为哈希路径的辅助函数
const isHashLikePath = (path: string): boolean => {
  // 提取路径的最后一段
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  
  const lastSegment = segments[segments.length - 1];
  
  // 识别常见的哈希格式: 长度超过12且包含随机字符
  return lastSegment.length >= 12 && 
         /^[a-zA-Z0-9_-]+$/.test(lastSegment) &&
         // 增加熵检测 - 如果有连续的字母和数字则更可能是哈希
         /[0-9]{2,}/.test(lastSegment) && 
         /[a-zA-Z]{2,}/.test(lastSegment);
};

const SitemapURLList: React.FC<SitemapURLListProps> = ({
  urlData,
  isLoading = false,
  onExport,
}) => {
  // 基本状态
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [advancedSearch, setAdvancedSearch] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filteredUrls, setFilteredUrls] = useState<string[]>([]);
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // 分组和展示控制
  const [showDomainGroups, setShowDomainGroups] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [groupSimilarPaths, setGroupSimilarPaths] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  
  // URL类型过滤
  const [showHashUrls, setShowHashUrls] = useState(true);
  const [pathFilter, setPathFilter] = useState('');
  const [extensionFilter, setExtensionFilter] = useState('');
  
  // 复制功能状态
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // 处理URL并进行分页
  useEffect(() => {
    if (!urlData || !urlData.filtered_urls) {
      setFilteredUrls([]);
      return;
    }

    // 开始搜索
    setSearchInProgress(true);
    
    // 清除上一个防抖定时器
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
    
    // 设置新的防抖定时器
    const timeout = setTimeout(() => {
      // 所有URL
      let urls = [...urlData.filtered_urls];
      
      // 过滤哈希路径URL
      if (!showHashUrls) {
        urls = urls.filter(url => !isHashLikePath(getPathFromUrl(url)));
      }
      
      // 路径过滤
      if (pathFilter.trim()) {
        urls = urls.filter(url => getPathFromUrl(url).includes(pathFilter.trim()));
      }
      
      // 扩展名过滤
      if (extensionFilter.trim()) {
        const extPattern = new RegExp(`\\.${extensionFilter.trim()}(\\?|#|$)`, 'i');
        urls = urls.filter(url => extPattern.test(url));
      }
      
      // 搜索过滤
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        
        // 简单搜索或高级搜索
        if (!advancedSearch) {
          // 基本搜索 - 整体URL中包含搜索词
          urls = urls.filter(url => url.toLowerCase().includes(term));
        } else {
          // 高级搜索 - 支持多个搜索词与操作符
          const searchTerms = term.split(/\s+/);
          
          urls = urls.filter(url => {
            const urlLower = url.toLowerCase();
            return searchTerms.every(searchTerm => {
              // 排除条件（以减号开头）
              if (searchTerm.startsWith('-')) {
                return !urlLower.includes(searchTerm.substring(1));
              }
              // 必须包含（默认或以加号开头）
              return urlLower.includes(searchTerm.startsWith('+') ? searchTerm.substring(1) : searchTerm);
            });
          });
        }
      }
      
      setFilteredUrls(urls);
      setCurrentPage(1); // 重置到第一页
      setSearchInProgress(false);
    }, 300); // 300ms的防抖延迟
    
    setSearchDebounceTimeout(timeout);
    
    // 清理函数
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [urlData, searchTerm, advancedSearch, showHashUrls, pathFilter, extensionFilter]);

  // 处理分组显示的URL
  const groupedUrls = useMemo(() => {
    if (!showDomainGroups) return null;
    
    // 按域名分组
    const groups: Record<string, string[]> = {};
    
    filteredUrls.forEach(url => {
      const domain = getDomainFromUrl(url);
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(url);
    });
    
    // 如果启用了路径相似性分组
    if (groupSimilarPaths) {
      // 对每个域的URL进行进一步分组
      Object.keys(groups).forEach(domain => {
        const domainUrls = groups[domain];
        const pathGroups: Record<string, string[]> = {};
        
        // 基于路径前缀进行分组
        domainUrls.forEach(url => {
          const path = getPathFromUrl(url);
          const segments = path.split('/').filter(Boolean);
          
          // 用路径的前两段作为分组键
          const groupKey = segments.length > 0 
            ? `/${segments.slice(0, Math.min(2, segments.length)).join('/')}` 
            : '/';
          
          if (!pathGroups[groupKey]) {
            pathGroups[groupKey] = [];
          }
          pathGroups[groupKey].push(url);
        });
        
        // 替换原始URL列表为分组后的结构
        groups[domain] = Object.entries(pathGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .flatMap(([prefix, urls]) => urls);
      });
    }
    
    return groups;
  }, [filteredUrls, showDomainGroups, groupSimilarPaths]);

  // 计算总页数
  const totalPages = Math.ceil(filteredUrls.length / itemsPerPage);
  
  // 获取当前页的数据
  const currentUrls = useMemo(() => {
    if (showDomainGroups && groupedUrls) {
      // 为分组视图返回所有URL，分页在渲染时处理
      return filteredUrls;
    }
    
    // 标准列表视图分页
    return filteredUrls.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUrls, currentPage, itemsPerPage, showDomainGroups, groupedUrls]);

  // 翻页处理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // 滚动到列表顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 每页显示数量变化处理
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // 重置到第一页
  };
  
  // 切换域名展开/折叠状态
  const toggleDomainExpanded = (domain: string) => {
    const newExpandedDomains = new Set(expandedDomains);
    if (newExpandedDomains.has(domain)) {
      newExpandedDomains.delete(domain);
    } else {
      newExpandedDomains.add(domain);
    }
    setExpandedDomains(newExpandedDomains);
  };
  
  // 复制URL到剪贴板
  const copyToClipboard = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000); // 2秒后重置复制状态
      },
      (err) => {
        console.error('复制失败:', err);
      }
    );
  }, []);
  
  // 复制所有URL到剪贴板
  const copyAllUrls = () => {
    const textToCopy = filteredUrls.join('\n');
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        alert(`已复制 ${filteredUrls.length} 个URL到剪贴板`);
      },
      (err) => {
        console.error('批量复制失败:', err);
        alert('复制失败，请重试');
      }
    );
  };
  
  // 渲染URL表格
  const renderUrlTable = () => {
    if (showDomainGroups && groupedUrls) {
      // 分组视图
      return (
        <div className="space-y-4">
          {Object.entries(groupedUrls).map(([domain, urls]) => (
            <div key={domain} className="border rounded-lg overflow-hidden">
              <div 
                className="bg-gray-100 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleDomainExpanded(domain)}
              >
                <div className="font-medium flex items-center">
                  {expandedDomains.has(domain) ? 
                    <FiChevronUp className="mr-2" /> : 
                    <FiChevronDown className="mr-2" />
                  }
                  {domain}
                </div>
                <div className="text-sm text-gray-500">{urls.length} URLs</div>
              </div>
              
              {expandedDomains.has(domain) && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">路径</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {urls.map((url, index) => {
                        const path = getPathFromUrl(url);
                        const isHashPath = isHashLikePath(path);
                        
                        return (
                          <tr key={index} className={`hover:bg-gray-50 ${isHashPath ? 'bg-gray-50' : ''}`}>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-6 py-3 text-sm font-mono text-gray-900 break-all">
                              {path || '/'}
                              {isHashPath && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1 py-0.5 rounded">哈希ID</span>}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-primary-600 hover:text-primary-800"
                                >
                                  <FiExternalLink className="mr-1" />
                                  访问
                                </a>
                                <button 
                                  onClick={() => copyToClipboard(url)}
                                  className="inline-flex items-center text-gray-600 hover:text-gray-800"
                                >
                                  <FiCopy className="mr-1" />
                                  {copiedUrl === url ? '已复制' : '复制'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // 标准列表视图
    return (
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
              {currentUrls.map((url, index) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                const isHashPath = isHashLikePath(getPathFromUrl(url));
                
                return (
                  <tr key={index} className={`hover:bg-gray-50 ${isHashPath ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {actualIndex}
                    </td>
                    <td className="px-6 py-3 text-sm font-mono text-gray-900 break-all">
                      {url}
                      {isHashPath && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1 py-0.5 rounded">哈希ID</span>}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary-600 hover:text-primary-800"
                        >
                          <FiExternalLink className="mr-1" />
                          访问
                        </a>
                        <button 
                          onClick={() => copyToClipboard(url)}
                          className="inline-flex items-center text-gray-600 hover:text-gray-800"
                        >
                          <FiCopy className="mr-1" />
                          {copiedUrl === url ? '已复制' : '复制'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
              placeholder={advancedSearch ? "高级搜索: 使用 + 和 - 操作符" : "搜索URL..."}
            />
          </div>
          <div className="flex mt-1 text-xs text-gray-500 items-center">
            <input 
              type="checkbox" 
              id="advancedSearch" 
              checked={advancedSearch} 
              onChange={() => setAdvancedSearch(!advancedSearch)}
              className="mr-1"
            />
            <label htmlFor="advancedSearch">启用高级搜索</label>
            {advancedSearch && (
              <span className="ml-2">
                (例如: <code>blog -about</code> 表示包含"blog"但不包含"about")
              </span>
            )}
          </div>
        </div>
        
        {/* 视图切换 */}
        <div className="flex items-center space-x-2">
          <button
            className={`px-2 py-1 text-sm border rounded ${showDomainGroups ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-300'}`}
            onClick={() => setShowDomainGroups(!showDomainGroups)}
          >
            {showDomainGroups ? '分组视图' : '列表视图'}
          </button>
          
          {showDomainGroups && (
            <button
              className={`px-2 py-1 text-sm border rounded ${groupSimilarPaths ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-300'}`}
              onClick={() => setGroupSimilarPaths(!groupSimilarPaths)}
            >
              {groupSimilarPaths ? '路径分组' : '标准分组'}
            </button>
          )}
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
            <option value={200}>200</option>
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
        
        <Button
          variant="secondary"
          size="sm"
          icon={<FiClipboard />}
          onClick={copyAllUrls}
        >
          复制全部URL
        </Button>
      </div>
      
      {/* 高级过滤器 */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="showHashUrls" 
            checked={showHashUrls} 
            onChange={() => setShowHashUrls(!showHashUrls)}
            className="mr-1"
          />
          <label htmlFor="showHashUrls" className="text-sm">显示哈希路径</label>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm">路径过滤:</span>
          <input
            type="text"
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            placeholder="/blog, /products..."
            className="border border-gray-300 rounded-md text-sm p-1 w-32"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm">扩展名:</span>
          <input
            type="text"
            value={extensionFilter}
            onChange={(e) => setExtensionFilter(e.target.value)}
            placeholder="html, php..."
            className="border border-gray-300 rounded-md text-sm p-1 w-24"
          />
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-md text-sm">
        <FiInfo className="text-gray-500 mr-2" />
        <div>
          显示 {filteredUrls.length} 个URL
          {searchTerm ? ` (已筛选: "${searchTerm}")` : ''}
          {!showHashUrls && ' (已隐藏哈希路径)'}
          {pathFilter && ` (路径筛选: "${pathFilter}")`}
          {extensionFilter && ` (扩展名: "${extensionFilter}")`}
        </div>
        {searchInProgress && (
          <div className="ml-2 flex items-center">
            <FiRefreshCw className="animate-spin mr-1 text-primary-500" />
            <span className="text-primary-500">搜索中...</span>
          </div>
        )}
      </div>
      
      {/* URL列表 */}
      {renderUrlTable()}
      
      {/* 分页控制 */}
      {!showDomainGroups && totalPages > 1 && (
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