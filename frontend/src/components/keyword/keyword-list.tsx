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
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export interface KeywordItem {
  keyword: string;
  brand: string;
  position?: number;
  search_volume?: number;
  keyword_difficulty?: number;
  cpc?: number;
  url?: string;
  traffic?: number;
}

interface KeywordListProps {
  keywords?: KeywordItem[];
  isLoading?: boolean;
  totalCount?: number;
}

type SortField = keyof KeywordItem;
type SortDirection = 'asc' | 'desc';

export function KeywordList({ keywords = [], isLoading, totalCount }: KeywordListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 过滤和排序数据
  const filteredAndSortedKeywords = React.useMemo(() => {
    if (!keywords || !Array.isArray(keywords)) {
      return [];
    }
    
    const filtered = keywords.filter(item => 
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.url && item.url.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // 排序
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
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
  }, [keywords, searchTerm, sortField, sortDirection]);

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

  const renderSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return (
      <ArrowUpDown 
        className={`ml-2 h-4 w-4 ${
          sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
        }`} 
      />
    );
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
          {/* 搜索和页面设置 */}
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">每页显示:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('keyword')}
                >
                  <div className="flex items-center">
                    关键词
                    {renderSortIcon('keyword')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('brand')}
                >
                  <div className="flex items-center">
                    品牌
                    {renderSortIcon('brand')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center">
                    排名
                    {renderSortIcon('position')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('search_volume')}
                >
                  <div className="flex items-center">
                    搜索量
                    {renderSortIcon('search_volume')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('keyword_difficulty')}
                >
                  <div className="flex items-center">
                    难度
                    {renderSortIcon('keyword_difficulty')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('cpc')}
                >
                  <div className="flex items-center">
                    CPC
                    {renderSortIcon('cpc')}
                  </div>
                </TableHead>
                <TableHead>URL</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('traffic')}
                >
                  <div className="flex items-center">
                    流量
                    {renderSortIcon('traffic')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedKeywords.map((item, index) => (
                <TableRow key={`${item.keyword}-${item.brand}-${startIndex + index}`}>
                  <TableCell className="font-medium">{item.keyword}</TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell>
                    {item.position !== undefined && item.position !== null ? item.position : '-'}
                  </TableCell>
                  <TableCell>
                    {item.search_volume !== undefined && item.search_volume !== null
                      ? item.search_volume.toLocaleString() 
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {item.keyword_difficulty !== undefined && item.keyword_difficulty !== null
                      ? `${item.keyword_difficulty}%` 
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {item.cpc !== undefined && item.cpc !== null
                      ? `$${item.cpc.toFixed(2)}` 
                      : '-'
                    }
                  </TableCell>
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
                  <TableCell>
                    {item.traffic !== undefined && item.traffic !== null
                      ? item.traffic.toLocaleString() 
                      : '-'
                    }
                  </TableCell>
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