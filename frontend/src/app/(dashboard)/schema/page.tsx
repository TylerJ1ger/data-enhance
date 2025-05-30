//frontend/src/app/(dashboard)/schema/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  Code, Copy, RefreshCw, CheckCircle, AlertCircle, ExternalLink, 
  Upload, Download, FileText, Zap, Database, Settings 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

import { FileUpload } from "@/components/file-upload";
import { useSchemaApi } from "@/hooks/use-schema-api";
import type { SchemaTypeConfig } from "@/types";

export default function SchemaPage() {
  const {
    // 原有功能
    isLoading,
    isGenerating,
    schemaTypes,
    generatedData,
    lastError,
    fetchSchemaTypes,
    generateSchema,
    copyCode,
    resetData,
    validateFieldData,
    getFieldDefaultValue,
    
    // 新增：批量处理功能
    batchState,
    batchProgress,
    urlFilter,
    overallState,
    statistics,
    uploadBatchFiles,
    generateBatchSchemas,
    exportBatchSchemas,
    resetBatchData,
    downloadCSVTemplate,
    setUrlFilter,
    getAvailableTemplates
  } = useSchemaApi();

  // 页面状态管理
  const [activeMode, setActiveMode] = useState<'single' | 'batch'>('single');
  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'html' | 'json'>('html');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  
  // 批量处理状态
  const [batchExportType, setBatchExportType] = useState<'combined' | 'separated'>('combined');
  const [batchExportResult, setBatchExportResult] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // 加载Schema类型
  useEffect(() => {
    fetchSchemaTypes();
  }, [fetchSchemaTypes]);

  // 处理类型选择
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setFormData({});
    setFormErrors([]);
    resetData();
    
    if (schemaTypes?.[type]) {
      const newFormData: Record<string, any> = {};
      Object.entries(schemaTypes[type].fields).forEach(([fieldKey, fieldConfig]) => {
        newFormData[fieldKey] = getFieldDefaultValue(fieldConfig.type);
      });
      setFormData(newFormData);
    }
  };

  // 处理表单数据变化
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  // 生成结构化数据
  const handleGenerate = async () => {
    if (!selectedType || !schemaTypes?.[selectedType]) {
      return;
    }

    const validation = validateFieldData(selectedType, formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors([]);
    await generateSchema(selectedType, formData);
  };

  // 批量文件上传
  const handleBatchFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    await uploadBatchFiles(files);
  };

  // 批量生成
  const handleBatchGenerate = async () => {
    const filterPattern = urlFilter.enabled ? urlFilter.pattern : undefined;
    await generateBatchSchemas(filterPattern);
  };

  // 批量导出 - 修复后的逻辑
  const handleBatchExport = async () => {
    const result = await exportBatchSchemas(batchExportType);
    
    if (result && batchExportType === 'separated') {
      // 对于分离导出，保存结果并显示文件选择对话框
      setBatchExportResult(result);
      setShowExportDialog(true);
    }
    // 对于合并导出，文件会自动下载，不需要额外处理
  };

  // 处理重置
  const handleReset = () => {
    if (activeMode === 'single') {
      setSelectedType('');
      setFormData({});
      setFormErrors([]);
      resetData();
    } else {
      resetBatchData();
      setBatchExportResult(null);
      setShowExportDialog(false);
    }
  };

  // 渲染表单字段（单个生成模式）
  const renderField = (fieldKey: string, fieldConfig: SchemaTypeConfig['fields'][string]) => {
    const value = formData[fieldKey] || '';
    
    const commonProps = {
      id: fieldKey,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleFieldChange(fieldKey, e.target.value),
      placeholder: fieldConfig.placeholder || `请输入${fieldConfig.label}`,
      disabled: isGenerating,
      className: formErrors.some(error => error.includes(fieldConfig.label)) ? 'border-destructive' : '',
    };

    switch (fieldConfig.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={3}
            className={`resize-none ${commonProps.className}`}
          />
        );
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            step="0.01"
            min="0"
          />
        );
      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
          />
        );
      case 'datetime-local':
        return (
          <Input
            {...commonProps}
            type="datetime-local"
          />
        );
      case 'url':
        return (
          <Input
            {...commonProps}
            type="url"
            placeholder={fieldConfig.placeholder || "https://example.com"}
          />
        );
      case 'email':
        return (
          <Input
            {...commonProps}
            type="email"
            placeholder={fieldConfig.placeholder || "example@domain.com"}
          />
        );
      default:
        return (
          <Input
            {...commonProps}
            type="text"
          />
        );
    }
  };

  // 渲染分离导出文件列表对话框
  const renderSeparatedExportDialog = () => {
    if (!showExportDialog || !batchExportResult?.data) return null;

    const files = Object.entries(batchExportResult.data);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">分离导出结果</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportDialog(false)}
            >
              ×
            </Button>
          </div>
          
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>导出成功</AlertTitle>
            <AlertDescription>
              共生成 {files.length} 个JSON-LD文件，点击下方按钮逐个下载
            </AlertDescription>
          </Alert>

          <div className="max-h-64 overflow-y-auto space-y-2">
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

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => {
                // 批量下载所有文件
                files.forEach(([filename, fileInfo]: [string, any], index) => {
                  setTimeout(() => {
                    const blob = new Blob([fileInfo.json_ld], { type: 'application/ld+json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.click();
                    URL.revokeObjectURL(url);
                  }, index * 100); // 间隔100ms下载
                });
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              批量下载全部
            </Button>
            
            <Button onClick={() => setShowExportDialog(false)}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 获取当前选择的Schema配置
  const selectedSchema: SchemaTypeConfig | null = selectedType && schemaTypes ? schemaTypes[selectedType] : null;

  // 检查表单完整性
  const isFormValid = selectedSchema && selectedSchema.required_fields.every(field => {
    const value = formData[field];
    return value && value.toString().trim() !== '';
  }) && formErrors.length === 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">结构化数据生成器</h1>
          <p className="text-muted-foreground mt-2">
            快速生成符合Schema.org标准的结构化数据，提升网站SEO表现
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            API v1
          </Badge>
          {activeMode === 'batch' && statistics && (
            <Badge variant="secondary" className="text-xs">
              {statistics.uniqueUrls} URLs
            </Badge>
          )}
        </div>
      </div>
      <Separator />

      {/* 模式切换 */}
      <Card>
        <CardHeader>
          <CardTitle>生成模式</CardTitle>
          <CardDescription>
            选择单个生成或批量生成模式
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'single' | 'batch')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="gap-2">
                <Code className="h-4 w-4" />
                单个生成
              </TabsTrigger>
              <TabsTrigger value="batch" className="gap-2">
                <Database className="h-4 w-4" />
                批量生成
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 全局错误显示 */}
      {(lastError || batchState.lastError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{lastError || batchState.lastError}</AlertDescription>
        </Alert>
      )}

      {/* 批量处理进度显示 */}
      {activeMode === 'batch' && overallState.isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{batchProgress.stepName}</h4>
                <span className="text-sm text-muted-foreground">
                  {batchProgress.overallProgress}%
                </span>
              </div>
              <Progress value={batchProgress.overallProgress} className="h-2" />
              {batchProgress.totalItems > 0 && (
                <p className="text-sm text-muted-foreground">
                  已处理 {batchProgress.processedItems} / {batchProgress.totalItems} 项
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 单个生成模式 */}
      {activeMode === 'single' && (
        <>
          {/* 操作按钮 */}
          {selectedType && (
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !isFormValid}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Code className="h-4 w-4" />
                      生成结构化数据
                    </>
                  )}
                </Button>

                {generatedData && (
                  <Button
                    onClick={() => copyCode(
                      activeTab === 'html' ? generatedData.html_script : generatedData.json_ld, 
                      activeTab === 'html' ? 'HTML' : 'JSON-LD'
                    )}
                    variant="outline"
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    复制代码
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={isLoading || isGenerating}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重置
              </Button>
            </div>
          )}

          {/* 单个生成界面 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧配置区域 */}
            <div className="space-y-6">
              {/* 类型选择 */}
              <Card>
                <CardHeader>
                  <CardTitle>选择数据类型</CardTitle>
                  <CardDescription>
                    选择要生成的结构化数据类型
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedType} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择数据类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemaTypes && Object.entries(schemaTypes).map(([key, typeConfig]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{typeConfig.name}</span>
                            <span className="text-xs text-muted-foreground line-clamp-2">{typeConfig.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* 数据输入表单 */}
              {selectedSchema && (
                <Card>
                  <CardHeader>
                    <CardTitle>数据输入</CardTitle>
                    <CardDescription>
                      填写 {selectedSchema.name} 的相关信息
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 表单错误显示 */}
                    {formErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>表单验证错误</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            {formErrors.map((error, index) => (
                              <li key={index} className="text-sm">{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 表单字段 */}
                    {Object.entries(selectedSchema.fields).map(([fieldKey, fieldConfig]) => (
                      <div key={fieldKey} className="space-y-2">
                        <Label htmlFor={fieldKey} className="text-sm font-medium">
                          {fieldConfig.label}
                          {fieldConfig.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {renderField(fieldKey, fieldConfig)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右侧输出区域 */}
            <div className="space-y-6">
              {generatedData ? (
                <Card>
                  <CardHeader>
                    <CardTitle>生成的代码</CardTitle>
                    <CardDescription>
                      复制以下代码到您的网页中
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'html' | 'json')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="html">HTML Script</TabsTrigger>
                        <TabsTrigger value="json">JSON-LD</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="html" className="space-y-4">
                        <div className="bg-muted rounded-lg">
                          <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                            {generatedData.html_script}
                          </pre>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="json" className="space-y-4">
                        <div className="bg-muted rounded-lg">
                          <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                            {generatedData.json_ld}
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Code className="h-12 w-12 text-muted-foreground mb-6" />
                    <h3 className="text-lg font-semibold mb-3">生成结构化数据</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      选择数据类型并填写表单后，点击"生成结构化数据"按钮创建符合Schema.org标准的代码
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* 批量生成模式 */}
      {activeMode === 'batch' && (
        <>
          {/* 批量操作按钮 */}
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {!batchState.hasUploadedData && (
                <Button
                  onClick={() => {
                    const templates = getAvailableTemplates();
                    if (templates.length > 0) {
                      downloadCSVTemplate(templates[0].schemaType);
                    }
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  下载CSV模板
                </Button>
              )}

              {batchState.hasUploadedData && !batchState.hasGeneratedData && (
                <Button
                  onClick={handleBatchGenerate}
                  disabled={batchState.isGenerating}
                  className="gap-2"
                >
                  {batchState.isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      批量生成
                    </>
                  )}
                </Button>
              )}

              {batchState.hasGeneratedData && (
                <>
                  <Select value={batchExportType} onValueChange={(value) => setBatchExportType(value as 'combined' | 'separated')}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">合并导出</SelectItem>
                      <SelectItem value="separated">分离导出</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleBatchExport}
                    disabled={batchState.isExporting}
                    className="gap-2"
                  >
                    {batchState.isExporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        导出数据
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* 移除预览数据按钮 */}
            </div>

            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={overallState.isProcessing}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重置数据
            </Button>
          </div>

          {/* 批量处理界面 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧配置区域 */}
            <div className="space-y-6">
              {/* 文件上传 */}
              {!batchState.hasUploadedData && (
                <Card>
                  <CardHeader>
                    <CardTitle>上传CSV文件</CardTitle>
                    <CardDescription>
                      上传包含URL、结构化数据类型和字段数据的CSV文件
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      onFilesSelected={handleBatchFilesSelected}
                      disabled={batchState.isUploading}
                      accept={{
                        'text/csv': ['.csv'],
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                      }}
                      multiple={true}
                    />
                  </CardContent>
                </Card>
              )}

              {/* 批量统计信息 */}
              {statistics && (
                <Card>
                  <CardHeader>
                    <CardTitle>数据统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">总行数</p>
                        <p className="font-medium">{statistics.totalRows}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">唯一URL</p>
                        <p className="font-medium">{statistics.uniqueUrls}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">已处理URL</p>
                        <p className="font-medium">{statistics.processedUrls}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">完成率</p>
                        <p className="font-medium">{statistics.completionRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* URL过滤器 */}
              {batchState.hasUploadedData && (
                <Card>
                  <CardHeader>
                    <CardTitle>URL过滤器</CardTitle>
                    <CardDescription>
                      可选择性过滤特定URL模式进行生成
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={urlFilter.enabled}
                        onCheckedChange={(checked) => 
                          setUrlFilter(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                      <Label>启用URL过滤</Label>
                    </div>
                    
                    {urlFilter.enabled && (
                      <Input
                        placeholder="输入URL模式，如：blog、product等"
                        value={urlFilter.pattern}
                        onChange={(e) => 
                          setUrlFilter(prev => ({ ...prev, pattern: e.target.value }))
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右侧状态区域 */}
            <div className="space-y-6">
              {/* 处理状态 */}
              <Card>
                <CardHeader>
                  <CardTitle>处理状态</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">文件上传</span>
                      <Badge variant={batchState.hasUploadedData ? "default" : "secondary"}>
                        {batchState.hasUploadedData ? "已完成" : "待处理"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">数据生成</span>
                      <Badge variant={batchState.hasGeneratedData ? "default" : "secondary"}>
                        {batchState.hasGeneratedData ? "已完成" : "待处理"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">整体进度</span>
                      <span className="text-sm font-medium">{overallState.progressPercentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 错误信息 */}
              {batchState.processingErrors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">处理错误</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchState.processingErrors.slice(0, 5).map((error, index) => (
                        <p key={index} className="text-sm text-destructive">{error}</p>
                      ))}
                      {batchState.processingErrors.length > 5 && (
                        <p className="text-sm text-muted-foreground">
                          还有 {batchState.processingErrors.length - 5} 个错误...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 生成预览 */}
              {batchState.generateStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>生成预览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(batchState.generateStats.preview).slice(0, 3).map(([url, data]) => (
                        <div key={url} className="border rounded p-2">
                          <p className="text-sm font-medium truncate">{url}</p>
                          <p className="text-xs text-muted-foreground">
                            {data.schema_count} 个结构化数据: {data.types.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* 验证工具链接 */}
      {(generatedData || batchState.hasGeneratedData) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-2">验证结构化数据</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  使用Google官方工具验证您的结构化数据是否符合规范
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分离导出对话框 */}
      {renderSeparatedExportDialog()}
    </div>
  );
}