//frontend-new/src/components/sitemap/sitemap-url-list.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  ExternalLink, 
  Filter, 
  Download, 
  Info, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Clipboard 
} from 'lucide-react';
import { SitemapFilterResponse } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

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

interface SitemapURLListProps {
  urlData: SitemapFilterResponse | null;
  isLoading?: boolean;
  onExport?: () => void;
}

export function SitemapURLList({
  urlData,
  isLoading = false,
  onExport,
}: SitemapURLListProps): React.ReactNode {
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
            <Card key={domain} className="overflow-hidden">
              <div 
                className="bg-muted p-4 flex justify-between items-center cursor-pointer hover:bg-muted/80"
                onClick={() => toggleDomainExpanded(domain)}
              >
                <div className="font-medium flex items-center">
                  {expandedDomains.has(domain) ? 
                    <ChevronUp className="mr-2 h-4 w-4" /> : 
                    <ChevronDown className="mr-2 h-4 w-4" />
                  }
                  {domain}
                </div>
                <div className="text-sm text-muted-foreground">{urls.length} URLs</div>
              </div>
              
              {expandedDomains.has(domain) && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">序号</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">路径</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {urls.map((url, index) => {
                        const path = getPathFromUrl(url);
                        const isHashPath = isHashLikePath(path);
                        
                        return (
                          <tr key={index} className={`hover:bg-muted/50 ${isHashPath ? 'bg-muted/30' : ''}`}>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="px-6 py-3 text-sm font-mono break-all">
                              {path || '/'}
                              {isHashPath && (
                                <Badge variant="outline" className="ml-2 text-xs bg-muted/50">
                                  哈希ID
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                      >
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>访问</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(url)}
                                      >
                                        {copiedUrl === url ? 
                                          <Clipboard className="h-4 w-4" /> : 
                                          <Copy className="h-4 w-4" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{copiedUrl === url ? '已复制' : '复制URL'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      );
    }
    
    // 标准列表视图
    return (
      <Card className="overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">序号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {currentUrls.map((url, index) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                const isHashPath = isHashLikePath(getPathFromUrl(url));
                
                return (
                  <tr key={index} className={`hover:bg-muted/50 ${isHashPath ? 'bg-muted/30' : ''}`}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {actualIndex}
                    </td>
                    <td className="px-6 py-3 text-sm font-mono break-all">
                      {url}
                      {isHashPath && (
                        <Badge variant="outline" className="ml-2 text-xs bg-muted/50">
                          哈希ID
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                              >
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>访问</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(url)}
                              >
                                {copiedUrl === url ? 
                                  <Clipboard className="h-4 w-4" /> : 
                                  <Copy className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{copiedUrl === url ? '已复制' : '复制URL'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!urlData || urlData.filtered_urls.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">没有URL数据可显示</p>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>URL列表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索和操作 */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="flex-grow">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                placeholder={advancedSearch ? "高级搜索: 使用 + 和 - 操作符" : "搜索URL..."}
              />
            </div>
            <div className="flex mt-1 text-xs text-muted-foreground items-center">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="advancedSearch" 
                  checked={advancedSearch} 
                  onCheckedChange={() => setAdvancedSearch(!advancedSearch)}
                />
                <label htmlFor="advancedSearch">启用高级搜索</label>
              </div>
              {advancedSearch && (
                <span className="ml-2">
                  (例如: <code>blog -about</code> 表示包含"blog"但不包含"about")
                </span>
              )}
            </div>
          </div>
          
          {/* 视图切换 */}
          <div className="flex items-center space-x-2">
            <Button
              variant={showDomainGroups ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDomainGroups(!showDomainGroups)}
            >
              {showDomainGroups ? '分组视图' : '列表视图'}
            </Button>
            
            {showDomainGroups && (
              <Button
                variant={groupSimilarPaths ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupSimilarPaths(!groupSimilarPaths)}
              >
                {groupSimilarPaths ? '路径分组' : '标准分组'}
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">每页显示:</span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="20" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="mr-2 h-4 w-4" />
              导出所有URL
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllUrls}
          >
            <Clipboard className="mr-2 h-4 w-4" />
            复制全部URL
          </Button>
        </div>
        
        {/* 高级过滤器 */}
        <div className="mb-4 flex flex-wrap gap-3 p-4 bg-muted/50 rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showHashUrls" 
              checked={showHashUrls} 
              onCheckedChange={(checked) => setShowHashUrls(checked === true)}
            />
            <label htmlFor="showHashUrls" className="text-sm">显示哈希路径</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">路径过滤:</span>
            <Input
              type="text"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="/blog, /products..."
              className="w-32 h-8"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">扩展名:</span>
            <Input
              type="text"
              value={extensionFilter}
              onChange={(e) => setExtensionFilter(e.target.value)}
              placeholder="html, php..."
              className="w-24 h-8"
            />
          </div>
        </div>
        
        {/* 统计信息 */}
        <Alert variant="default" className="bg-muted/50">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            <AlertDescription>
              显示 {filteredUrls.length} 个URL
              {searchTerm ? ` (已筛选: "${searchTerm}")` : ''}
              {!showHashUrls && ' (已隐藏哈希路径)'}
              {pathFilter && ` (路径筛选: "${pathFilter}")`}
              {extensionFilter && ` (扩展名: "${extensionFilter}")`}
              {searchInProgress && (
                <span className="ml-2 flex items-center text-primary">
                  <RefreshCw className="animate-spin mr-1 h-3 w-3" />
                  搜索中...
                </span>
              )}
            </AlertDescription>
          </div>
        </Alert>
        
        {/* URL列表 */}
        {renderUrlTable()}
        
        {/* 分页控制 */}
        {!showDomainGroups && totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUrls.length)} 项，共 {filteredUrls.length} 项
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                首页
              </Button>
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                上一页
              </Button>
              
              <span className="px-2 py-1 text-sm">
                第 {currentPage} / {totalPages} 页
              </span>
              
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                下一页
              </Button>
              <Button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                末页
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}