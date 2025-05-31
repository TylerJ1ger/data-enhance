//frontend/src/components/schema/schema-batch-uploader.tsx - 完整更新版
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
  Code,
  Archive,
  RefreshCw,
  Eye,
  Copy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { FileUpload } from "@/components/file-upload";
import type { CSVFormatType } from "@/types";

// 修正后的接口定义
interface SchemaBatchUploaderProps {
  onFilesUploaded: (files: File[]) => Promise<void>; // 修正：接收File[]
  isUploading: boolean;
  uploadProgress: number;
  onDownloadTemplate: (schemaType: string, formatType?: CSVFormatType) => void;
  onBatchDownloadAll?: (formatType: CSVFormatType) => void;
  getTemplateDetails?: (schemaType: string) => Promise<any>;
  backendTemplates?: any[];
  isLoadingTemplates?: boolean;
  disabled?: boolean;
}

export function SchemaBatchUploader({
  onFilesUploaded,
  isUploading,
  uploadProgress,
  onDownloadTemplate,
  onBatchDownloadAll,
  getTemplateDetails,
  backendTemplates = [],
  isLoadingTemplates = false,
  disabled = false
}: SchemaBatchUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'templates' | 'guide'>('upload');
  const [selectedSchemaType, setSelectedSchemaType] = useState<string>('Article');
  const [selectedFormat, setSelectedFormat] = useState<CSVFormatType>('dynamic_fields');
  const [templatePreview, setTemplatePreview] = useState<any>(null);

  // 支持的Schema类型
  const supportedSchemaTypes = [
    'Article', 'Product', 'Organization', 'Person', 'Event', 
    'VideoObject', 'WebSite', 'Breadcrumb', 'FAQPage', 'HowTo'
  ];

  // Schema类型的基本信息
  const schemaInfo: Record<string, { name: string; icon: string; desc: string }> = {
    'Article': { name: '文章', icon: '📰', desc: '新闻文章、博客文章或其他文本内容' },
    'Product': { name: '产品', icon: '🛍️', desc: '商品或服务信息' },
    'Organization': { name: '组织', icon: '🏢', desc: '公司、组织或机构信息' },
    'Person': { name: '人物', icon: '👤', desc: '个人或人物信息' },
    'Event': { name: '事件', icon: '📅', desc: '会议、演出、活动等事件信息' },
    'VideoObject': { name: '视频', icon: '🎥', desc: '视频内容信息' },
    'WebSite': { name: '网站', icon: '🌐', desc: '网站基本信息' },
    'Breadcrumb': { name: '面包屑导航', icon: '🧭', desc: '页面导航路径' },
    'FAQPage': { name: '常见问题页面', icon: '❓', desc: '常见问题页面' },
    'HowTo': { name: '操作指南', icon: '📋', desc: '分步骤的操作教程' }
  };

  // 文件选择处理
  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setValidationErrors([]);
  }, []);

  // 开始上传（修正后的方法）
  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) {
      setValidationErrors(['请先选择文件']);
      return;
    }

    try {
      // 直接传递文件数组，让父组件处理上传逻辑
      await onFilesUploaded(selectedFiles);
    } catch (error) {
      console.error('上传失败:', error);
    }
  };

  // 下载单个模板
  const handleDownloadSingle = () => {
    onDownloadTemplate(selectedSchemaType, selectedFormat);
  };

  // 批量下载所有模板
  const handleBatchDownload = () => {
    if (onBatchDownloadAll) {
      onBatchDownloadAll(selectedFormat);
    }
  };

  // 加载模板预览
  const loadTemplatePreview = async (schemaType: string) => {
    if (!getTemplateDetails) return;
    
    try {
      const details = await getTemplateDetails(schemaType);
      setTemplatePreview(details);
    } catch (error) {
      console.error('加载模板预览失败:', error);
    }
  };

  // 渲染格式选择
  const renderFormatSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <Card 
        className={`cursor-pointer transition-colors ${
          selectedFormat === 'dynamic_fields' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
        }`}
        onClick={() => setSelectedFormat('dynamic_fields')}
      >
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-medium">动态字段格式</h4>
              <p className="text-sm text-muted-foreground">推荐使用，易于编辑</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                后端模板
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-colors ${
          selectedFormat === 'data_json' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
        }`}
        onClick={() => setSelectedFormat('data_json')}
      >
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Code className="h-6 w-6 text-amber-600" />
            <div>
              <h4 className="font-medium">传统JSON格式</h4>
              <p className="text-sm text-muted-foreground">向后兼容</p>
              <Badge variant="outline" className="mt-1 text-xs">
                兼容格式
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染模板选择
  const renderTemplateSelector = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">选择模板类型</h4>
          <p className="text-sm text-muted-foreground">
            {backendTemplates.length > 0 
              ? `已加载 ${backendTemplates.length} 个后端模板`
              : `支持 ${supportedSchemaTypes.length} 种结构化数据类型`
            }
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={handleDownloadSingle}
            disabled={disabled || !selectedSchemaType}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            下载选中模板
          </Button>
          
          {onBatchDownloadAll && (
            <Button
              variant="outline"
              onClick={handleBatchDownload}
              disabled={disabled}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              批量下载全部
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select 
            value={selectedSchemaType} 
            onValueChange={(value) => {
              setSelectedSchemaType(value);
              loadTemplatePreview(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择结构化数据类型" />
            </SelectTrigger>
            <SelectContent>
              {supportedSchemaTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center space-x-2">
                    <span>{schemaInfo[type]?.icon}</span>
                    <span>{schemaInfo[type]?.name || type}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* 模板预览 */}
        <div className="p-3 border rounded bg-muted/50">
          {isLoadingTemplates ? (
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">加载模板信息...</span>
            </div>
          ) : templatePreview ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">
                  {schemaInfo[selectedSchemaType]?.icon} {schemaInfo[selectedSchemaType]?.name}
                </h5>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>
                        {schemaInfo[selectedSchemaType]?.icon} {schemaInfo[selectedSchemaType]?.name}模板详情
                      </DialogTitle>
                    </DialogHeader>
                    {renderTemplatePreviewDialog()}
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-wrap gap-1">
                {templatePreview.required_fields?.slice(0, 3).map((field: string) => (
                  <Badge key={field} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
                {templatePreview.required_fields?.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{templatePreview.required_fields.length - 3}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {templatePreview.headers?.length || 0} 个字段
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">
                {schemaInfo[selectedSchemaType]?.icon} {schemaInfo[selectedSchemaType]?.name}
              </h5>
              <p className="text-xs text-muted-foreground">
                点击类型加载详情
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 渲染模板预览对话框
  const renderTemplatePreviewDialog = () => {
    if (!templatePreview) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium mb-2">字段说明</h5>
            <ScrollArea className="h-40 border rounded p-3">
              <div className="space-y-2">
                {Object.entries(templatePreview.field_descriptions || {}).map(([field, desc]: [string, any]) => (
                  <div key={field} className="text-sm">
                    <strong>{field}:</strong> {desc}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <div>
            <h5 className="font-medium mb-2">示例数据</h5>
            <ScrollArea className="h-40 border rounded p-3">
              <div className="space-y-1">
                {Object.entries(templatePreview.sample_data || {}).map(([field, value]: [string, any]) => (
                  <div key={field} className="text-sm">
                    <strong>{field}:</strong> {value}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium">CSV内容预览</h5>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csvContent = generatePreviewCSV(templatePreview);
                navigator.clipboard.writeText(csvContent);
              }}
              className="gap-1"
            >
              <Copy className="h-3 w-3" />
              复制
            </Button>
          </div>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
            {generatePreviewCSV(templatePreview)}
          </pre>
        </div>
      </div>
    );
  };

  // 生成预览CSV内容
  const generatePreviewCSV = (template: any): string => {
    const headers = template.headers?.join(',') || '';
    const values = template.headers?.map((header: string) => template.sample_data?.[header] || '').join(',') || '';
    return `${headers}\n${values}`;
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
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4" />
                  <div>
                    <span className="text-sm font-medium">{file.name}</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {file.type || 'CSV'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {validationErrors.some(error => error.includes(file.name)) ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
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
            {supportedSchemaTypes.map((type) => (
              <Badge key={type} variant="outline" className="justify-center">
                {schemaInfo[type]?.icon} {schemaInfo[type]?.name}
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
          批量CSV文件上传器
        </CardTitle>
        <CardDescription>
          上传CSV文件进行批量处理，支持丰富的后端模板和动态字段格式
          {backendTemplates.length > 0 && ` (已加载 ${backendTemplates.length} 个后端模板)`}
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
              {backendTemplates.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {backendTemplates.length}
                </Badge>
              )}
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

          <TabsContent value="templates" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>CSV模板下载</AlertTitle>
              <AlertDescription>
                选择所需的结构化数据类型和格式，下载对应的CSV模板。
                {backendTemplates.length > 0 && " 模板数据来自后端API，包含丰富的示例和字段说明。"}
              </AlertDescription>
            </Alert>

            {renderFormatSelector()}
            {renderTemplateSelector()}
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="text-sm space-y-2">
                  <h5 className="font-medium">格式说明：</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <strong>动态字段格式：</strong>
                      <p className="text-muted-foreground">每个字段独立一列，如：url, schema_type, headline, author</p>
                    </div>
                    <div>
                      <strong>传统JSON格式：</strong>
                      <p className="text-muted-foreground">使用data_json列存储所有字段，如：url, schema_type, data_json</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide">
            {renderGuide()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}