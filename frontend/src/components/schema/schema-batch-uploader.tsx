//frontend/src/components/schema/schema-batch-uploader.tsx
"use client";

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { FileUpload } from "@/components/file-upload";
import type { 
  SchemaBatchUploadResponse, 
  CSVTemplateInfo,
  SchemaBatchFileStats 
} from "@/types";

interface SchemaBatchUploaderProps {
  onFilesUploaded: (result: SchemaBatchUploadResponse) => void;
  isUploading: boolean;
  uploadProgress: number;
  availableTemplates: CSVTemplateInfo[];
  onDownloadTemplate: (schemaType: string) => void;
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
      // 这里应该调用实际的上传逻辑
      // onFilesUploaded 将由父组件处理
      await onFilesUploaded(selectedFiles as any);
    } catch (error) {
      console.error('上传失败:', error);
    }
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

  // 渲染CSV模板下载
  const renderTemplates = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>CSV文件格式要求</AlertTitle>
        <AlertDescription>
          CSV文件必须包含以下列：
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>url</strong>: 目标网页URL</li>
            <li><strong>schema_type</strong>: 结构化数据类型 (Article、Product等)</li>
            <li><strong>data_json</strong>: 结构化数据字段的JSON字符串</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {availableTemplates.map((template) => (
          <Card key={template.schemaType}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {template.schemaType}
                  </Badge>
                </div>
                <Button
                  onClick={() => onDownloadTemplate(template.schemaType)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  下载模板
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
          <CardTitle className="text-base">data_json 字段说明</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            data_json字段应包含JSON格式的结构化数据字段，例如：
          </p>
          
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm">Article 类型示例：</h5>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">
{`{
  "headline": "如何优化网站SEO",
  "author": "张三",
  "datePublished": "2024-01-15",
  "description": "完整的SEO优化指南"
}`}
              </pre>
            </div>

            <div>
              <h5 className="font-medium text-sm">Product 类型示例：</h5>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">
{`{
  "name": "无线蓝牙耳机",
  "description": "高音质无线耳机",
  "brand": "TechBrand",
  "price": "299",
  "currency": "CNY"
}`}
              </pre>
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
              <span>同一URL+schema_type组合会自动去重，保留最后一个</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>data_json必须是有效的JSON格式</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">支持的结构化数据类型</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
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
        <CardTitle>批量上传CSV文件</CardTitle>
        <CardDescription>
          上传包含结构化数据信息的CSV文件进行批量处理
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