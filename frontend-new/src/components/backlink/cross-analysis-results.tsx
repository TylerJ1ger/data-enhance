// frontend-new/src/components/backlink/cross-analysis-results.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Download, Search, ExternalLink, Maximize2, Minimize2, 
  ArrowLeftRight, ChevronUp, ChevronDown, Filter 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CrossAnalysisResult {
  page_ascore: number;
  source_title: string;
  source_url: string;
  target_url: string;
  anchor: string;
  nofollow: boolean;
}

interface Domain {
  domain: string;
  ascore: number;
}

interface CrossAnalysisResultsProps {
  results: CrossAnalysisResult[];
  domainData?: Domain[]; // 来自第一轮上传的域名数据
  isLoading: boolean;
  onExport: () => void;
}

// 更准确的域名提取函数
const extractRootDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 处理IP地址的情况
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname;
    }
    
    // 提取域名部分
    const hostParts = hostname.split('.');
    
    // 如果只有两部分(如example.com)，直接返回
    if (hostParts.length <= 2) {
      return hostname;
    }
    
    // 常见的顶级域名
    const commonTLDs = [
      'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'ai', 'app',
      'dev', 'me', 'info', 'biz', 'tv', 'us', 'uk', 'cn', 'jp', 'de', 'fr'
    ];
    
    // 检查是否有多级顶级域名，如co.uk, com.au等
    const lastPart = hostParts[hostParts.length - 1];
    const secondLastPart = hostParts[hostParts.length - 2];
    
    // 处理常见的二级顶级域名
    if (
      (secondLastPart === 'co' || secondLastPart === 'com' || secondLastPart === 'org' || secondLastPart === 'gov') && 
      lastPart.length === 2 // 国家代码通常是2个字符
    ) {
      // 如果是形如 example.co.uk 的情况，我们想要返回 example.co.uk
      if (hostParts.length <= 3) {
        return hostname;
      }
      // 否则,形如 subdomain.example.co.uk，我们想要返回 example.co.uk
      return `${hostParts[hostParts.length - 3]}.${secondLastPart}.${lastPart}`;
    }
    
    // 其他情况，返回主域名和TLD，如subdomain.example.com返回example.com
    if (commonTLDs.includes(lastPart)) {
      return `${hostParts[hostParts.length - 2]}.${lastPart}`;
    }
    
    // 对于不常见的TLD，可能是多段式的，如example.something.ai
    // 在没有更复杂的规则的情况下，默认返回最后两段
    return `${hostParts[hostParts.length - 2]}.${lastPart}`;
    
  } catch (e) {
    // 如果URL解析失败，尝试从字符串中提取类似域名的部分
    const domainMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (domainMatch && domainMatch[1]) {
      return domainMatch[1].toLowerCase();
    }
    return url.toLowerCase();
  }
};

