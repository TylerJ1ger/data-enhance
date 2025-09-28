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

export interface BacklinkItem {
  domain: string;
  brand: string;
  domain_ascore?: number;
  backlinks?: number;
  ip_address?: string;
  country?: string;
  first_seen?: string;
  last_seen?: string;
  duplicate_count?: number;
  [key: string]: string | number | boolean | null | undefined; // 添加索引签名以兼容ExportableData
}

interface BacklinkListProps {
  backlinks?: BacklinkItem[];
  isLoading?: boolean;
  totalCount?: number;
}

type SortField = keyof BacklinkItem;
type SortDirection = 'asc' | 'desc';

export function BacklinkList({ backlinks = [], isLoading, totalCount }: BacklinkListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('domain');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showUniqueOnly, setShowUniqueOnly] = useState(true);
  const [mergeStrategy, setMergeStrategy] = useState<'first' | 'best_ascore' | 'most_backlinks' | 'most_recent'>('first');

  // 列可见性控制
  const [visibleColumns, setVisibleColumns] = useState({
    domain: true,
    brand: true,
    duplicate_count: true,
    domain_ascore: true,
    backlinks: true,
    ip_address: true,
    country: true,
    first_seen: false, // 默认隐藏，用户可以选择显示
    last_seen: false, // 默认隐藏
  });

  // 过滤和排序数据
  const filteredAndSortedBacklinks = React.useMemo(() => {
    if (!backlinks || !Array.isArray(backlinks)) {
      return [];
    }

    // 先计算重复次数
    const domainCounts = new Map<string, number>();
    backlinks.forEach(item => {
      const key = item.domain.toLowerCase();
      domainCounts.set(key, (domainCounts.get(key) || 0) + 1);
    });

    // 添加重复次数到每个项目
    const backlinksWithCounts = backlinks.map(item => ({
      ...item,
      duplicate_count: domainCounts.get(item.domain.toLowerCase()) || 1
    }));

    // 如果只显示唯一域名，则根据策略去重
    let processedBacklinks = backlinksWithCounts;
    if (showUniqueOnly) {
      const uniqueMap = new Map<string, BacklinkItem & { duplicate_count: number }>();
      backlinksWithCounts.forEach(item => {
        const key = item.domain.toLowerCase();
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
            case 'best_ascore':
              // 保留权重更高的
              if (item.domain_ascore && existing.domain_ascore) {
                shouldReplace = item.domain_ascore > existing.domain_ascore;
              } else if (item.domain_ascore && !existing.domain_ascore) {
                shouldReplace = true;
              }
              break;
            case 'most_backlinks':
              // 保留外链数更多的
              if (item.backlinks && existing.backlinks) {
                shouldReplace = item.backlinks > existing.backlinks;
              } else if (item.backlinks && !existing.backlinks) {
                shouldReplace = true;
              }
              break;
            case 'most_recent':
              // 保留更近期的
              if (item.last_seen && existing.last_seen) {
                shouldReplace = new Date(item.last_seen) > new Date(existing.last_seen);
              } else if (item.last_seen && !existing.last_seen) {
                shouldReplace = true;
              }
              break;
          }

          if (shouldReplace) {
            uniqueMap.set(key, item);
          }
        }
      });
      processedBacklinks = Array.from(uniqueMap.values());
    }

    // 过滤
    const filtered = processedBacklinks.filter(item =>
      item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.country && item.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.ip_address && item.ip_address.includes(searchTerm))
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
  }, [backlinks, searchTerm, sortField, sortDirection, showUniqueOnly, mergeStrategy]);

  // 分页数据
  const totalPages = Math.ceil(filteredAndSortedBacklinks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBacklinks = filteredAndSortedBacklinks.slice(startIndex, startIndex + pageSize);

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


  // 列标签映射
  const columnLabels = {
    domain: '域名',
    brand: '品牌',
    duplicate_count: '重复次数',
    domain_ascore: '域名权重',
    backlinks: '外链数',
    ip_address: 'IP地址',
    country: '国家',
    first_seen: '首次发现',
    last_seen: '最后发现',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>外链列表</CardTitle>
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

  if (!backlinks || backlinks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>外链列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            请先上传文件并应用筛选条件以查看外链列表。
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>外链列表</CardTitle>
        <div className="flex flex-col gap-4 pt-4">
          {/* 搜索和设置 */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索域名、品牌、国家或IP..."
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
                  <span className="text-sm select-none">仅展示唯一域名</span>
                </DropdownMenuItem>

                {/* 合并策略选择器 */}
                {showUniqueOnly && (
                  <div className="px-3 py-2">
                    <div className="text-xs text-gray-600 mb-2">合并策略:</div>
                    <Select value={mergeStrategy} onValueChange={(value: 'first' | 'best_ascore' | 'most_backlinks' | 'most_recent') => setMergeStrategy(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first" className="text-xs">
                          保留第一个 (默认)
                        </SelectItem>
                        <SelectItem value="best_ascore" className="text-xs">
                          保留权重最高的
                        </SelectItem>
                        <SelectItem value="most_backlinks" className="text-xs">
                          保留外链数最多的
                        </SelectItem>
                        <SelectItem value="most_recent" className="text-xs">
                          保留最近发现的
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
            共 <span className="font-bold">{filteredAndSortedBacklinks.length}</span> 条结果
            {totalCount && backlinks.length < totalCount && (
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
                {visibleColumns.domain && (
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('domain')}
                  >
                    <div className="flex items-center">
                      域名
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
                {visibleColumns.domain_ascore && (
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('domain_ascore')}
                  >
                    <div className="flex items-center">
                      域名权重
                    </div>
                  </TableHead>
                )}
                {visibleColumns.backlinks && (
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('backlinks')}
                  >
                    <div className="flex items-center">
                      外链数
                    </div>
                  </TableHead>
                )}
                {visibleColumns.ip_address && (
                  <TableHead>IP地址</TableHead>
                )}
                {visibleColumns.country && (
                  <TableHead>
                    <div className="flex items-center">
                      国家
                    </div>
                  </TableHead>
                )}
                {visibleColumns.first_seen && (
                  <TableHead>
                    <div className="flex items-center">
                      首次发现
                    </div>
                  </TableHead>
                )}
                {visibleColumns.last_seen && (
                  <TableHead>
                    <div className="flex items-center">
                      最后发现
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBacklinks.map((item, index) => (
                <TableRow key={`${item.domain}-${item.brand}-${startIndex + index}`}>
                  {visibleColumns.domain && (
                    <TableCell className="font-medium">{item.domain}</TableCell>
                  )}
                  {visibleColumns.brand && (
                    <TableCell>{item.brand}</TableCell>
                  )}
                  {visibleColumns.duplicate_count && (
                    <TableCell>
                      {item.duplicate_count || 1}
                    </TableCell>
                  )}
                  {visibleColumns.domain_ascore && (
                    <TableCell>
                      {item.domain_ascore !== undefined && item.domain_ascore !== null ? item.domain_ascore : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.backlinks && (
                    <TableCell>
                      {item.backlinks !== undefined && item.backlinks !== null
                        ? item.backlinks.toLocaleString()
                        : '-'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.ip_address && (
                    <TableCell className="font-mono text-xs">
                      {item.ip_address || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.country && (
                    <TableCell>
                      {item.country || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.first_seen && (
                    <TableCell>
                      {item.first_seen || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.last_seen && (
                    <TableCell>
                      {item.last_seen || '-'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            {paginatedBacklinks.length === 0 && (
              <TableCaption>
                没有找到匹配的外链数据。
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