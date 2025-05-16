// frontend-new/src/components/backlink/cross-analysis-results.tsx
"use client";

import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof CrossAnalysisResult>('page_ascore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [displayMode, setDisplayMode] = useState<'flat' | 'compare'>('flat');
  const [cellDisplayType, setCellDisplayType] = useState<'target_url' | 'source_title' | 'source_url' | 'anchor' | 'nofollow'>('target_url');
  const [compareSort, setCompareSort] = useState<'ascore' | 'domain'>('ascore');
  const [compareSortDirection, setCompareSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // 处理对比视图排序
  const handleCompareSort = (column: 'ascore' | 'domain') => {
    if (compareSort === column) {
      setCompareSortDirection(compareSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCompareSort(column);
      setCompareSortDirection('desc');
    }
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
              {displayMode === 'flat' && (
                <>
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
                </>
              )}
              
              {/* 添加切换Tab的组件 */}
              <Tabs 
                defaultValue="flat" 
                className="w-[200px]"
                onValueChange={(value) => setDisplayMode(value as 'flat' | 'compare')}
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
                <span className="text-sm text-muted-foreground">排序方式:</span>
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
                <span className="text-sm text-muted-foreground">显示内容:</span>
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
            </div>
          )}
        </div>
        
        {/* 平铺视图 */}
        {displayMode === 'flat' && (
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
        )}
        
        {/* 对比视图 */}
        {displayMode === 'compare' && (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
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
                    {comparisonData.targetDomains.map((domain, index) => (
                      <TableHead key={index} className="min-w-[200px]">
                        {domain}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.domains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2 + comparisonData.targetDomains.length} className="text-center py-6 text-muted-foreground">
                        未找到匹配的结果
                      </TableCell>
                    </TableRow>
                  ) : (
                    comparisonData.domains.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.ascore}</TableCell>
                        <TableCell className="font-medium">{item.domain}</TableCell>
                        {item.targets.map((result, targetIndex) => (
                          <TableCell key={targetIndex} className="max-w-[200px] truncate">
                            {result ? (
                              cellDisplayType === 'target_url' || cellDisplayType === 'source_url' ? (
                                <a 
                                  href={getCellValue(result, cellDisplayType)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                  title={getCellValue(result, cellDisplayType)}
                                >
                                  {getCellValue(result, cellDisplayType)}
                                </a>
                              ) : cellDisplayType === 'nofollow' ? (
                                <Badge variant={result.nofollow ? "secondary" : "outline"}>
                                  {getCellValue(result, cellDisplayType)}
                                </Badge>
                              ) : (
                                <span title={getCellValue(result, cellDisplayType)}>
                                  {getCellValue(result, cellDisplayType)}
                                </span>
                              )
                            ) : (
                              "None"
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {filteredResults.length > 0 && displayMode === 'flat' && (
          <div className="p-4 text-sm text-muted-foreground">
            显示 {filteredResults.length} 条结果，共 {results.length} 条
          </div>
        )}
      </CardContent>
    </Card>
  );
}