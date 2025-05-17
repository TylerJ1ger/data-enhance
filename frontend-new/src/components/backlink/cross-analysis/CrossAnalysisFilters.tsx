// frontend-new/src/components/backlink/cross-analysis/CrossAnalysisFilters.tsx
import React, { useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface CrossAnalysisFiltersProps {
  // 搜索和筛选状态
  searchTerm: string;
  onSearchChange: (value: string) => void;
  displayMode: 'flat' | 'compare';
  onDisplayModeChange: (mode: 'flat' | 'compare') => void;
  
  // 排序相关
  sortValue: string;
  onSortChange: (value: string) => void;
  compareSort: string;
  onCompareSortChange: (value: string) => void;
  
  // 单元格显示类型 (仅在对比视图中使用)
  cellDisplayType: string;
  onCellDisplayTypeChange: (type: string) => void;
  
  // 分页相关
  currentPage: number;
  itemsPerPage: number;
  pageCount: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
  
  // 展开/收起状态
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  
  // 移动设备检测
  isMobile: boolean;
}

export function CrossAnalysisFilters({
  searchTerm,
  onSearchChange,
  displayMode,
  onDisplayModeChange,
  sortValue,
  onSortChange,
  compareSort,
  onCompareSortChange,
  cellDisplayType,
  onCellDisplayTypeChange,
  currentPage,
  itemsPerPage,
  pageCount,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  expanded,
  onExpandedChange,
  isMobile
}: CrossAnalysisFiltersProps) {
  const filterRef = useRef<HTMLDivElement>(null);
  
  // 计算筛选区域高度并设置CSS变量
  useEffect(() => {
    const updateFilterHeight = () => {
      if (filterRef.current) {
        const height = expanded ? filterRef.current.offsetHeight : 36; // 收起时高度
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
  }, [displayMode, cellDisplayType, expanded]);
  
  // 渲染分页控件
  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
        <div className="flex items-center text-sm text-muted-foreground">
          {itemsPerPage === -1 ? (
            <>显示全部 {totalItems} 条记录</>
          ) : (
            <>
              显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} 条，
              共 {totalItems} 条记录
            </>
          )}
        </div>
        
        <div className="flex items-end gap-6 w-2xl">
          <div className="flex items-center gap-4 w-xs">
            <span className="text-sm text-muted-foreground w-auto">每页显示:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={onItemsPerPageChange}
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
          
          {/* 分页控件 - 无论是否显示全部，都保留分页UI，但在显示全部时禁用 */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1 && itemsPerPage !== -1) onPageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1 || itemsPerPage === -1}
                  className={currentPage === 1 || itemsPerPage === -1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {/* 只在非全部显示时渲染页码 */}
              {itemsPerPage !== -1 && pageCount > 1 && (
                <>
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
                              onPageChange(1);
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
                            onPageChange(pageNum);
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
                          onPageChange(pageCount);
                        }}
                      >
                        {pageCount}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                </>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < pageCount && itemsPerPage !== -1) onPageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === pageCount || itemsPerPage === -1}
                  className={currentPage === pageCount || itemsPerPage === -1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "sticky top-[69px] z-10 bg-card border-b transition-all duration-300 overflow-hidden",
        !expanded && "max-h-[36px]" // 收起时的最大高度
      )} 
      ref={filterRef}
    >
      {/* 筛选区域控制栏 */}
      <div 
        className="flex justify-between items-center px-4 py-2 bg-muted/20 cursor-pointer" 
        onClick={() => onExpandedChange(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">筛选与展示选项</span>
          {!expanded && searchTerm && (
            <Badge variant="outline" className="ml-2">
              搜索: {searchTerm}
            </Badge>
          )}
        </div>
        <div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {/* 筛选区域内容 */}
      <div className={cn(
        "p-4 transition-all duration-300",
        !expanded && "hidden"
      )}>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索源URL、目标URL或锚文本..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            {displayMode === 'flat' && (
              <>
                <span className="text-sm text-muted-foreground hidden md:inline">排序方式:</span>
                <Select
                  value={sortValue}
                  onValueChange={onSortChange}
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
              defaultValue={displayMode} 
              className="w-[200px]"
              onValueChange={(value) => {
                onDisplayModeChange(value as 'flat' | 'compare');
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
                value={compareSort}
                onValueChange={onCompareSortChange}
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
                onValueChange={onCellDisplayTypeChange}
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
      {expanded && renderPagination()}
    </div>
  );
}