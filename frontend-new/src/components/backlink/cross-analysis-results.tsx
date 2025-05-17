// frontend-new/src/components/backlink/cross-analysis-results.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// 导入拆分的子组件
import { CrossAnalysisHeader } from "./cross-analysis/CrossAnalysisHeader";
import { CrossAnalysisFilters } from "./cross-analysis/CrossAnalysisFilters";
import { CrossAnalysisTable } from "./cross-analysis/CrossAnalysisTable";

// 导入自定义Hook
import { useCrossAnalysisTable } from "@/hooks/useCrossAnalysisTable";

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

export function CrossAnalysisResults({
  results,
  domainData = [],
  isLoading,
  onExport
}: CrossAnalysisResultsProps) {
  // 检测是否是移动设备
  const [isMobile, setIsMobile] = useState(false);
  
  // 使用自定义Hook来管理表格状态和逻辑
  const tableState = useCrossAnalysisTable({ results, domainData });
  
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
    if (tableState.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [tableState.isFullscreen]);

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
      tableState.isFullscreen && "fixed inset-0 z-50 rounded-none max-h-screen h-screen overflow-hidden"
    )}>
      {/* 头部组件 */}
      <CrossAnalysisHeader 
        resultsCount={tableState.filteredResults.length}
        isFullscreen={tableState.isFullscreen}
        onToggleFullscreen={() => tableState.setIsFullscreen(!tableState.isFullscreen)}
        onExport={onExport}
      />
      
      {/* 筛选组件 */}
      <CrossAnalysisFilters 
        searchTerm={tableState.searchTerm}
        onSearchChange={tableState.setSearchTerm}
        displayMode={tableState.displayMode}
        onDisplayModeChange={(mode) => {
          tableState.setDisplayMode(mode as 'flat' | 'compare');
          tableState.setCurrentPage(1); // 切换视图时重置到第一页
        }}
        sortValue={`${tableState.sortColumn}-${tableState.sortDirection}`}
        onSortChange={(value) => {
          const [column, direction] = value.split('-') as [keyof CrossAnalysisResult, 'asc' | 'desc'];
          tableState.setSortColumn(column);
          tableState.setSortDirection(direction);
        }}
        compareSort={`${tableState.compareSort}-${tableState.compareSortDirection}`}
        onCompareSortChange={(value) => {
          const [column, direction] = value.split('-') as ['ascore' | 'domain', 'asc' | 'desc'];
          tableState.setCompareSort(column);
          tableState.setSortDirection(direction);
        }}
        cellDisplayType={tableState.cellDisplayType}
        onCellDisplayTypeChange={(type) => tableState.setCellDisplayType(type as any)}
        currentPage={tableState.currentPage}
        itemsPerPage={tableState.itemsPerPage}
        pageCount={tableState.pageCount}
        totalItems={tableState.sortedResults.length}
        onPageChange={tableState.handlePageChange}
        onItemsPerPageChange={tableState.handleItemsPerPageChange}
        expanded={tableState.filterExpanded}
        onExpandedChange={tableState.setFilterExpanded}
        isMobile={isMobile}
      />
      
      <CardContent className="p-0">
        {/* 表格组件 */}
        <CrossAnalysisTable 
          displayMode={tableState.displayMode}
          paginatedResults={tableState.paginatedResults}
          paginatedComparisonData={tableState.paginatedComparisonData}
          cellDisplayType={tableState.cellDisplayType}
          sortColumn={tableState.sortColumn}
          handleSort={tableState.handleSort}
          getSortIcon={tableState.getSortIcon}
          handleCompareSort={tableState.handleCompareSort}
          getCompareSortIcon={tableState.getCompareSortIcon}
          columnWidths={tableState.columnWidths}
          startColumnResizing={tableState.startColumnResizing}
          getCellValue={tableState.getCellValue}
          isFullscreen={tableState.isFullscreen}
          filterExpanded={tableState.filterExpanded}
          onFilterExpandedChange={tableState.setFilterExpanded}
          isMobile={isMobile}
          isResizing={tableState.isResizing}
          resizingColumn={tableState.resizingColumn}
        />
      </CardContent>
    </Card>
  );
}

// 防止 TypeScript 错误
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className="text-lg font-semibold leading-none tracking-tight"
      {...props}
    >
      {children}
    </h3>
  );
}