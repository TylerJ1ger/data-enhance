//frontend/src/components/schema/schema-batch-exporter.tsx
"use client";

import { useState } from 'react';
import { 
  Download, 
  Package, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  Archive
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { 
  SchemaBatchExportResponse,
  SchemaBatchGenerateResponse 
} from "@/types";

interface SchemaBatchExporterProps {
  generateStats: SchemaBatchGenerateResponse | null;
  onExport: (exportType: 'combined' | 'separated') => Promise<any>;
  isExporting: boolean;
  exportProgress?: number;
  disabled?: boolean;
}

export function SchemaBatchExporter({
  generateStats,
  onExport,
  isExporting,
  exportProgress = 0,
  disabled = false
}: SchemaBatchExporterProps) {
  const [exportType, setExportType] = useState<'combined' | 'separated'>('combined');
  const [lastExportResult, setLastExportResult] = useState<any>(null);
  const [showExportResult, setShowExportResult] = useState(false);

  // 处理导出
  const handleExport = async () => {
    try {
      const result = await onExport(exportType);
      setLastExportResult(result);
      
      if (exportType === 'separated' && result) {
        setShowExportResult(true);
      }
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 渲染导出选项
  const renderExportOptions = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">选择导出方式</Label>
        <p className="text-sm text-muted-foreground mt-1">
          根据您的使用需求选择合适的导出格式
        </p>
      </div>
      
      <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as any)}>
        <div className="space-y-4">
          {/* 合并导出选项 */}
          <Card className={`cursor-pointer transition-colors ${exportType === 'combined' ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="combined" id="combined" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="combined" className="text-base font-medium cursor-pointer">
                    合并导出 (推荐)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    将所有结构化数据合并到一个JSON文件中，便于批量管理和备份
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      单文件
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      JSON格式
                    </Badge>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium">文件结构：</p>
                    <pre className="bg-muted p-2 rounded text-xs">
{`{
  "generated_at": "2024-01-15T10:30:00Z",
  "total_urls": 10,
  "total_schemas": 15,
  "urls": {
    "https://example.com/page1": {
      "schemas": [...],
      "schema_count": 2
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 分离导出选项 */}
          <Card className={`cursor-pointer transition-colors ${exportType === 'separated' ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="separated" id="separated" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="separated" className="text-base font-medium cursor-pointer">
                    分离导出
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    为每个URL生成独立的JSON-LD文件，便于直接部署到网站
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      多文件
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      JSON-LD格式
                    </Badge>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium">文件格式：</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• 每个URL对应一个.json文件</p>
                      <p>• 文件名：安全化的URL + 时间戳</p>
                      <p>• 内容：直接可用的JSON-LD代码</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>
    </div>
  );

  // 渲染导出统计信息
  const renderExportStats = () => {
    if (!generateStats) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">导出统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{generateStats.unique_urls}</p>
              <p className="text-sm text-muted-foreground">URL数量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{generateStats.total_processed}</p>
              <p className="text-sm text-muted-foreground">结构化数据</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <p className="text-sm font-medium">预计文件大小：</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">合并导出</p>
                <p className="font-medium">约 {Math.ceil(generateStats.total_processed * 0.5)} KB</p>
              </div>
              <div>
                <p className="text-muted-foreground">分离导出</p>
                <p className="font-medium">{generateStats.unique_urls} 个文件</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染分离导出结果
  const renderSeparatedExportResult = () => {
    if (!lastExportResult || !lastExportResult.data) return null;

    const files = Object.entries(lastExportResult.data);

    return (
      <Dialog open={showExportResult} onOpenChange={setShowExportResult}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>分离导出结果</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>导出成功</AlertTitle>
              <AlertDescription>
                共生成 {files.length} 个JSON-LD文件，点击下方按钮逐个下载
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {files.map(([filename, fileInfo]: [string, any]) => (
                  <Card key={filename} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{filename}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {fileInfo.url}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {fileInfo.schema_count} 个数据
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {Math.ceil(fileInfo.json_ld.length / 1024)} KB
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(fileInfo.json_ld)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const blob = new Blob([fileInfo.json_ld], { type: 'application/ld+json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = filename;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  // 批量下载所有文件
                  files.forEach(([filename, fileInfo]: [string, any]) => {
                    setTimeout(() => {
                      const blob = new Blob([fileInfo.json_ld], { type: 'application/ld+json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = filename;
                      link.click();
                      URL.revokeObjectURL(url);
                    }, files.indexOf([filename, fileInfo]) * 100); // 间隔100ms下载
                  });
                }}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                批量下载全部
              </Button>
              
              <Button onClick={() => setShowExportResult(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // 检查是否可以导出
  const canExport = generateStats && generateStats.total_processed > 0 && !disabled;

  return (
    <div className="space-y-6">
      {/* 导出统计 */}
      {renderExportStats()}

      {/* 导出选项 */}
      <Card>
        <CardHeader>
          <CardTitle>导出设置</CardTitle>
          <CardDescription>
            选择合适的导出方式来下载生成的结构化数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canExport ? (
            <div className="space-y-6">
              {renderExportOptions()}

              {/* 导出进度 */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">导出进度</span>
                    <span className="text-sm">{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}

              {/* 导出按钮 */}
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full gap-2"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Download className="h-4 w-4 animate-pulse" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {exportType === 'combined' ? '导出合并文件' : '导出分离文件'}
                  </>
                )}
              </Button>

              {/* 使用说明 */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>使用说明</AlertTitle>
                <AlertDescription>
                  {exportType === 'combined' ? (
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                      <li>下载的JSON文件包含所有URL的结构化数据</li>
                      <li>可用于数据备份、批量管理或系统集成</li>
                      <li>适合技术团队进行后续处理</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                      <li>每个URL对应一个独立的JSON-LD文件</li>
                      <li>文件内容可直接复制到网页的 &lt;head&gt; 部分</li>
                      <li>适合逐页手动部署或自动化部署</li>
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">暂无可导出的数据</p>
              <p className="text-sm text-muted-foreground">
                请先完成批量生成操作
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 导出结果弹窗 */}
      {renderSeparatedExportResult()}

      {/* 验证提示 */}
      {canExport && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">导出后验证</h4>
                <p className="text-sm text-blue-700 mt-1">
                  建议使用Google的结构化数据测试工具验证生成的代码
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => window.open('https://search.google.com/test/rich-results', '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                  打开验证工具
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}