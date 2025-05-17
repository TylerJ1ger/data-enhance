// frontend-new/src/components/backlink/cross-analysis/cross-analysis-table.tsx
import React from 'react';
import { ExternalLink, ArrowLeftRight, Filter } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// 定义结果类型
interface CrossAnalysisResult {
  page_ascore: number;
  source_title: string;
  source_url: string;
  target_url: string;
  anchor: string;
  nofollow: boolean;
}

// 定义对比数据类型
interface ComparisonData {
  domains: {
    domain: string;
    ascore: number;
    targets: (CrossAnalysisResult | null)[];
  }[];
  targetDomains: string[];
}

interface CrossAnalysisTableProps {
  // 数据
  displayMode: 'flat' | 'compare';
  paginatedResults: CrossAnalysisResult[];
  paginatedComparisonData: ComparisonData;
  cellDisplayType: 'target_url' | 'source_title' | 'source_url' | 'anchor' | 'nofollow';
  
  // 排序
  sortColumn: keyof CrossAnalysisResult;
  handleSort: (column: keyof CrossAnalysisResult) => void;
  getSortIcon: (column: keyof CrossAnalysisResult) => string | null;
  
  // 对比视图排序
  handleCompareSort: (column: 'ascore' | 'domain') => void;
  getCompareSortIcon: (column: 'ascore' | 'domain') => string | null;
  
  // 列宽调整
  columnWidths: {[key: string]: number};
  startColumnResizing: (e: React.MouseEvent<HTMLDivElement>, columnName: string) => void;
  
  // 单元格值获取
  getCellValue: (result: CrossAnalysisResult | null, type: 'target_url' | 'source_title' | 'source_url' | 'anchor' | 'nofollow') => string;
  
  // UI状态
  isFullscreen: boolean;
  filterExpanded: boolean;
  onFilterExpandedChange: (expanded: boolean) => void;
  isMobile: boolean;
  isResizing: boolean;
  resizingColumn: string | null;
}

// 自定义表头单元格组件 - 支持调整列宽
const ResizableHeaderCell = ({ 
  children, 
  column, 
  className, 
  onClick,
  width,
  onResize,
  ...props 
}: {
  children: React.ReactNode,
  column: string,
  className?: string,
  onClick?: () => void,
  width?: number,
  onResize: (e: React.MouseEvent<HTMLDivElement>, column: string) => void,
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
      {/* 拖动手柄 */}
      <div
        className="absolute top-0 right-0 h-full w-4 cursor-col-resize bg-transparent group-hover:bg-primary/10 hover:bg-primary/20 -mr-2"
        onMouseDown={(e) => onResize(e, column)}
        onClick={(e) => e.stopPropagation()} // 阻止点击事件传播到表头
        style={{ touchAction: 'none' }} // 阻止触摸事件的默认行为
      />
    </TableHead>
  );
};

export function CrossAnalysisTable({
  displayMode,
  paginatedResults,
  paginatedComparisonData,
  cellDisplayType,
  sortColumn,
  handleSort,
  getSortIcon,
  handleCompareSort,
  getCompareSortIcon,
  columnWidths,
  startColumnResizing,
  getCellValue,
  isFullscreen,
  filterExpanded,
  onFilterExpandedChange,
  isMobile,
  isResizing,
  resizingColumn
}: CrossAnalysisTableProps) {
  return (
    <>
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
                  onResize={startColumnResizing}
                >
                  页面权重 {getSortIcon('page_ascore')}
                </ResizableHeaderCell>
                <ResizableHeaderCell
                  column="source_title"
                  width={columnWidths.source_title}
                  onClick={() => handleSort('source_title')}
                  onResize={startColumnResizing}
                >
                  来源标题 {getSortIcon('source_title')}
                </ResizableHeaderCell>
                <ResizableHeaderCell
                  column="source_url"
                  width={columnWidths.source_url}
                  onClick={() => handleSort('source_url')}
                  onResize={startColumnResizing}
                >
                  来源URL {getSortIcon('source_url')}
                </ResizableHeaderCell>
                <ResizableHeaderCell
                  column="target_url"
                  width={columnWidths.target_url}
                  onClick={() => handleSort('target_url')}
                  onResize={startColumnResizing}
                >
                  目标URL {getSortIcon('target_url')}
                </ResizableHeaderCell>
                <ResizableHeaderCell
                  column="anchor"
                  width={columnWidths.anchor}
                  onResize={startColumnResizing}
                >
                  锚文本
                </ResizableHeaderCell>
                <ResizableHeaderCell
                  column="nofollow"
                  width={columnWidths.nofollow}
                  className="text-center"
                  onResize={startColumnResizing}
                >
                  Nofollow
                </ResizableHeaderCell>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
      )}
      
      {/* 固定的表头部分 - 对比视图 */}
      {displayMode === 'compare' && paginatedComparisonData && (
        <div className="sticky top-[calc(69px+var(--filter-height,36px))] z-10 border-b bg-card overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <ResizableHeaderCell 
                  column="ascore"
                  width={columnWidths.page_ascore}
                  onClick={() => handleCompareSort('ascore')}
                  onResize={startColumnResizing}
                >
                  站点权重 {getCompareSortIcon('ascore')}
                </ResizableHeaderCell>
                <ResizableHeaderCell 
                  column="domain"
                  width={columnWidths.domain}
                  onClick={() => handleCompareSort('domain')}
                  onResize={startColumnResizing}
                >
                  站点域名 {getCompareSortIcon('domain')}
                </ResizableHeaderCell>
                {paginatedComparisonData.targetDomains.map((domain, index) => (
                  <ResizableHeaderCell 
                    key={index} 
                    column={`target_${index}`}
                    width={columnWidths[`target_${index}`] || 200}
                    className="min-w-[200px]"
                    onResize={startColumnResizing}
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
        {displayMode === 'compare' && paginatedComparisonData && (
          <div className="rounded-md">
            <Table>
              {/* 表体内容 */}
              <TableBody>
                {paginatedComparisonData.domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2 + paginatedComparisonData.targetDomains.length} className="text-center py-6 text-muted-foreground">
                      未找到匹配的结果
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedComparisonData.domains.map((item, index) => (
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
      
      {/* 移动设备滑动控制 */}
      {isMobile && (
        <div className="flex items-center justify-center gap-4 py-2 bg-muted/20 border-t">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">水平滑动可查看更多内容</span>
        </div>
      )}
      
      {/* 列宽调整提示 */}
      {isResizing && (
        <div className="fixed bottom-4 right-4 bg-background border shadow-lg rounded-md p-2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{resizingColumn} 列宽: {columnWidths[resizingColumn || ''] || 0}px</span>
          </div>
        </div>
      )}
      
      {/* 筛选框收起时的快速切换按钮 */}
      {!filterExpanded && (
        <div className="fixed bottom-4 left-4 z-30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="secondary"
                  onClick={() => onFilterExpandedChange(true)}
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
    </>
  );
}