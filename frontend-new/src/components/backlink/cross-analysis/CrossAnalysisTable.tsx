// frontend-new/src/components/backlink/cross-analysis/CrossAnalysisTable.tsx
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
  
  // 单元格值获取
  getCellValue: (result: CrossAnalysisResult | null, type: 'target_url' | 'source_title' | 'source_url' | 'anchor' | 'nofollow') => string;
  
  // UI状态
  isFullscreen: boolean;
  filterExpanded: boolean;
  onFilterExpandedChange: (expanded: boolean) => void;
  isMobile: boolean;
}

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
  getCellValue,
  isFullscreen,
  filterExpanded,
  onFilterExpandedChange,
  isMobile,
}: CrossAnalysisTableProps) {
  return (
    <>
      {/* 固定的表头部分 - 平铺视图 */}
      {displayMode === 'flat' && (
        <div className="sticky top-[calc(69px+var(--filter-height,36px))] z-10 border-b bg-card">
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead 
                    className="w-[100px] cursor-pointer"
                    onClick={() => handleSort('page_ascore')}
                  >
                    页面权重 {getSortIcon('page_ascore')}
                  </TableHead>
                  <TableHead
                    className="w-[200px] cursor-pointer"
                    onClick={() => handleSort('source_title')}
                  >
                    来源标题 {getSortIcon('source_title')}
                  </TableHead>
                  <TableHead
                    className="w-[200px] cursor-pointer"
                    onClick={() => handleSort('source_url')}
                  >
                    来源URL {getSortIcon('source_url')}
                  </TableHead>
                  <TableHead
                    className="w-[200px] cursor-pointer"
                    onClick={() => handleSort('target_url')}
                  >
                    目标URL {getSortIcon('target_url')}
                  </TableHead>
                  <TableHead
                    className="w-[150px]"
                  >
                    锚文本
                  </TableHead>
                  <TableHead
                    className="w-[100px] text-center"
                  >
                    Nofollow
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        </div>
      )}
      
      {/* 固定的表头部分 - 对比视图 */}
      {displayMode === 'compare' && paginatedComparisonData && (
        <div className="sticky top-[calc(69px+var(--filter-height,36px))] z-10 border-b bg-card overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead 
                  className="w-[100px] cursor-pointer"
                  onClick={() => handleCompareSort('ascore')}
                >
                  站点权重 {getCompareSortIcon('ascore')}
                </TableHead>
                <TableHead 
                  className="w-[150px] cursor-pointer"
                  onClick={() => handleCompareSort('domain')}
                >
                  站点域名 {getCompareSortIcon('domain')}
                </TableHead>
                {paginatedComparisonData.targetDomains.map((domain, index) => (
                  <TableHead 
                    key={index} 
                    className="w-[200px] min-w-[200px]"
                  >
                    {domain}
                  </TableHead>
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
          <div className="rounded-md overflow-x-auto" id="table-content">
            <Table className="w-full table-fixed">
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
                      <TableCell className="w-[100px] font-medium">
                        {result.page_ascore}
                      </TableCell>
                      <TableCell className="w-[200px] max-w-[200px] truncate" title={result.source_title}>
                        {result.source_title || '-'}
                      </TableCell>
                      <TableCell className="w-[200px] max-w-[200px] truncate">
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
                      <TableCell className="w-[200px] max-w-[200px] truncate">
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
                      <TableCell className="w-[150px] max-w-[150px] truncate" title={result.anchor}>
                        {result.anchor || '-'}
                      </TableCell>
                      <TableCell className="w-[100px] text-center">
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
          <div className="rounded-md overflow-x-auto">
            <Table className="w-full table-fixed">
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
                      <TableCell className="w-[100px] font-medium">
                        {item.ascore}
                      </TableCell>
                      <TableCell className="w-[150px] font-medium">
                        {item.domain}
                      </TableCell>
                      {item.targets.map((result, targetIndex) => (
                        <TableCell 
                          key={targetIndex} 
                          className="w-[200px] min-w-[200px] max-w-[200px] truncate"
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