//frontend-new/src/components/sitemap/sitemap-stats.tsx
"use client";

import { Link, List, Layers, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  SitemapUploadResponse, 
  SitemapFilterResponse, 
  SitemapAnalysisResponse 
} from "@/types/sitemap";

interface SitemapStatsProps {
  uploadData: SitemapUploadResponse | null;
  analysisData: SitemapAnalysisResponse | null;
  filteredData: SitemapFilterResponse | null;
  isLoading?: boolean;
}

export function SitemapStats({
  uploadData,
  analysisData,
  filteredData,
  isLoading = false,
}: SitemapStatsProps) {
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 如果没有数据，显示提示信息
  if (!uploadData) {
    return (
      <Card className="mb-6">
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <List className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">上传Sitemap文件以查看统计信息</p>
        </CardContent>
      </Card>
    );
  }

  // 计算筛选前后的URL数量百分比
  const totalUrls = uploadData.total_urls;
  const filteredUrls = filteredData?.total_filtered || totalUrls;
  const filteredPercentage = Math.round((filteredUrls / totalUrls) * 100);

  // 构建深度分布数据
  const depthData = uploadData.url_structure || {};
  
  // 获取最大深度值，用于计算柱状图比例
  const maxDepthCount = Object.values(depthData).length > 0 
    ? Math.max(...Object.values(depthData) as number[]) 
    : 0;

  return (
    <>
      {/* Sitemap统计信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sitemap统计信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">总URL数量：</div>
            <div className="font-medium">{totalUrls.toLocaleString()}</div>
          </div>
          
          {filteredData && filteredUrls !== totalUrls && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">筛选后URL数量：</div>
                <div className="font-medium">{filteredUrls.toLocaleString()} ({filteredPercentage}%)</div>
              </div>
              <Progress value={filteredPercentage} className="h-2" />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">域名数量：</div>
            <div className="font-medium">{uploadData.top_level_domains.length}</div>
          </div>
          
          {analysisData && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">平均URL深度：</div>
                <div className="font-medium">{analysisData.avg_depth?.toFixed(1) || '未知'}</div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">最大URL深度：</div>
                <div className="font-medium">{analysisData.max_depth || '未知'}</div>
              </div>
            </>
          )}
          
          {/* 域名列表 */}
          {uploadData.top_level_domains.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">包含的域名：</h4>
              <div className="bg-muted/40 p-2 rounded-md max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {uploadData.top_level_domains.map((domain, index) => (
                    <li key={index} className="text-sm flex items-center">
                      <Badge variant="outline" className="mr-2 size-5 flex items-center justify-center rounded-full">
                        {index + 1}
                      </Badge>
                      {domain}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* URL深度分布 */}
      {Object.keys(depthData).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>URL深度分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(depthData)
              .sort(([depthA], [depthB]) => parseInt(depthA) - parseInt(depthB))
              .map(([depth, count]) => {
                // 计算条形图的宽度百分比
                const widthPercentage = maxDepthCount ? Math.round((count as number / maxDepthCount) * 100) : 0;
                
                return (
                  <div key={depth} className="flex items-center">
                    <div className="w-8 text-sm text-right mr-3">{depth}</div>
                    <div className="flex-1">
                      <Progress 
                        value={widthPercentage} 
                        className="h-6"
                        indicatorClassName="flex items-center px-2 text-xs text-white"
                        style={{ 
                          minWidth: count ? '30px' : '0' 
                        }}
                      >
                        {count}
                      </Progress>
                    </div>
                  </div>
                );
              })}
              
            <div className="mt-2 text-xs text-muted-foreground italic">
              深度: URL路径中的层级数 (例如: /blog/2023/post = 深度3)
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 扩展性信息区域 - 如果有分析数据的话 */}
      {analysisData && (analysisData.depth_distribution || analysisData.extensions || analysisData.url_patterns) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>URL分析详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisData.avg_url_length && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">平均URL长度：</div>
                <div className="font-medium">{Math.round(analysisData.avg_url_length)} 字符</div>
              </div>
            )}
            
            {/* 文件类型分布 */}
            {analysisData.extensions && Object.keys(analysisData.extensions).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">文件类型分布：</h4>
                <div className="bg-muted/40 p-3 rounded-md grid grid-cols-2 gap-2 md:grid-cols-3">
                  {Object.entries(analysisData.extensions)
                    .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                    .slice(0, 9)
                    .map(([ext, count]) => (
                      <div key={ext} className="flex items-center justify-between">
                        <span className="text-sm font-medium">.{ext}</span>
                        <Badge variant="secondary" className="text-xs">
                          {count as number}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* 常见URL模式 */}
            {analysisData.url_patterns && analysisData.url_patterns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">常见URL模式：</h4>
                <div className="bg-muted/40 p-3 rounded-md max-h-48 overflow-y-auto">
                  <ul className="space-y-2">
                    {analysisData.url_patterns.slice(0, 5).map((pattern, index) => (
                      <li key={index} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{pattern.pattern}</span>
                          <Badge>
                            {pattern.count}个URL
                          </Badge>
                        </div>
                        {pattern.examples && pattern.examples.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            例如: {pattern.examples[0]}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* 信息提示 */}
            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-md text-sm">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-medium">分析提示：</span> URL结构分析可帮助您理解网站的层次结构和内容组织方式，对优化站点架构和导航有重要参考价值。
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}