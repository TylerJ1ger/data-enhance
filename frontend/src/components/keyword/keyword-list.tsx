"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  Settings
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { TrendChart } from "./trend-chart";

export interface KeywordItem {
  keyword: string;
  brand: string;
  position?: number;
  search_volume?: number;
  keyword_difficulty?: number;
  cpc?: number;
  url?: string;
  traffic?: number;
  duplicate_count?: number;
  trends?: string; // 热度数据数组字符串，如 "[0,0,2,3,7,16,66,100,54,16,3,1]"
  timestamp?: string; // 时间戳，如 "2025-09-06"
  number_of_results?: number; // 结果数量
  keyword_intents?: string; // 关键词意图
  position_type?: string; // 位置类型
  [key: string]: string | number | boolean | null | undefined; // 添加索引签名以兼容ExportableData
}

interface KeywordListProps {
  keywords?: KeywordItem[];
  isLoading?: boolean;
  totalCount?: number;
  exportTrigger?: boolean; // 用于触发导出的标志
  onExportData?: (data: KeywordItem[]) => void;
}

type SortField = keyof KeywordItem;
type SortDirection = 'asc' | 'desc';

export function KeywordList({ keywords = [], isLoading, totalCount, exportTrigger, onExportData }: KeywordListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showUniqueOnly, setShowUniqueOnly] = useState(true);
  const [mergeStrategy, setMergeStrategy] = useState<'first' | 'best_position' | 'best_traffic' | 'best_search_volume'>('first');

  // 列可见性控制
  const [visibleColumns, setVisibleColumns] = useState({
    keyword: true,
    brand: true,
    duplicate_count: true,
    position: true,
    search_volume: true,
    traffic: true,
    keyword_difficulty: true,
    cpc: true,
    url: true,
    trends: true,
    timestamp: true,
    number_of_results: false, // 默认隐藏，用户可以选择显示
    keyword_intents: false, // 默认隐藏
    position_type: false, // 默认隐藏
  });

  // 过滤和排序数据
  const filteredAndSortedKeywords = React.useMemo(() => {
    if (!keywords || !Array.isArray(keywords)) {
      return [];
    }
    
    // 先计算重复次数
    const keywordCounts = new Map<string, number>();
    keywords.forEach(item => {
      const key = item.keyword.toLowerCase();
      keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
    });
    
    // 添加重复次数到每个项目
    const keywordsWithCounts = keywords.map(item => ({
      ...item,
      duplicate_count: keywordCounts.get(item.keyword.toLowerCase()) || 1
    }));
    
    // 如果只显示唯一关键词，则根据策略去重
    let processedKeywords = keywordsWithCounts;
    if (showUniqueOnly) {
      const uniqueMap = new Map<string, KeywordItem & { duplicate_count: number }>();
      keywordsWithCounts.forEach(item => {
        const key = item.keyword.toLowerCase();
        const existing = uniqueMap.get(key);
        
        if (!existing) {
          uniqueMap.set(key, item);
        } else {
          // 根据合并策略选择保留哪个记录
          let shouldReplace = false;
          
          switch (mergeStrategy) {
            case 'first':
              // 保留第一个，不替换
              shouldReplace = false;
              break;
            case 'best_position':
              // 保留排名更好的（数字更小）
              if (item.position && existing.position) {
                shouldReplace = item.position < existing.position;
              } else if (item.position && !existing.position) {
                shouldReplace = true;
              }
              break;
            case 'best_traffic':
              // 保留流量更高的
              if (item.traffic && existing.traffic) {
                shouldReplace = item.traffic > existing.traffic;
              } else if (item.traffic && !existing.traffic) {
                shouldReplace = true;
              }
              break;
            case 'best_search_volume':
              // 保留搜索量更高的
              if (item.search_volume && existing.search_volume) {
                shouldReplace = item.search_volume > existing.search_volume;
              } else if (item.search_volume && !existing.search_volume) {
                shouldReplace = true;
              }
              break;
          }
          
          if (shouldReplace) {
            uniqueMap.set(key, item);
          }
        }
      });
      processedKeywords = Array.from(uniqueMap.values());
    }
    
    // 过滤
    const filtered = processedKeywords.filter(item => 
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.url && item.url.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // 排序
    filtered.sort((a, b) => {
      const aValue = (a as any)[sortField];
      const bValue = (b as any)[sortField];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [keywords, searchTerm, sortField, sortDirection, showUniqueOnly, mergeStrategy]);

  // 分页数据
  const totalPages = Math.ceil(filteredAndSortedKeywords.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedKeywords = filteredAndSortedKeywords.slice(startIndex, startIndex + pageSize);

  // 处理排序
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // 处理页面变化
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 处理页面大小变化
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  // 切换列可见性
  const toggleColumnVisibility = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // 导出唯一数据功能
  const exportUniqueData = React.useCallback(() => {
    if (onExportData && keywords.length > 0) {
      // 如果启用了唯一关键词显示，导出处理后的数据
      if (showUniqueOnly) {
        // 使用与显示相同的合并逻辑
        const uniqueMap = new Map<string, KeywordItem & { duplicate_count: number }>();
        const keywordCounts = new Map<string, number>();
        
        // 计算重复次数
        keywords.forEach(item => {
          const key = item.keyword.toLowerCase();
          keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
        });
        
        // 添加重复次数并应用合并策略
        const keywordsWithCounts = keywords.map(item => ({
          ...item,
          duplicate_count: keywordCounts.get(item.keyword.toLowerCase()) || 1
        }));
        
        keywordsWithCounts.forEach(item => {
          const key = item.keyword.toLowerCase();
          const existing = uniqueMap.get(key);
          
          if (!existing) {
            uniqueMap.set(key, item);
          } else {
            let shouldReplace = false;
            
            switch (mergeStrategy) {
              case 'first':
                shouldReplace = false;
                break;
              case 'best_position':
                if (item.position && existing.position) {
                  shouldReplace = item.position < existing.position;
                } else if (item.position && !existing.position) {
                  shouldReplace = true;
                }
                break;
              case 'best_traffic':
                if (item.traffic && existing.traffic) {
                  shouldReplace = item.traffic > existing.traffic;
                } else if (item.traffic && !existing.traffic) {
                  shouldReplace = true;
                }
                break;
              case 'best_search_volume':
                if (item.search_volume && existing.search_volume) {
                  shouldReplace = item.search_volume > existing.search_volume;
                } else if (item.search_volume && !existing.search_volume) {
                  shouldReplace = true;
                }
                break;
            }
            
            if (shouldReplace) {
              uniqueMap.set(key, item);
            }
          }
        });
        
        const uniqueData = Array.from(uniqueMap.values());
        onExportData(uniqueData);
      } else {
        // 如果没有启用唯一关键词显示，导出所有数据
        onExportData(keywords);
      }
    }
  }, [onExportData, showUniqueOnly, mergeStrategy, keywords]);

  // 监听导出触发器
  React.useEffect(() => {
    if (exportTrigger === true && onExportData && keywords.length > 0) {
      // 直接在这里执行导出逻辑，避免依赖可能变化的函数
      if (showUniqueOnly) {
        // 使用与显示相同的合并逻辑
        const uniqueMap = new Map<string, KeywordItem & { duplicate_count: number }>();
        const keywordCounts = new Map<string, number>();

        // 计算重复次数
        keywords.forEach(item => {
          const key = item.keyword.toLowerCase();
          keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
        });

        // 添加重复次数并应用合并策略
        const keywordsWithCounts = keywords.map(item => ({
          ...item,
          duplicate_count: keywordCounts.get(item.keyword.toLowerCase()) || 1
        }));

        keywordsWithCounts.forEach(item => {
          const key = item.keyword.toLowerCase();
          const existing = uniqueMap.get(key);

          if (!existing) {
            uniqueMap.set(key, item);
          } else {
            let shouldReplace = false;

            switch (mergeStrategy) {
              case 'first':
                shouldReplace = false;
                break;
              case 'best_position':
                if (item.position && existing.position) {
                  shouldReplace = item.position < existing.position;
                } else if (item.position && !existing.position) {
                  shouldReplace = true;
                }
                break;
              case 'best_traffic':
                if (item.traffic && existing.traffic) {
                  shouldReplace = item.traffic > existing.traffic;
                } else if (item.traffic && !existing.traffic) {
                  shouldReplace = true;
                }
                break;
              case 'best_search_volume':
                if (item.search_volume && existing.search_volume) {
                  shouldReplace = item.search_volume > existing.search_volume;
                } else if (item.search_volume && !existing.search_volume) {
                  shouldReplace = true;
                }
                break;
            }

            if (shouldReplace) {
              uniqueMap.set(key, item);
            }
          }
        });

        const uniqueData = Array.from(uniqueMap.values());
        onExportData(uniqueData);
      } else {
        // 如果没有启用唯一关键词显示，导出所有数据
        onExportData(keywords);
      }
    }
  }, [exportTrigger, onExportData, keywords, showUniqueOnly, mergeStrategy]);

  // 列标签映射
  const columnLabels = {
    keyword: '关键词',
    brand: '品牌',
    duplicate_count: '重复次数',
    position: '排名',
    search_volume: '搜索量',
    traffic: '流量',
    keyword_difficulty: '难度',
    cpc: 'CPC',
    url: 'URL',
    trends: '热度趋势',
    timestamp: '时间戳',
    number_of_results: '结果数量',
    keyword_intents: '关键词意图',
    position_type: '位置类型',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            请先上传文件并应用筛选条件以查看关键词列表。
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>关键词列表</CardTitle>
        <div className="flex flex-col gap-4 pt-4">
          {/* 搜索和设置 */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索关键词、品牌或URL..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* 基本设置部分 */}
                <DropdownMenuLabel className="text-sm font-semibold text-gray-700">基本设置</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowUniqueOnly(!showUniqueOnly);
                    setCurrentPage(1);
                  }}
                  className="flex items-center space-x-3 py-2 cursor-pointer"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Checkbox 
                    checked={showUniqueOnly}
                    onCheckedChange={() => {}} // 防止事件冲突
                    className="pointer-events-none data-[state=checked]:text-primary-foreground"
                  />
                  <span className="text-sm select-none">仅展示唯一关键词</span>
                </DropdownMenuItem>
                
                {/* 合并策略选择器 */}
                {showUniqueOnly && (
                  <div className="px-3 py-2">
                    <div className="text-xs text-gray-600 mb-2">合并策略:</div>
                    <Select value={mergeStrategy} onValueChange={(value: 'first' | 'best_position' | 'best_traffic' | 'best_search_volume') => setMergeStrategy(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first" className="text-xs">
                          保留第一个 (默认)
                        </SelectItem>
                        <SelectItem value="best_position" className="text-xs">
                          保留排名最佳的
                        </SelectItem>
                        <SelectItem value="best_traffic" className="text-xs">
                          保留流量最高的
                        </SelectItem>
                        <SelectItem value="best_search_volume" className="text-xs">
                          保留搜索量最高的
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <DropdownMenuSeparator className="my-2" />
                
                {/* 显示列部分 */}
                <DropdownMenuLabel className="text-sm font-semibold text-gray-700">显示列</DropdownMenuLabel>
                <div className="px-2 py-1">
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(columnLabels).map(([key, label]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleColumnVisibility(key as keyof typeof visibleColumns);
                        }}
                        className="flex items-center space-x-2 py-1.5 px-2 text-xs cursor-pointer"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Checkbox 
                          checked={visibleColumns[key as keyof typeof visibleColumns]}
                          onCheckedChange={() => {}} // 防止事件冲突
                          className="pointer-events-none scale-90 data-[state=checked]:text-primary-foreground"
                        />
                        <span className="truncate select-none">{label}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
                
                <DropdownMenuSeparator className="my-2" />
                
                {/* 分页设置部分 */}
                <DropdownMenuLabel className="text-sm font-semibold text-gray-700">每页显示</DropdownMenuLabel>
                <div className="px-2 py-1">
                  <div className="grid grid-cols-4 gap-1">
                    {['10', '20', '50', '100'].map((size) => (
                      <DropdownMenuItem
                        key={size}
                        onClick={() => handlePageSizeChange(size)}
                        className={`text-center py-2 px-2 text-sm ${
                          pageSize.toString() === size 
                            ? "bg-primary text-primary-foreground font-medium" 
                            : "hover:bg-accent"
                        }`}
                      >
                        {size}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 数据统计 */}
          <div className="text-sm text-muted-foreground">
            共 <span className="font-bold">{filteredAndSortedKeywords.length}</span> 条结果
            {totalCount && keywords.length < totalCount && (
              <span className="ml-2">（总计 {totalCount} 条数据）</span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.keyword && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('keyword')}
                  >
                    <div className="flex items-center">
                      关键词
                    </div>
                  </TableHead>
                )}
                {visibleColumns.brand && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('brand')}
                  >
                    <div className="flex items-center">
                      品牌
                    </div>
                  </TableHead>
                )}
                {visibleColumns.duplicate_count && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('duplicate_count')}
                  >
                    <div className="flex items-center">
                      重复次数
                    </div>
                  </TableHead>
                )}
                {visibleColumns.position && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('position')}
                  >
                    <div className="flex items-center">
                      排名
                    </div>
                  </TableHead>
                )}
                {visibleColumns.search_volume && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('search_volume')}
                  >
                    <div className="flex items-center">
                      搜索量
                    </div>
                  </TableHead>
                )}
                {visibleColumns.traffic && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('traffic')}
                  >
                    <div className="flex items-center">
                      流量
                    </div>
                  </TableHead>
                )}
                {visibleColumns.keyword_difficulty && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('keyword_difficulty')}
                  >
                    <div className="flex items-center">
                      难度
                    </div>
                  </TableHead>
                )}
                {visibleColumns.cpc && (
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('cpc')}
                  >
                    <div className="flex items-center">
                      CPC
                    </div>
                  </TableHead>
                )}
                {visibleColumns.url && (
                  <TableHead>URL</TableHead>
                )}
                {visibleColumns.trends && (
                  <TableHead>
                    <div className="flex items-center">
                      热度趋势
                    </div>
                  </TableHead>
                )}
                {visibleColumns.timestamp && (
                  <TableHead>
                    <div className="flex items-center">
                      时间戳
                    </div>
                  </TableHead>
                )}
                {visibleColumns.number_of_results && (
                  <TableHead>
                    <div className="flex items-center">
                      结果数量
                    </div>
                  </TableHead>
                )}
                {visibleColumns.keyword_intents && (
                  <TableHead>
                    <div className="flex items-center">
                      关键词意图
                    </div>
                  </TableHead>
                )}
                {visibleColumns.position_type && (
                  <TableHead>
                    <div className="flex items-center">
                      位置类型
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedKeywords.map((item, index) => (
                <TableRow key={`${item.keyword}-${item.brand}-${startIndex + index}`}>
                  {visibleColumns.keyword && (
                    <TableCell className="font-medium">{item.keyword}</TableCell>
                  )}
                  {visibleColumns.brand && (
                    <TableCell>{item.brand}</TableCell>
                  )}
                  {visibleColumns.duplicate_count && (
                    <TableCell>
                      {item.duplicate_count || 1}
                    </TableCell>
                  )}
                  {visibleColumns.position && (
                    <TableCell>
                      {item.position !== undefined && item.position !== null ? item.position : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.search_volume && (
                    <TableCell>
                      {item.search_volume !== undefined && item.search_volume !== null
                        ? item.search_volume.toLocaleString() 
                        : '-'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.traffic && (
                    <TableCell>
                      {item.traffic !== undefined && item.traffic !== null
                        ? item.traffic.toLocaleString() 
                        : '-'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.keyword_difficulty && (
                    <TableCell>
                      {item.keyword_difficulty !== undefined && item.keyword_difficulty !== null
                        ? `${item.keyword_difficulty}%` 
                        : '-'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.cpc && (
                    <TableCell>
                      {item.cpc !== undefined && item.cpc !== null
                        ? `$${item.cpc.toFixed(2)}` 
                        : '-'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.url && (
                    <TableCell className="max-w-xs">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                          title={item.url}
                        >
                          {item.url}
                        </a>
                      ) : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.trends && (
                    <TableCell>
                      {item.trends ? (
                        <div className="group relative">
                          <TrendChart data={item.trends} timestamp={item.timestamp} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">无数据</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.timestamp && (
                    <TableCell>
                      {item.timestamp || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.number_of_results && (
                    <TableCell>
                      {item.number_of_results !== undefined && item.number_of_results !== null
                        ? item.number_of_results.toLocaleString()
                        : '-'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.keyword_intents && (
                    <TableCell>
                      {item.keyword_intents || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.position_type && (
                    <TableCell>
                      {item.position_type || '-'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            {paginatedKeywords.length === 0 && (
              <TableCaption>
                没有找到匹配的关键词数据。
              </TableCaption>
            )}
          </Table>
        </div>

        {/* 分页控制 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                第 {currentPage} / {totalPages} 页
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}