//frontend/src/components/schema/schema-batch-preview.tsx
"use client";

import { useState } from 'react';
import { 
  Eye, 
  Code, 
  AlertCircle, 
  CheckCircle, 
  FileText,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { 
  SchemaBatchPreviewResponse,
  SchemaBatchGenerateResponse 
} from "@/types";

interface SchemaBatchPreviewProps {
  previewData: SchemaBatchPreviewResponse | null;
  generateStats: SchemaBatchGenerateResponse | null;
  onRefreshPreview: () => void;
  isLoading: boolean;
}

export function SchemaBatchPreview({
  previewData,
  generateStats,
  onRefreshPreview,
  isLoading
}: SchemaBatchPreviewProps) {
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'raw' | 'generated'>('raw');

  // 渲染原始数据预览
  const renderRawDataPreview = () => {
    if (!previewData?.preview) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无预览数据</p>
              <Button 
                onClick={onRefreshPreview}
                disabled={isLoading}
                className="mt-4"
                variant="outline"
              >
                刷新预览
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">原始数据预览</h4>
            <p className="text-sm text-muted-foreground">
              显示前 {previewData.showing} 条，共 {previewData.total_rows} 条数据
            </p>
          </div>
          <Button 
            onClick={onRefreshPreview}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            刷新
          </Button>
        </div>

        <div className="space-y-3">
          {previewData.preview.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {item.schema_type}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedPreviewItem(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>数据详情</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>URL</Label>
                          <p className="text-sm bg-muted p-2 rounded">{item.url}</p>
                        </div>
                        <div>
                          <Label>类型</Label>
                          <p className="text-sm bg-muted p-2 rounded">{item.schema_type}</p>
                        </div>
                        <div>
                          <Label>JSON数据</Label>
                          <ScrollArea className="h-40">
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                              {JSON.stringify(JSON.parse(item.data_json), null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div>
                  <p className="text-sm font-medium truncate">{item.url}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {(() => {
                      try {
                        const data = JSON.parse(item.data_json);
                        return Object.keys(data).join(', ');
                      } catch {
                        return '无效JSON格式';
                      }
                    })()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // 渲染生成结果预览
  const renderGeneratedPreview = () => {
    if (!generateStats?.preview) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无生成结果</p>
              <p className="text-sm text-muted-foreground mt-2">
                请先完成批量生成操作
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">生成结果预览</h4>
            <p className="text-sm text-muted-foreground">
              已处理 {generateStats.total_processed} 个结构化数据，涵盖 {generateStats.unique_urls} 个URL
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default">
              {generateStats.total_processed} 已生成
            </Badge>
            {generateStats.generation_errors.length > 0 && (
              <Badge variant="destructive">
                {generateStats.generation_errors.length} 错误
              </Badge>
            )}
          </div>
        </div>

        {/* 错误信息 */}
        {generateStats.generation_errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>生成错误</AlertTitle>
            <AlertDescription>
              <ScrollArea className="h-24 mt-2">
                <ul className="space-y-1">
                  {generateStats.generation_errors.slice(0, 5).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                  {generateStats.generation_errors.length > 5 && (
                    <li className="text-sm text-muted-foreground">
                      还有 {generateStats.generation_errors.length - 5} 个错误...
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* 生成结果预览 */}
        <div className="space-y-3">
          {Object.entries(generateStats.preview).map(([url, data]) => (
            <Card key={url} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="secondary" className="text-xs">
                      {data.schema_count} 个数据
                    </Badge>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>生成结果详情</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>URL</Label>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm bg-muted p-2 rounded flex-1">{url}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>结构化数据类型</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {data.types.map((type, index) => (
                              <Badge key={index} variant="outline">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>统计信息</Label>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="bg-muted p-3 rounded">
                              <p className="text-sm text-muted-foreground">数据数量</p>
                              <p className="font-medium">{data.schema_count}</p>
                            </div>
                            <div className="bg-muted p-3 rounded">
                              <p className="text-sm text-muted-foreground">类型数量</p>
                              <p className="font-medium">{data.types.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div>
                  <p className="text-sm font-medium truncate">{url}</p>
                  <p className="text-xs text-muted-foreground">
                    类型: {data.types.join(', ')}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // 渲染统计概览
  const renderStatisticsOverview = () => {
    if (!previewData && !generateStats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {previewData && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{previewData.total_rows || 0}</p>
                <p className="text-sm text-muted-foreground">总数据行数</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {generateStats && (
          <>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{generateStats.total_processed}</p>
                  <p className="text-sm text-muted-foreground">已生成数据</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{generateStats.unique_urls}</p>
                  <p className="text-sm text-muted-foreground">涉及URL数</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderStatisticsOverview()}
      
      <Card>
        <CardHeader>
          <CardTitle>数据预览</CardTitle>
          <CardDescription>
            查看上传的原始数据和生成的结构化数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="raw" className="gap-2">
                <FileText className="h-4 w-4" />
                原始数据
                {previewData?.total_rows && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {previewData.total_rows}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="generated" className="gap-2">
                <Code className="h-4 w-4" />
                生成结果
                {generateStats?.total_processed && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {generateStats.total_processed}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="raw" className="mt-6">
              {renderRawDataPreview()}
            </TabsContent>

            <TabsContent value="generated" className="mt-6">
              {renderGeneratedPreview()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Label组件简单定义（如果不存在的话）
function Label({ children, ...props }: { children: React.ReactNode } & React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="text-sm font-medium text-foreground" {...props}>
      {children}
    </label>
  );
}