// frontend-new/src/components/backlink/cross-analysis-results.tsx
"use client";

import { useState } from 'react';
import { Download, Search, Filter } from 'lucide-react';
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

interface CrossAnalysisResult {
  page_ascore: number;
  source_title: string;
  source_url: string;
  target_url: string;
  anchor: string;
  nofollow: boolean;
}

interface CrossAnalysisResultsProps {
  results: CrossAnalysisResult[];
  isLoading: boolean;
  onExport: () => void;
}

export function CrossAnalysisResults({
  results,
  isLoading,
  onExport
}: CrossAnalysisResultsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof CrossAnalysisResult>('page_ascore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 筛选和排序结果
  const filteredResults = results.filter(result => {
    const searchLower = searchTerm.toLowerCase();
    return (
      result.source_url.toLowerCase().includes(searchLower) ||
      result.target_url.toLowerCase().includes(searchLower) ||
      result.source_title.toLowerCase().includes(searchLower) ||
      (result.anchor && result.anchor.toLowerCase().includes(searchLower))
    );
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    } else {
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    }
  });

  // 处理排序逻辑
  const handleSort = (column: keyof CrossAnalysisResult) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 获取排序图标
  const getSortIcon = (column: keyof CrossAnalysisResult) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
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
    <Card className="w-full">
      <CardHeader className="space-y-0 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CardTitle>交叉分析结果</CardTitle>
            <Badge variant="secondary">{results.length} 条匹配</Badge>
          </div>
          
          <Button onClick={onExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            导出结果
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="p-4 border-b">
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
              <span className="text-sm text-muted-foreground">排序方式:</span>
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
            </div>
          </div>
        </div>
        
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('page_ascore')}>
                    页面权重 {getSortIcon('page_ascore')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('source_title')}>
                    来源标题 {getSortIcon('source_title')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('source_url')}>
                    来源URL {getSortIcon('source_url')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('target_url')}>
                    目标URL {getSortIcon('target_url')}
                  </TableHead>
                  <TableHead>锚文本</TableHead>
                  <TableHead className="w-[100px] text-center">Nofollow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      未找到匹配的结果
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.page_ascore}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={result.source_title}>
                        {result.source_title || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <a 
                          href={result.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          title={result.source_url}
                        >
                          {result.source_url}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <a 
                          href={result.target_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          title={result.target_url}
                        >
                          {result.target_url}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={result.anchor}>
                        {result.anchor || '-'}
                      </TableCell>
                      <TableCell className="text-center">
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
        </div>
        
        {filteredResults.length > 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            显示 {filteredResults.length} 条结果，共 {results.length} 条
          </div>
        )}
      </CardContent>
    </Card>
  );
}