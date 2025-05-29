//frontend/src/components/schema/schema-preview.tsx
"use client";

import { useState } from 'react';
import { Code, RefreshCw, Eye, EyeOff, Copy, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SchemaGenerateResponse } from '@/types';
import { toast } from 'react-toastify';

interface SchemaPreviewProps {
  previewData: SchemaGenerateResponse | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function SchemaPreview({
  previewData,
  isLoading = false,
  onRefresh,
}: SchemaPreviewProps) {
  const [showFormatted, setShowFormatted] = useState(true);
  const [activeFormat, setActiveFormat] = useState<'json' | 'html'>('json');
  const [showDetails, setShowDetails] = useState(false);

  // 处理复制功能
  const handleCopy = async (content: string, format: 'json' | 'html') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        toast.success('已复制到剪贴板');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        textArea.remove();
        
        if (success) {
          toast.success('已复制到剪贴板');
        } else {
          toast.error('复制失败，请手动复制');
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  // 格式化JSON显示
  const formatJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.error('JSON parse error:', error);
      return jsonString;
    }
  };

  // 验证JSON格式
  const isValidJson = (jsonString: string) => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  // 获取数据统计信息
  const getDataStats = (content: string) => {
    const lines = content.split('\n').length;
    const characters = content.length;
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    
    return { lines, characters, words };
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-64 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无预览数据状态
  if (!previewData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Code className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">预览结构化数据</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            填写表单数据后点击预览按钮查看生成的结构化数据效果
          </p>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新预览
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // 预览模式（数据不完整）
  if (previewData.is_preview && previewData.template) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">数据预览</CardTitle>
              <Badge variant="secondary">预览模式</Badge>
            </div>
            {onRefresh && (
              <Button onClick={onRefresh} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>预览提示</AlertTitle>
            <AlertDescription>
              {previewData.message || "请填写必填字段以生成完整的结构化数据"}
            </AlertDescription>
          </Alert>
          
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">数据模板结构</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-48">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(previewData.template, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>这是基于您选择类型的数据模板</span>
            <span>填写完整数据后可生成最终结构化数据</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 完整预览数据渲染
  const jsonContent = previewData.json_ld || '';
  const htmlContent = previewData.html_script || '';
  const currentContent = activeFormat === 'json' ? jsonContent : htmlContent;
  const displayContent = activeFormat === 'json' && showFormatted ? formatJson(jsonContent) : currentContent;
  const stats = getDataStats(currentContent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">结构化数据预览</CardTitle>
            <Badge variant="default">
              {previewData.schema_type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stats.characters} 字符
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="formatted-view"
                checked={showFormatted}
                onCheckedChange={setShowFormatted}
                disabled={activeFormat === 'html'}
              />
              <Label htmlFor="formatted-view" className="text-sm">
                格式化
              </Label>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    size="sm"
                    variant="outline"
                  >
                    {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showDetails ? '隐藏详细信息' : '显示详细信息'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {onRefresh && (
              <Button onClick={onRefresh} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 格式选择和操作按钮 */}
        <div className="flex items-center justify-between">
          <Tabs value={activeFormat} onValueChange={(value) => setActiveFormat(value as 'json' | 'html')}>
            <TabsList>
              <TabsTrigger value="json">JSON-LD</TabsTrigger>
              <TabsTrigger value="html">HTML Script</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button
            onClick={() => handleCopy(currentContent, activeFormat)}
            size="sm"
            variant="outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            复制代码
          </Button>
        </div>

        {/* 主要代码显示区域 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {activeFormat === 'json' ? 'JSON-LD 格式' : 'HTML Script 标签'}
              </h4>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{stats.lines} 行</span>
                <span>{stats.words} 词</span>
                <span>{stats.characters} 字符</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <ScrollArea className="h-80">
              <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                {displayContent}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* JSON格式验证状态 */}
        {activeFormat === 'json' && (
          <div className="flex items-center space-x-2">
            {isValidJson(jsonContent) ? (
              <>
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 font-medium">JSON格式有效</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                <span className="text-xs text-red-600 font-medium">JSON格式错误</span>
              </>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>使用说明</AlertTitle>
          <AlertDescription>
            {activeFormat === 'json' ? (
              <>
                将JSON-LD代码包装在 <code>&lt;script type="application/ld+json"&gt;</code> 标签中，
                然后添加到网页的 <code>&lt;head&gt;</code> 部分。
              </>
            ) : (
              <>
                直接将此HTML代码复制并粘贴到您网页的 <code>&lt;head&gt;</code> 部分即可。
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* 详细信息区域 */}
        {showDetails && (
          <div className="space-y-4">
            <Separator />
            
            {/* 数据结构信息 */}
            {previewData.schema_data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Schema信息</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">类型:</span>
                      <code className="text-xs bg-muted px-1 rounded">
                        {previewData.schema_data['@type']}
                      </code>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Context:</span>
                      <code className="text-xs bg-muted px-1 rounded">
                        Schema.org
                      </code>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">字段数:</span>
                      <span className="font-medium">
                        {Object.keys(previewData.schema_data).filter(key => !key.startsWith('@')).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">代码统计</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">行数:</span>
                      <span className="font-medium">{stats.lines}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">字符数:</span>
                      <span className="font-medium">{stats.characters.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">文件大小:</span>
                      <span className="font-medium">
                        {stats.characters < 1024 
                          ? `${stats.characters} B` 
                          : `${(stats.characters / 1024).toFixed(2)} KB`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* 字段列表 */}
            {previewData.schema_data && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">包含的字段:</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(previewData.schema_data)
                    .filter(key => !key.startsWith('@'))
                    .map(key => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            
            {/* 在线验证工具 */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ExternalLink className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">在线验证工具</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      使用官方工具验证您的结构化数据是否符合规范：
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('https://search.google.com/test/rich-results', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        富媒体结果测试
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('https://validator.schema.org/', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Schema.org验证器
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}