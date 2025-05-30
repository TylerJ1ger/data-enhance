//frontend/src/app/(dashboard)/schema/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Code, Copy, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
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

import { useSchemaApi } from "@/hooks/use-schema-api";
import type { SchemaTypeConfig } from "@/types";

export default function SchemaPage() {
  const {
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
  } = useSchemaApi();

  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'html' | 'json'>('html');
  const [formErrors, setFormErrors] = useState<string[]>([]);

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
    
    // 为新选择的类型初始化默认值
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
    
    // 清除相关字段的错误
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  // 生成结构化数据
  const handleGenerate = async () => {
    if (!selectedType || !schemaTypes?.[selectedType]) {
      return;
    }

    // 验证表单数据
    const validation = validateFieldData(selectedType, formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors([]);
    await generateSchema(selectedType, formData);
  };

  // 处理重置
  const handleReset = () => {
    setSelectedType('');
    setFormData({});
    setFormErrors([]);
    resetData();
  };

  // 渲染表单字段
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

  // 获取当前选择的Schema配置
  const selectedSchema: SchemaTypeConfig | null = selectedType && schemaTypes ? schemaTypes[selectedType] : null;

  // 检查表单完整性
  const isFormValid = selectedSchema && selectedSchema.required_fields.every(field => {
    const value = formData[field];
    return value && value.toString().trim() !== '';
  }) && formErrors.length === 0;

  // 获取数据统计
  const getDataStats = () => {
    if (!generatedData) return null;
    
    const content = activeTab === 'html' ? generatedData.html_script : generatedData.json_ld;
    const lines = content.split('\n').length;
    const characters = content.length;
    const bytes = new Blob([content]).size;
    
    return {
      lines,
      characters,
      size: bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
    };
  };

  const stats = getDataStats();

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
          {selectedType && selectedSchema && (
            <Badge variant="secondary" className="text-xs">
              {selectedSchema.name}
            </Badge>
          )}
        </div>
      </div>
      <Separator />

      {/* 全局错误显示 */}
      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}

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

      {/* 全局加载状态 */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧 - 配置区域 */}
          <div className="space-y-6">
            {/* 类型选择 */}
            <Card>
              <CardHeader>
                <CardTitle>选择数据类型</CardTitle>
                <CardDescription>
                  选择要生成的结构化数据类型
                  {schemaTypes && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      支持 {Object.keys(schemaTypes).length} 种数据类型
                    </span>
                  )}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>数据输入</CardTitle>
                      <CardDescription>
                        填写 {selectedSchema.name} 的相关信息
                        <span className="block text-xs text-muted-foreground mt-1">
                          红色星号(*)表示必填字段
                        </span>
                      </CardDescription>
                    </div>
                    {selectedSchema.required_fields.length > 0 && (
                      <Badge variant={isFormValid ? "default" : "secondary"} className="text-xs">
                        {isFormValid ? "数据完整" : "待完善"}
                      </Badge>
                    )}
                  </div>
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
                      {fieldConfig.placeholder && (
                        <p className="text-xs text-muted-foreground">
                          {fieldConfig.placeholder}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* 表单完整性提示 */}
                  {selectedSchema.required_fields.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center space-x-2 text-sm">
                        {isFormValid ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">所有必填字段已完成</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600">
                              还需要填写 {selectedSchema.required_fields.filter(field => !formData[field]?.toString().trim()).length} 个必填字段
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 使用提示 */}
            {selectedType && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>使用提示</AlertTitle>
                <AlertDescription className="text-sm">
                  <div className="space-y-1 mt-2">
                    <p>1. 填写完必填字段后点击"生成结构化数据"</p>
                    <p>2. 复制生成的代码到您的网页 &lt;head&gt; 部分</p>
                    <p>3. 使用Google的测试工具验证结构化数据</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 右侧 - 输出区域 */}
          <div className="space-y-6">
            {generatedData ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>生成的代码</CardTitle>
                      <CardDescription>
                        复制以下代码到您的网页中
                        {stats && (
                          <span className="block text-xs text-muted-foreground mt-1">
                            {stats.size} · {stats.lines} 行 · {stats.characters} 字符
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="text-xs">
                      {generatedData.schema_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'html' | 'json')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="html">HTML Script</TabsTrigger>
                      <TabsTrigger value="json">JSON-LD</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">HTML Script 标签</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode(generatedData.html_script, 'HTML')}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          复制
                        </Button>
                      </div>
                      <div className="bg-muted rounded-lg">
                        <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                          {generatedData.html_script}
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="json" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">JSON-LD 代码</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode(generatedData.json_ld, 'JSON-LD')}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          复制
                        </Button>
                      </div>
                      <div className="bg-muted rounded-lg">
                        <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                          {generatedData.json_ld}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* 使用说明 */}
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>使用说明</AlertTitle>
                    <AlertDescription>
                      {activeTab === 'html' ? (
                        <p className="text-sm">
                          直接将此HTML代码复制并粘贴到您网页的 &lt;head&gt; 部分即可。
                        </p>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p>将JSON-LD代码包装在script标签中：</p>
                          <code className="text-xs bg-muted px-1 rounded">
                            &lt;script type="application/ld+json"&gt;...&lt;/script&gt;
                          </code>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
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
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline">符合Google标准</Badge>
                    <Badge variant="outline">Schema.org规范</Badge>
                    <Badge variant="outline">即时生成</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 验证工具链接 */}
            {generatedData && (
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
          </div>
        </div>
      )}

      {/* 空状态 - 未选择类型 */}
      {!isLoading && !selectedType && schemaTypes && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Code className="h-12 w-12 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">开始生成结构化数据</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              选择一个结构化数据类型来开始创建符合Google和Schema.org标准的结构化数据。
              这将帮助搜索引擎更好地理解您的网页内容。
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline">支持{Object.keys(schemaTypes).length}种类型</Badge>
              <Badge variant="outline">符合Google标准</Badge>
              <Badge variant="outline">Schema.org规范</Badge>
              <Badge variant="outline">简单易用</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误状态 - API加载失败 */}
      {!isLoading && !schemaTypes && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-6" />
            <h3 className="text-xl font-semibold mb-3">加载失败</h3>
            <p className="text-muted-foreground mb-6">
              无法加载结构化数据类型，请检查网络连接或稍后重试。
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              重新加载页面
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}