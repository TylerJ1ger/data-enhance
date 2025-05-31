//frontend/src/components/schema/schema-batch-uploader.tsx - 增强版本
"use client";

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ExternalLink,
  Sparkles,
  Database,
  Code
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FileUpload } from "@/components/file-upload";
import type { 
  SchemaBatchUploadResponse, 
  CSVTemplateInfo,
  SchemaBatchFileStats,
  CSVFormatType
} from "@/types";

interface SchemaBatchUploaderProps {
  onFilesUploaded: (result: SchemaBatchUploadResponse) => void;
  isUploading: boolean;
  uploadProgress: number;
  availableTemplates: CSVTemplateInfo[];
  onDownloadTemplate: (schemaType: string, formatType?: CSVFormatType) => void;
  disabled?: boolean;
}

export function SchemaBatchUploader({
  onFilesUploaded,
  isUploading,
  uploadProgress,
  availableTemplates,
  onDownloadTemplate,
  disabled = false
}: SchemaBatchUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'templates' | 'guide'>('upload');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('Article');
  const [selectedFormatType, setSelectedFormatType] = useState<CSVFormatType>('dynamic_fields');

  // 文件选择处理
  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setValidationErrors([]);
  }, []);

  // 开始上传
  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) {
      setValidationErrors(['请先选择文件']);
      return;
    }

    try {
      await onFilesUploaded(selectedFiles as any);
    } catch (error) {
      console.error('上传失败:', error);
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    onDownloadTemplate(selectedTemplateType, selectedFormatType);
  };

  // 渲染文件验证状态
  const renderFileValidation = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">文件验证</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>
          
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>验证错误</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // 渲染格式类型选择
  const renderFormatSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <Card 
        className={`cursor-pointer transition-colors ${
          selectedFormatType === 'dynamic_fields' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
        }`}
        onClick={() => setSelectedFormatType('dynamic_fields')}
      >
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <div>
              <h4 className="font-medium">动态字段格式 (推荐)</h4>
              <p className="text-sm text-muted-foreground">
                每个字段使用独立列，更易编辑
              </p>
              <Badge variant="secondary" className="mt-1 text-xs">
                新格式
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-colors ${
          selectedFormatType === 'data_json' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
        }`}
        onClick={() => setSelectedFormatType('data_json')}
      >
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Code className="h-8 w-8 text-amber-600" />
            <div>
              <h4 className="font-medium">传统JSON格式</h4>
              <p className="text-sm text-muted-foreground">
                使用data_json列存储所有字段
              </p>
              <Badge variant="outline" className="mt-1 text-xs">
                兼容格式
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染CSV模板下载
  const renderTemplates = () => (
    <div className="space-y-4">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>新功能：动态字段格式</AlertTitle>
        <AlertDescription>
          我们现在支持更简化的CSV格式！您可以将每个字段作为独立的列，而不需要手动编写JSON。
          <br />
          <strong>例如：</strong>url, schema_type, headline, author, datePublished, description
        </AlertDescription>
      </Alert>

      {renderFormatSelector()}

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="text-sm font-medium">选择模板类型</label>
            <Select value={selectedTemplateType} onValueChange={setSelectedTemplateType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="选择结构化数据类型" />
              </SelectTrigger>
              <SelectContent>
                {['Article', 'Product', 'Organization', 'Person', 'Event', 'VideoObject', 'WebSite', 'Breadcrumb', 'FAQPage', 'HowTo'].map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleDownloadTemplate}
            className="gap-2 mt-7"
          >
            <Download className="h-4 w-4" />
            下载模板
          </Button>
        </div>

        {/* 格式对比示例 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                动态字段格式示例
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`url,schema_type,headline,author,datePublished
https://example.com/article1,Article,如何优化网站SEO,张三,2024-01-15
https://example.com/article2,Article,前端开发最佳实践,李四,2024-01-10`}
              </pre>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-green-600">✓ 易于编辑和理解</p>
                <p className="text-xs text-green-600">✓ 支持Excel编辑</p>
                <p className="text-xs text-green-600">✓ 不需要JSON知识</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4 text-amber-600" />
                传统JSON格式示例
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`url,schema_type,data_json
https://example.com/article1,Article,"{""headline"":""如何优化网站SEO"",""author"":""张三""}"
https://example.com/article2,Article,"{""headline"":""前端开发最佳实践"",""author"":""李四""}"`}
              </pre>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-amber-600">• 需要JSON格式知识</p>
                <p className="text-xs text-amber-600">• 适合程序化生成</p>
                <p className="text-xs text-amber-600">• 向后兼容</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // 渲染使用指南
  const renderGuide = () => (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>批量处理流程</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>选择CSV格式类型（推荐动态字段格式）</li>
            <li>下载对应类型的CSV模板</li>
            <li>按照模板格式填写数据</li>
            <li>上传填写好的CSV文件</li>
            <li>批量生成结构化数据</li>
            <li>导出生成的结果</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">动态字段格式详解</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm">基础列（必需）</h5>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li><strong>url</strong>: 目标网页URL</li>
                <li><strong>schema_type</strong>: 结构化数据类型（如Article、Product等）</li>
              </ul>
            </div>

            <div>
              <h5 className="font-medium text-sm">Article类型字段示例</h5>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <p><strong>headline</strong> (必需): 文章标题</p>
                  <p><strong>author</strong> (必需): 作者姓名</p>
                  <p><strong>datePublished</strong> (必需): 发布日期</p>
                </div>
                <div>
                  <p><strong>description</strong> (可选): 文章描述</p>
                  <p><strong>image</strong> (可选): 文章配图URL</p>
                  <p><strong>publisher</strong> (可选): 发布机构</p>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm">Product类型字段示例</h5>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <p><strong>name</strong> (必需): 产品名称</p>
                  <p><strong>description</strong> (可选): 产品描述</p>
                  <p><strong>brand</strong> (可选): 品牌名称</p>
                </div>
                <div>
                  <p><strong>price</strong> (可选): 价格</p>
                  <p><strong>currency</strong> (可选): 货币代码</p>
                  <p><strong>image</strong> (可选): 产品图片</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">字段映射智能识别</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            系统支持多种列名格式，会自动识别以下常见变体：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">标题字段识别：</p>
              <p className="text-muted-foreground">headline, title, article_title, 标题, 文章标题</p>
            </div>
            <div>
              <p className="font-medium">作者字段识别：</p>
              <p className="text-muted-foreground">author, writer, author_name, 作者, 作者姓名</p>
            </div>
            <div>
              <p className="font-medium">日期字段识别：</p>
              <p className="text-muted-foreground">datePublished, publish_date, date, 发布日期</p>
            </div>
            <div>
              <p className="font-medium">描述字段识别：</p>
              <p className="text-muted-foreground">description, summary, 描述, 摘要, 简介</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">注意事项</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>单个文件大小不超过10MB</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>最多同时上传10个文件</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>支持CSV和XLSX文件格式</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>同一URL+schema_type组合会自动去重，保留最后一个</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>系统会自动检测CSV格式类型并进行智能处理</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">支持的结构化数据类型</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {[
              'Article', 'Product', 'Organization', 'Person', 
              'Event', 'VideoObject', 'WebSite', 'Breadcrumb',
              'FAQPage', 'HowTo'
            ].map((type) => (
              <Badge key={type} variant="outline" className="justify-center">
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          批量上传CSV文件
        </CardTitle>
        <CardDescription>
          上传包含结构化数据信息的CSV文件进行批量处理。现已支持更简化的动态字段格式！
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              文件上传
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              模板下载
              <Badge variant="secondary" className="ml-1 text-xs">
                新
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2">
              <Info className="h-4 w-4" />
              使用指南
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={disabled || isUploading}
              accept={{
                'text/csv': ['.csv'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              }}
              multiple={true}
            />

            {renderFileValidation()}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">上传进度</span>
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {selectedFiles.length > 0 && !isUploading && (
              <Button 
                onClick={handleStartUpload}
                disabled={disabled || validationErrors.length > 0}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                开始上传 ({selectedFiles.length} 个文件)
              </Button>
            )}
          </TabsContent>

          <TabsContent value="templates">
            {renderTemplates()}
          </TabsContent>

          <TabsContent value="guide">
            {renderGuide()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}