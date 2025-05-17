//frontend-new/src/components/sitemap/sitemap-analysis.tsx
"use client";

import { useState } from 'react';
import { Search, List, PieChart, Layers, Info } from 'lucide-react';
import { SitemapAnalysisResponse, UrlPattern } from '@/types/sitemap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SitemapAnalysisProps {
  analysisData: SitemapAnalysisResponse | null;
  isLoading?: boolean;
}

export function SitemapAnalysis({
  analysisData,
  isLoading = false,
}: SitemapAnalysisProps) {
  const [activeTab, setActiveTab] = useState('patterns');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">请先分析Sitemap结构以查看详细信息</p>
        </CardContent>
      </Card>
    );
  }

  const renderPatterns = () => {
    if (!analysisData.url_patterns || analysisData.url_patterns.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <p>没有发现URL模式</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          识别到 {analysisData.url_patterns.length} 种URL模式结构
        </p>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模式</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>示例</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisData.url_patterns.map((pattern: UrlPattern, index: number) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-mono">{pattern.pattern}</TableCell>
                  <TableCell>{pattern.count}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">{pattern.examples[0]}</div>
                    {pattern.examples.length > 1 && (
                      <div className="truncate text-xs text-muted-foreground mt-1">+ {pattern.examples.length - 1} 更多示例</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderPathSegments = () => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          URL路径各层级分段的分布情况
        </p>
        
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(analysisData.top_path_segments).map(([depth, segments]) => (
            <Card key={depth}>
              <CardContent className="p-4">
                <h5 className="text-sm font-medium text-foreground mb-2">
                  层级 {depth.replace('depth_', '')} ({analysisData.path_segment_counts[depth]} 个不同的段)
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {segments.map(([segment, count], i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                      <span className="truncate mr-2 font-mono">{segment}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderParameters = () => {
    if (!analysisData.parameters || analysisData.parameters.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <p>没有发现URL参数</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          URL中常见的查询参数
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisData.parameters.map(([param, count], index) => (
            <div key={index} className="bg-card rounded-lg border p-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm truncate mr-2">{param}</span>
                <Badge variant="secondary">
                  {count} URLs
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Sitemap结构分析
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* 提示信息 */}
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            分析了 <span className="font-bold">{analysisData.total_urls}</span> 个URL，识别了 <span className="font-bold">{Object.keys(analysisData.domains).length}</span> 个域名。
            分析包括URL模式识别、路径层级结构和URL参数统计。
          </AlertDescription>
        </Alert>
        
        {/* 选项卡 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patterns" className="flex items-center gap-1">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">URL模式</span>
            </TabsTrigger>
            <TabsTrigger value="segments" className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">路径段</span>
            </TabsTrigger>
            <TabsTrigger value="parameters" className="flex items-center gap-1">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">URL参数</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="patterns" className="py-4">
            {renderPatterns()}
          </TabsContent>
          
          <TabsContent value="segments" className="py-4">
            {renderPathSegments()}
          </TabsContent>
          
          <TabsContent value="parameters" className="py-4">
            {renderParameters()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}