export function CrossAnalysisResults({
  results,
  domainData = [],
  isLoading,
  onExport
}: CrossAnalysisResultsProps) {
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 其他状态
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof CrossAnalysisResult>('page_ascore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [displayMode, setDisplayMode] = useState<'flat' | 'compare'>('flat');
  const [cellDisplayType, setCellDisplayType] = useState<'target_url' | 'source_title' | 'source_url' | 'anchor' | 'nofollow'>('target_url');
  const [compareSort, setCompareSort] = useState<'ascore' | 'domain'>('ascore');
  const [compareSortDirection, setCompareSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // 表头固定相关
  const filterRef = useRef<HTMLDivElement>(null);
  
  // 表格列宽管理相关
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    page_ascore: 100,
    source_title: 200,
    source_url: 200,
    target_url: 200,
    anchor: 150,
    nofollow: 100,
    domain: 150
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartPosition = useRef<number>(0);
  const initialWidth = useRef<number>(0);
  
  // 优化3: 筛选框展开/收起状态
  const [filterExpanded, setFilterExpanded] = useState(true);
  
  // 响应式设计相关
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 表格相关引用
  const tableRef = useRef<HTMLDivElement>(null);

  // 计算筛选区域高度并设置CSS变量
  useEffect(() => {
    const updateFilterHeight = () => {
      if (filterRef.current) {
        const height = filterExpanded ? filterRef.current.offsetHeight : 36; // 收起时高度
        document.documentElement.style.setProperty('--filter-height', `${height}px`);
      }
    };
    
    // 初始计算
    updateFilterHeight();
    
    // 当窗口大小改变时重新计算
    window.addEventListener('resize', updateFilterHeight);
    
    // 当显示模式或筛选框状态改变时也重新计算
    const timer = setTimeout(updateFilterHeight, 100);
    
    return () => {
      window.removeEventListener('resize', updateFilterHeight);
      clearTimeout(timer);
    };
  }, [displayMode, cellDisplayType, filterExpanded]);
  
  // 检测是否是移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // 处理全屏模式
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // 筛选结果
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return results.filter(result => {
      const searchLower = searchTerm.toLowerCase();
      return (
        result.source_url.toLowerCase().includes(searchLower) ||
        result.target_url.toLowerCase().includes(searchLower) ||
        (result.source_title && result.source_title.toLowerCase().includes(searchLower)) ||
        (result.anchor && result.anchor.toLowerCase().includes(searchLower))
      );
    });
  }, [results, searchTerm]);

  // 排序后的结果
  const sortedResults = useMemo(() => {
    if (!filteredResults) return [];
    
    return [...filteredResults].sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      } else {
        const strA = String(valueA || '').toLowerCase();
        const strB = String(valueB || '').toLowerCase();
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
    });
  }, [filteredResults, sortColumn, sortDirection]);

  // 虚拟滚动 - 只计算可见的行
  const visibleRowCount = 20; // 大约可同时看到的行数
  
  // 计算分页数据 - 优化版本
  const paginatedResults = useMemo(() => {
    if (itemsPerPage === -1) {
      // 如果设置为显示全部，使用虚拟滚动优化
      return sortedResults;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedResults, currentPage, itemsPerPage]);

  // 计算总页数
  const pageCount = useMemo(() => {
    if (itemsPerPage === -1) return 1;
    return Math.max(1, Math.ceil(sortedResults.length / itemsPerPage));
  }, [sortedResults.length, itemsPerPage]);

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理排序逻辑
  const handleSort = (column: keyof CrossAnalysisResult) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 处理对比视图排序
  const handleCompareSort = (column: 'ascore' | 'domain') => {
    if (compareSort === column) {
      setCompareSortDirection(compareSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCompareSort(column);
      setCompareSortDirection('desc');
    }
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // 重置到第一页
  };

  // 获取排序图标
  const getSortIcon = (column: keyof CrossAnalysisResult) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // 获取对比视图排序图标
  const getCompareSortIcon = (column: 'ascore' | 'domain') => {
    if (compareSort !== column) return null;
    return compareSortDirection === 'asc' ? '↑' : '↓';
  };
  
  // 优化2: 修复列宽调整函数
  const startColumnResizing = (
    e: React.MouseEvent<HTMLDivElement>,
    columnName: string
  ) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件传播，避免触发其他点击事件
    
    setIsResizing(true);
    setResizingColumn(columnName);
    resizeStartPosition.current = e.clientX;
    initialWidth.current = columnWidths[columnName] || 100;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isResizing && resizingColumn) {
        moveEvent.preventDefault(); // 防止选中文本
        const delta = moveEvent.clientX - resizeStartPosition.current;
        const newWidth = Math.max(60, initialWidth.current + delta); // 最小宽度60px
        
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }));
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // 确保移除之前添加的事件监听器，防止多次绑定
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // 添加新的事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 为对比视图处理数据
  const comparisonData = useMemo(() => {
    // 从结果中提取所有唯一的目标域名
    const targetDomains = new Set<string>();
    
    // 解析每个结果的目标域名
    results.forEach(result => {
      const targetDomain = extractRootDomain(result.target_url);
      targetDomains.add(targetDomain);
    });
    
    // 创建源域名到结果的映射
    const sourceToTargets = new Map<string, Map<string, CrossAnalysisResult>>();
    
    // 处理每个结果，填充映射
    results.forEach(result => {
      const sourceDomain = extractRootDomain(result.source_url);
      const targetDomain = extractRootDomain(result.target_url);
      
      if (!sourceToTargets.has(sourceDomain)) {
        sourceToTargets.set(sourceDomain, new Map());
      }
      
      const targetsMap = sourceToTargets.get(sourceDomain)!;
      
      // 如果这个目标域名还没有结果，或者新结果的权重更高，则更新
      if (!targetsMap.has(targetDomain) || 
          result.page_ascore > targetsMap.get(targetDomain)!.page_ascore) {
        targetsMap.set(targetDomain, result);
      }
    });
    
    // 定义域名数据集
    let domainsWithScores: {domain: string, ascore: number}[] = [];
    
    // 如果提供了域名数据，使用它
    if (domainData && domainData.length > 0) {
      domainsWithScores = domainData;
    } else {
      // 否则，从结果中提取域名和尝试找到权重
      Array.from(sourceToTargets.keys()).forEach(domain => {
        // 尝试找到这个域名的示例结果，获取权重
        const exampleResult = Array.from(sourceToTargets.get(domain)!.values())[0];
        domainsWithScores.push({
          domain,
          ascore: exampleResult ? exampleResult.page_ascore : 0
        });
      });
    }
    
    // 排序域名
    const sortedDomains = [...domainsWithScores].sort((a, b) => {
      if (compareSort === 'ascore') {
        return compareSortDirection === 'asc' 
          ? a.ascore - b.ascore 
          : b.ascore - a.ascore;
      } else {
        return compareSortDirection === 'asc'
          ? a.domain.localeCompare(b.domain)
          : b.domain.localeCompare(a.domain);
      }
    });
    
    // 排序目标域名
    const sortedTargetDomains = Array.from(targetDomains).sort();
    
    // 构建最终的表格数据
    return {
      domains: sortedDomains.map(({domain, ascore}) => ({
        domain,
        ascore,
        targets: sortedTargetDomains.map(targetDomain => {
          if (!sourceToTargets.has(domain)) return null;
          return sourceToTargets.get(domain)!.get(targetDomain) || null;
        })
      })),
      targetDomains: sortedTargetDomains
    };
  }, [results, domainData, compareSort, compareSortDirection]);

  // 分页对比视图数据
  const paginatedComparisonData = useMemo(() => {
    if (!comparisonData || !comparisonData.domains) return comparisonData;
    
    if (itemsPerPage === -1) return comparisonData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedDomains = comparisonData.domains.slice(startIndex, startIndex + itemsPerPage);
    
    return {
      ...comparisonData,
      domains: paginatedDomains
    };
  }, [comparisonData, currentPage, itemsPerPage]);

  // 获取要显示的单元格值
  const getCellValue = (result: CrossAnalysisResult | null, type: string) => {
    if (!result) return "None";
    
    switch(type) {
      case 'target_url':
        return result.target_url;
      case 'source_title':
        return result.source_title || "无标题";
      case 'source_url':
        return result.source_url;
      case 'anchor':
        return result.anchor || "无锚文本";
      case 'nofollow':
        return result.nofollow ? "是" : "否";
      default:
        return result.target_url;
    }
  };

  // 渲染分页控件
  const renderPagination = () => {
    if (pageCount <= 1 && itemsPerPage !== -1) return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
        <div className="flex items-center text-sm text-muted-foreground">
          {itemsPerPage === -1 ? (
            <>显示全部 {sortedResults.length} 条记录</>
          ) : (
            <>
              显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedResults.length)} 条，
              共 {sortedResults.length} 条记录
            </>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每页显示:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 条</SelectItem>
                <SelectItem value="50">50 条</SelectItem>
                <SelectItem value="100">100 条</SelectItem>
                <SelectItem value="500">500 条</SelectItem>
                <SelectItem value="1000">1000 条</SelectItem>
                <SelectItem value="2000">2000 条</SelectItem>
                <SelectItem value="-1">全部</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {itemsPerPage !== -1 && pageCount > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                  let pageNum = i + 1;
                  
                  // 调整页码显示，使当前页尽量居中
                  if (pageCount > 5) {
                    if (currentPage > 3 && currentPage < pageCount - 1) {
                      pageNum = currentPage - 2 + i;
                    } else if (currentPage >= pageCount - 1) {
                      pageNum = pageCount - 4 + i;
                    }
                  }
                  
                  // 确保页码在有效范围内
                  if (pageNum <= 0 || pageNum > pageCount) return null;
                  
                  // 当页码大于1且不是第一个显示项时，显示省略号
                  if (i === 0 && pageNum > 1) {
                    return (
                      <PaginationItem key="start-ellipsis">
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(1);
                          }}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  // 当页码小于总页数且是最后一个显示项时，显示省略号
                  if (i === Math.min(5, pageCount) - 1 && pageNum < pageCount) {
                    return (
                      <PaginationItem key="end-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(pageNum);
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {pageCount > 5 && currentPage < pageCount - 2 && (
                  <PaginationItem>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(pageCount);
                      }}
                    >
                      {pageCount}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < pageCount) handlePageChange(currentPage + 1);
                    }}
                    aria-disabled={currentPage === pageCount}
                    className={currentPage === pageCount ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    );
  };
  
  // 自定义表头单元格组件 - 支持调整列宽
  const ResizableHeaderCell = ({ 
    children, 
    column, 
    className, 
    onClick,
    width,
    ...props 
  }: {
    children: React.ReactNode,
    column: string,
    className?: string,
    onClick?: () => void,
    width?: number,
    [key: string]: any
  }) => {
    return (
      <TableHead 
        className={cn(className, "relative group")} 
        onClick={onClick}
        style={{ width: width ? `${width}px` : undefined }}
        {...props}
      >
        {children}
        {/* 优化2: 修改拖动手柄样式 */}
        <div
          className="absolute top-0 right-0 h-full w-4 cursor-col-resize bg-transparent group-hover:bg-primary/10 hover:bg-primary/20 -mr-2"
          onMouseDown={(e) => startColumnResizing(e, column)}
          onClick={(e) => e.stopPropagation()} // 阻止点击事件传播到表头
          style={{ touchAction: 'none' }} // 阻止触摸事件的默认行为
        />
      </TableHead>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-[250px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>交叉分析结果</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              暂无匹配结果。请尝试上传不同的文件或检查数据格式是否正确。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "w-full transition-all duration-300", 
      isFullscreen && "fixed inset-0 z-50 rounded-none max-h-screen h-screen overflow-hidden"
    )}>
      <CardHeader className="sticky top-0 z-20 bg-card pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CardTitle>交叉分析结果</CardTitle>
            <Badge variant="secondary">{filteredResults.length} 条匹配</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 响应式 - 全屏切换按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? '退出全屏' : '全屏模式'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 导出按钮 */}
            <Button onClick={onExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              导出结果
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* 优化3: 添加可展开/收起的筛选区域 */}
      <div 
        className={cn(
          "sticky top-[69px] z-10 bg-card border-b transition-all duration-300 overflow-hidden",
          !filterExpanded && "max-h-[36px]" // 收起时的最大高度
        )} 
        ref={filterRef}
      >
        {/* 筛选区域控制栏 */}
        <div 
          className="flex justify-between items-center px-4 py-2 bg-muted/20 cursor-pointer" 
          onClick={() => setFilterExpanded(!filterExpanded)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">筛选与展示选项</span>
            {!filterExpanded && searchTerm && (
              <Badge variant="outline" className="ml-2">
                搜索: {searchTerm}
              </Badge>
            )}
          </div>
          <div>
            {filterExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* 筛选区域内容 */}
        <div className={cn(
          "p-4 transition-all duration-300",
          !filterExpanded && "hidden"
        )}>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:max-w-sm relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索源URL、目标URL或锚文本..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              {displayMode === 'flat' && (
                <>
                  <span className="text-sm text-muted-foreground hidden md:inline">排序方式:</span>
                  <Select
                    value={`${sortColumn}-${sortDirection}`}
                    onValueChange={(value) => {
                      const [column, direction] = value.split('-') as [keyof CrossAnalysisResult, 'asc' | 'desc'];
                      setSortColumn(column);
                      setSortDirection(direction);
                    }}
                  >
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page_ascore-desc">页面权重 (高到低)</SelectItem>
                      <SelectItem value="page_ascore-asc">页面权重 (低到高)</SelectItem>
                      <SelectItem value="source_url-asc">源URL (A-Z)</SelectItem>
                      <SelectItem value="source_url-desc">源URL (Z-A)</SelectItem>
                      <SelectItem value="target_url-asc">目标URL (A-Z)</SelectItem>
                      <SelectItem value="target_url-desc">目标URL (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {/* 添加切换Tab的组件 */}
              <Tabs 
                defaultValue="flat" 
                className="w-[200px]"
                onValueChange={(value) => {
                  setDisplayMode(value as 'flat' | 'compare');
                  setCurrentPage(1); // 切换视图时重置到第一页
                }}
                value={displayMode}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="flat">平铺</TabsTrigger>
                  <TabsTrigger value="compare">对比</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* 对比视图的额外控制选项 */}
          {displayMode === 'compare' && (
            <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden md:inline">排序方式:</span>
                <Select
                  value={`${compareSort}-${compareSortDirection}`}
                  onValueChange={(value) => {
                    const [column, direction] = value.split('-') as ['ascore' | 'domain', 'asc' | 'desc'];
                    setCompareSort(column);
                    setCompareSortDirection(direction);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ascore-desc">站点权重 (高到低)</SelectItem>
                    <SelectItem value="ascore-asc">站点权重 (低到高)</SelectItem>
                    <SelectItem value="domain-asc">站点域名 (A-Z)</SelectItem>
                    <SelectItem value="domain-desc">站点域名 (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden md:inline">显示内容:</span>
                <Select
                  value={cellDisplayType}
                  onValueChange={(value) => setCellDisplayType(value as any)}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="target_url">目标URL</SelectItem>
                    <SelectItem value="source_title">来源标题</SelectItem>
                    <SelectItem value="source_url">来源URL</SelectItem>
                    <SelectItem value="anchor">锚文本</SelectItem>
                    <SelectItem value="nofollow">Nofollow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 移动设备下的提示 */}
              {isMobile && (
                <div className="w-full mt-2">
                  <Alert>
                    <AlertDescription className="text-xs">
                      在移动设备上，表格可能需要横向滚动查看全部内容。使用双指滑动可查看表格。
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 上部分页控件 - 只在筛选框展开时显示 */}
        {filterExpanded && renderPagination()}
      </div>
      
      <CardContent className="p-0">
        {/* 固定的表头部分 - 平铺视图 */}
        {displayMode === 'flat' && (
          <div className="sticky top-[calc(69px+var(--filter-height,36px))] z-10 border-b bg-card">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <ResizableHeaderCell 
                    column="page_ascore"
                    width={columnWidths.page_ascore}
                    onClick={() => handleSort('page_ascore')}
                  >
                    页面权重 {getSortIcon('page_ascore')}
                  </ResizableHeaderCell>
                  <ResizableHeaderCell
                    column="source_title"
                    width={columnWidths.source_title}
                    onClick={() => handleSort('source_title')}
                  >
                    来源标题 {getSortIcon('source_title')}
                  </ResizableHeaderCell>
                  <ResizableHeaderCell
                    column="source_url"
                    width={columnWidths.source_url}
                    onClick={() => handleSort('source_url')}
                  >
                    来源URL {getSortIcon('source_url')}
                  </ResizableHeaderCell>
                  <ResizableHeaderCell
                    column="target_url"
                    width={columnWidths.target_url}
                    onClick={() => handleSort('target_url')}
                  >
                    目标URL {getSortIcon('target_url')}
                  </ResizableHeaderCell>
                  <ResizableHeaderCell
                    column="anchor"
                    width={columnWidths.anchor}
                  >
                    锚文本
                  </ResizableHeaderCell>
                  <ResizableHeaderCell
                    column="nofollow"
                    width={columnWidths.nofollow}
                    className="text-center"
                  >
                    Nofollow
                  </ResizableHeaderCell>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        )}
        
        {/* 固定的表头部分 - 对比视图 */}
        {displayMode === 'compare' && comparisonData && (
          <div className="sticky top-[calc(69px+var(--filter-height,36px))] z-10 border-b bg-card overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <ResizableHeaderCell 
                    column="ascore"
                    width={columnWidths.page_ascore}
                    onClick={() => handleCompareSort('ascore')}
                  >
                    站点权重 {getCompareSortIcon('ascore')}
                  </ResizableHeaderCell>
                  <ResizableHeaderCell 
                    column="domain"
                    width={columnWidths.domain}
                    onClick={() => handleCompareSort('domain')}
                  >
                    站点域名 {getCompareSortIcon('domain')}
                  </ResizableHeaderCell>
                  {comparisonData.targetDomains.map((domain, index) => (
                    <ResizableHeaderCell 
                      key={index} 
                      column={`target_${index}`}
                      width={columnWidths[`target_${index}`] || 200}
                      className="min-w-[200px]"
                    >
                      {domain}
                    </ResizableHeaderCell>
                  ))}
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        )}
        
        {/* 滚动内容区域 */}
        <ScrollArea 
          className={cn(
            "h-[600px]", 
            isFullscreen && "h-[calc(100vh-var(--filter-height,36px)-69px-50px)]"
          )} 
          type="always"
          ref={tableRef}
        >
          {/* 平铺视图内容 */}
          {displayMode === 'flat' && (
            <div className="rounded-md" id="table-content">
              <Table>
                {/* 表体内容 */}
                <TableBody>
                  {paginatedResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        未找到匹配的结果
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedResults.map((result, index) => (
                      /* 优化1: 使用CSS :hover伪类，移除JavaScript的hover状态跟踪 */
                      <TableRow 
                        key={index}
                        className={cn(
                          "transition-none", // 防止过渡动画导致的视觉延迟
                          index % 2 === 0 && "bg-muted/10", // 斑马条纹效果
                          "hover:bg-muted/50" // 使用CSS hover效果替代JavaScript状态
                        )}
                      >
                        <TableCell 
                          className="font-medium"
                          style={{ width: `${columnWidths.page_ascore}px` }}
                        >
                          {result.page_ascore}
                        </TableCell>
                        <TableCell 
                          className="max-w-[200px] truncate" 
                          title={result.source_title}
                          style={{ width: `${columnWidths.source_title}px` }}
                        >
                          {result.source_title || '-'}
                        </TableCell>
                        <TableCell 
                          className="max-w-[200px] truncate"
                          style={{ width: `${columnWidths.source_url}px` }}
                        >
                          <a 
                            href={result.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            title={result.source_url}
                          >
                            <span className="truncate">{result.source_url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell 
                          className="max-w-[200px] truncate"
                          style={{ width: `${columnWidths.target_url}px` }}
                        >
                          <a 
                            href={result.target_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            title={result.target_url}
                          >
                            <span className="truncate">{result.target_url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell 
                          className="max-w-[150px] truncate" 
                          title={result.anchor}
                          style={{ width: `${columnWidths.anchor}px` }}
                        >
                          {result.anchor || '-'}
                        </TableCell>
                        <TableCell 
                          className="text-center"
                          style={{ width: `${columnWidths.nofollow}px` }}
                        >
                          {result.nofollow ? (
                            <Badge variant="secondary">是</Badge>
                          ) : (
                            <Badge variant="outline">否</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* 对比视图内容 */}
          {displayMode === 'compare' && (
            <div className="rounded-md">
              <Table>
                {/* 表体内容 */}
                <TableBody>
                  {paginatedComparisonData.domains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2 + comparisonData.targetDomains.length} className="text-center py-6 text-muted-foreground">
                        未找到匹配的结果
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedComparisonData.domains.map((item, index) => (
                      /* 优化1: 使用CSS :hover伪类，移除JavaScript的hover状态跟踪 */
                      <TableRow 
                        key={index}
                        className={cn(
                          "transition-none", // 防止过渡动画导致的视觉延迟
                          index % 2 === 0 && "bg-muted/10", // 斑马条纹效果
                          "hover:bg-muted/50" // 使用CSS hover效果替代JavaScript状态
                        )}
                      >
                        <TableCell 
                          className="font-medium"
                          style={{ width: `${columnWidths.page_ascore}px` }}
                        >
                          {item.ascore}
                        </TableCell>
                        <TableCell 
                          className="font-medium"
                          style={{ width: `${columnWidths.domain}px` }}
                        >
                          {item.domain}
                        </TableCell>
                        {item.targets.map((result, targetIndex) => (
                          <TableCell 
                            key={targetIndex} 
                            className="max-w-[200px] truncate"
                            style={{ width: `${columnWidths[`target_${targetIndex}`] || 200}px` }}
                          >
                            {result ? (
                              cellDisplayType === 'target_url' || cellDisplayType === 'source_url' ? (
                                <a 
                                  href={getCellValue(result, cellDisplayType)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                  title={getCellValue(result, cellDisplayType)}
                                >
                                  <span className="truncate">{getCellValue(result, cellDisplayType)}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                              ) : cellDisplayType === 'nofollow' ? (
                                <Badge variant={result.nofollow ? "secondary" : "outline"}>
                                  {getCellValue(result, cellDisplayType)}
                                </Badge>
                              ) : (
                                <span title={getCellValue(result, cellDisplayType)} className="truncate block">
                                  {getCellValue(result, cellDisplayType)}
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>
        
        {/* 底部分页控件 */}
        {renderPagination()}
        
        {/* 移动设备滑动控制 */}
        {isMobile && (
          <div className="flex items-center justify-center gap-4 py-2 bg-muted/20 border-t">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">水平滑动可查看更多内容</span>
          </div>
        )}
        
        {/* 优化2: 改进列宽调整提示 */}
        {isResizing && (
          <div className="fixed bottom-4 right-4 bg-background border shadow-lg rounded-md p-2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{resizingColumn} 列宽: {columnWidths[resizingColumn || ''] || 0}px</span>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* 优化3: 添加筛选框收起时的快速切换按钮 */}
      {!filterExpanded && (
        <div className="fixed bottom-4 left-4 z-30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="secondary"
                  onClick={() => setFilterExpanded(true)}
                  className="rounded-full shadow-lg"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                展开筛选选项
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </Card>
  );
}