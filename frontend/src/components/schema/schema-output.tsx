//frontend/src/components/schema/schema-output.tsx
"use client";

import { useState } from 'react';
import { 
  Copy, 
  Download, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  ExternalLink,
  Code2,
  FileJson,
  FileCode
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SchemaGenerateResponse, SchemaOutputFormat } from '@/types';
import { toast } from 'react-toastify';

interface SchemaOutputProps {
  generatedData: SchemaGenerateResponse | null;
  outputFormat: SchemaOutputFormat;
  onFormatChange: (format: SchemaOutputFormat) => void;
  onCopy?: () => void;
  onDownload?: () => void;
}

export function SchemaOutput({
  generatedData,
  outputFormat,
  onFormatChange,
  onCopy,
  onDownload,
}: SchemaOutputProps) {
  const [showFormatted, setShowFormatted] = useState(true);
  const [showValidationInfo, setShowValidationInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // 处理复制成功状态重置
  const handleCopySuccess = (type: string) => {
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // 无数据状态
  if (!generatedData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Code2 className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">生成结构化数据</h3>
          <p className="text-muted-foreground mb-4">
            完成表单填写后点击"生成"按钮创建结构化数据
          </p>
          <Badge variant="outline">等待生成...</Badge>
        </CardContent>
      </Card>
    );
  }

  // 格式化JSON显示
  const formatJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  // 获取当前显示的内容
  const getCurrentContent = () => {
    return outputFormat === 'json-ld' 
      ? generatedData.json_ld 
      : generatedData.html_script;
  };

  // 获取当前格式的扩展名
  const getCurrentExtension = () => {
    return outputFormat === 'json-ld' ? 'json' : 'html';
  };

  // 获取当前格式的MIME类型
  const getCurrentMimeType = () => {
    return outputFormat === 'json-ld' ? 'application/json' : 'text/html';
  };

  // 计算数据统计信息
  const getDataStats = () => {
    const content = getCurrentContent();
    const lines = content.split('\n').length;
    const characters = content.length;
    const bytes = new Blob([content]).size;
    
    return {
      lines,
      characters,
      bytes,
      size: bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
    };
  };

  // 处理内部复制功能
  const handleInternalCopy = async (content: string, type: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        handleCopySuccess(type);
        toast.success(`${type} 已复制到剪贴板`);
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
          handleCopySuccess(type);
          toast.success(`${type} 已复制到剪贴板`);
        } else {
          toast.error('复制失败，请手动复制');
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  const stats = getDataStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">结构化数据输出</CardTitle>
            <Badge variant="default">
              {generatedData.schema_type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.size}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="formatted-view"
                checked={showFormatted}
                onCheckedChange={setShowFormatted}
              />
              <Label htmlFor="formatted-view" className="text-sm">
                格式化
              </Label>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowValidationInfo(!showValidationInfo)}
                    size="sm"
                    variant="outline"
                  >
                    {showValidationInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showValidationInfo ? '隐藏验证信息' : '显示验证信息'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 格式选择器和操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Tabs value={outputFormat} onValueChange={(value) => onFormatChange(value as SchemaOutputFormat)}>
              <TabsList>
                <TabsTrigger value="json-ld" className="gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON-LD
                </TabsTrigger>
                <TabsTrigger value="html" className="gap-2">
                  <FileCode className="h-4 w-4" />
                  HTML Script
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="text-sm text-muted-foreground">
              {stats.size} · {stats.lines} 行
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleInternalCopy(getCurrentContent(), outputFormat === 'json-ld' ? 'JSON-LD' : 'HTML')}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    {copySuccess === (outputFormat === 'json-ld' ? 'JSON-LD' : 'HTML') ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        复制
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  复制 {outputFormat === 'json-ld' ? 'JSON-LD' : 'HTML'} 代码
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {onCopy && (
              <Button onClick={onCopy} size="sm" variant="outline" className="gap-2">
                <Copy className="h-4 w-4" />
                复制 (外部)
              </Button>
            )}
            
            {onDownload && (
              <Button onClick={onDownload} size="sm" variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                下载
              </Button>
            )}
          </div>
        </div>

        {/* 主要内容区域 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">
                  {outputFormat === 'json-ld' ? 'JSON-LD 格式' : 'HTML Script 标签'}
                </h4>
                <Badge variant="outline" className="text-xs">
                  .{getCurrentExtension()}
                </Badge>
                {getCurrentMimeType() && (
                  <Badge variant="secondary" className="text-xs">
                    {getCurrentMimeType()}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-xs text-muted-foreground">
                  {stats.characters.toLocaleString()} 字符
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="formatted-view"
                    checked={showFormatted}
                    onCheckedChange={setShowFormatted}
                  />
                  <Label htmlFor="formatted-view" className="text-xs">
                    格式化
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <ScrollArea className="h-96">
              <pre className="text-sm font-mono whitespace-pre-wrap break-all selection:bg-primary/20">
                {outputFormat === 'json-ld' && showFormatted 
                  ? formatJson(generatedData.json_ld)
                  : getCurrentContent()
                }
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 快速操作区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">快速复制</h4>
                <Badge variant="outline" className="text-xs">
                  {outputFormat === 'json-ld' ? 'JSON' : 'HTML'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => handleInternalCopy(generatedData.json_ld, 'JSON-LD')}
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  复制 JSON-LD
                  {copySuccess === 'JSON-LD' && <Check className="h-3 w-3 text-green-600 ml-auto" />}
                </Button>
                <Button
                  onClick={() => handleInternalCopy(generatedData.html_script, 'HTML')}
                  size="sm"
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <FileCode className="h-4 w-4" />
                  复制 HTML Script
                  {copySuccess === 'HTML' && <Check className="h-3 w-3 text-green-600 ml-auto" />}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">数据信息</h4>
                <Badge variant="secondary" className="text-xs">
                  {generatedData.schema_type}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">字段数:</span>
                  <span className="font-medium">
                    {Object.keys(generatedData.schema_data).filter(key => !key.startsWith('@')).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">文件大小:</span>
                  <span className="font-medium">{stats.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schema版本:</span>
                  <span className="font-medium text-xs">Schema.org</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 使用说明 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>使用说明</AlertTitle>
          <AlertDescription>
            {outputFormat === 'json-ld' ? (
              <div className="space-y-2">
                <p>将JSON-LD代码包装在 &lt;script type="application/ld+json"&gt; 标签中，然后添加到网页的 &lt;head&gt; 部分。</p>
                <div className="bg-muted p-2 rounded text-xs font-mono mt-2">
                  {`<script type="application/ld+json">`}<br/>
                  {`  // 您的JSON-LD代码`}<br/>
                  {`</script>`}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p>直接将此HTML代码复制并粘贴到您网页的 &lt;head&gt; 部分即可。</p>
                <p className="text-xs text-muted-foreground">该代码已经包含了完整的script标签，可以直接使用。</p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* 验证信息 */}
        {showValidationInfo && (
          <div className="space-y-4">
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">数据统计</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">文件大小:</span>
                    <span className="font-medium">{stats.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">行数:</span>
                    <span className="font-medium">{stats.lines}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">字符数:</span>
                    <span className="font-medium">{stats.characters.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">MIME类型:</span>
                    <span className="font-medium text-xs">{getCurrentMimeType()}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Schema信息</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">类型:</span>
                    <span className="font-medium">{generatedData.schema_data['@type']}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Context:</span>
                    <span className="font-medium text-xs">Schema.org</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">字段数:</span>
                    <span className="font-medium">
                      {Object.keys(generatedData.schema_data).filter(key => !key.startsWith('@')).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">必填字段:</span>
                    <span className="font-medium text-green-600">✓ 完成</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 在线验证工具链接 */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">验证结构化数据</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      使用Google的官方工具验证您的结构化数据是否符合规范：
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('https://search.google.com/test/rich-results', '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        富媒体结果测试
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('https://validator.schema.org/', '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Schema.org验证器
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('https://search.google.com/structured-data/testing-tool', '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        结构化数据测试工具
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 显示/隐藏验证信息按钮 */}
        <div className="flex justify-center">
          <Button
            onClick={() => setShowValidationInfo(!showValidationInfo)}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            {showValidationInfo ? (
              <>
                <EyeOff className="h-4 w-4" />
                隐藏详细信息
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                显示详细信息
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}