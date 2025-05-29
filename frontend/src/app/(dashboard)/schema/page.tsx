//frontend/src/app/(dashboard)/schema/page.tsx
"use client";

import { useState } from 'react';
import { Code, Download, RefreshCw, Save, Upload, AlertCircle, Eye, CheckCircle, Search, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { SchemaTypeSelector } from "@/components/schema/schema-type-selector";
import { SchemaForm } from "@/components/schema/schema-form";
import { SchemaPreview } from "@/components/schema/schema-preview";
import { SchemaOutput } from "@/components/schema/schema-output";
import { SchemaValidation } from "@/components/schema/schema-validation";
import { SchemaSaveLoad } from "@/components/schema/schema-save-load";

import { useSchemaApi } from "@/hooks/use-schema-api";
import { SchemaType } from '@/types';

export default function SchemaPage() {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const {
    // 状态
    isLoadingTypes,
    isLoadingTemplate,
    isGenerating,
    isPreviewing,
    isValidating,
    
    // 数据
    schemaTypes,
    currentTemplate,
    generatedSchema,
    previewSchema,
    validationResult,
    formState,
    editorState,
    formValidationState,
    
    // 操作
    fetchSchemaTemplate,
    generateSchemaData,
    previewSchemaData,
    validateSchemaData,
    resetForm,
    setActiveTab,
    setOutputFormat,
    toggleValidation,
    copyToClipboard,
    downloadAsFile,
    saveConfig,
  } = useSchemaApi();

  // 处理类型选择
  const handleTypeSelect = async (schemaType: string) => {
    try {
      await fetchSchemaTemplate(schemaType as SchemaType);
      setActiveTab('form');
    } catch (error) {
      console.error('Error selecting schema type:', error);
    }
  };

  // 处理生成
  const handleGenerate = async () => {
    if (!formState.selectedType) return;

    try {
      await generateSchemaData({
        schema_type: formState.selectedType,
        data: formState.formData,
      });
    } catch (error) {
      console.error('Error generating schema:', error);
    }
  };

  // 处理预览
  const handlePreview = async () => {
    if (!formState.selectedType) return;

    try {
      await previewSchemaData({
        schema_type: formState.selectedType,
        data: formState.formData,
      });
      setActiveTab('preview');
    } catch (error) {
      console.error('Error previewing schema:', error);
    }
  };

  // 处理验证
  const handleValidate = async () => {
    if (!formState.selectedType) return;

    try {
      await validateSchemaData({
        schema_type: formState.selectedType,
        data: formState.formData,
      });
    } catch (error) {
      console.error('Error validating schema:', error);
    }
  };

  // 处理复制
  const handleCopy = async () => {
    if (!generatedSchema) return;

    const content = editorState.outputFormat === 'json-ld' 
      ? generatedSchema.json_ld 
      : generatedSchema.html_script;
    
    await copyToClipboard(content, editorState.outputFormat === 'json-ld' ? 'json' : 'html');
  };

  // 处理下载
  const handleDownload = () => {
    if (!generatedSchema || !formState.selectedType) return;

    const content = editorState.outputFormat === 'json-ld' 
      ? generatedSchema.json_ld 
      : generatedSchema.html_script;
    
    const extension = editorState.outputFormat === 'json-ld' ? 'json' : 'html';
    const filename = `${formState.selectedType.toLowerCase()}_schema.${extension}`;
    
    downloadAsFile(content, filename, editorState.outputFormat === 'json-ld' ? 'json' : 'html');
  };

  // 处理保存配置
  const handleSave = (name: string) => {
    saveConfig(name);
    setShowSaveDialog(false);
  };

  // 处理重置
  const handleReset = () => {
    resetForm();
  };

  // 状态计算
  const hasSelectedType = formState.selectedType !== null;
  const hasGeneratedData = generatedSchema !== null;
  const hasValidationErrors = validationResult && !validationResult.is_valid;
  const isAnyLoading = isLoadingTypes || isLoadingTemplate || isGenerating || isPreviewing || isValidating;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">结构化数据生成器</h1>
          <p className="text-muted-foreground mt-2">
            生成符合Google和Schema.org标准的结构化数据，提升网站SEO表现
          </p>
        </div>
        {/* API版本指示 */}
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Schema Generator v1
          </Badge>
          {hasSelectedType && (
            <Badge variant="secondary" className="text-xs">
              {formState.selectedType}
            </Badge>
          )}
        </div>
      </div>
      <Separator />
      
      {/* 操作栏 */}
      {hasSelectedType && (
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handlePreview}
              disabled={isPreviewing || isGenerating}
              variant="outline"
              className="gap-2"
            >
              <Code className="h-4 w-4" />
              {isPreviewing ? "预览中..." : "预览"}
            </Button>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isPreviewing}
              className="gap-2"
            >
              {isGenerating ? "生成中..." : "生成结构化数据"}
            </Button>

            <Button
              onClick={handleValidate}
              disabled={isValidating || isGenerating}
              variant="outline"
              className="gap-2"
            >
              {isValidating ? "验证中..." : "验证数据"}
            </Button>

            {hasGeneratedData && (
              <>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  复制代码
                </Button>

                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  下载文件
                </Button>
              </>
            )}

            <Button
              onClick={() => setShowSaveDialog(true)}
              disabled={!hasSelectedType}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              保存配置
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isAnyLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重置所有
          </Button>
        </div>
      )}

      {/* 全局加载状态 */}
      {isLoadingTypes && (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* 类型选择器 */}
      {!isLoadingTypes && (
        <SchemaTypeSelector
          schemaTypes={schemaTypes}
          selectedType={formState.selectedType}
          onTypeSelect={handleTypeSelect}
          isLoading={isLoadingTemplate}
        />
      )}

      {/* 主要内容区域 */}
      {hasSelectedType && currentTemplate && formState.selectedType && schemaTypes && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧 - 表单和配置管理 */}
          <div className="space-y-6">
            {/* 表单区域 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>数据输入</CardTitle>
                    <CardDescription>
                      填写 {schemaTypes.schema_types[formState.selectedType]?.name} 的相关信息
                    </CardDescription>
                  </div>
                  {isLoadingTemplate && (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">加载中...</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <SchemaForm
                  schemaType={formState.selectedType}
                  formData={formState.formData}
                  errors={formState.errors}
                  isLoading={isLoadingTemplate}
                  disabled={isGenerating || isPreviewing}
                />
              </CardContent>
            </Card>

            {/* 保存/加载配置 */}
            <SchemaSaveLoad
              onSave={handleSave}
              showSaveDialog={showSaveDialog}
              onCloseSaveDialog={() => setShowSaveDialog(false)}
            />

            {/* 验证结果 */}
            {(editorState.showValidation || hasValidationErrors || formValidationState.validationResult) && (
              <SchemaValidation
                validationResult={validationResult}
                isValidating={isValidating}
                onToggleShow={toggleValidation}
                onRevalidate={handleValidate}
              />
            )}
          </div>

          {/* 右侧 - 预览和输出 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>预览和输出</CardTitle>
                  {(isGenerating || isPreviewing) && (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {isGenerating ? "生成中" : "预览中"}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={editorState.activeTab} onValueChange={(tab) => setActiveTab(tab as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="form">表单</TabsTrigger>
                    <TabsTrigger value="preview" disabled={isPreviewing}>
                      预览 {previewSchema && <Badge variant="secondary" className="ml-1 text-xs">●</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="output" disabled={!hasGeneratedData}>
                      输出 {hasGeneratedData && <Badge variant="default" className="ml-1 text-xs">●</Badge>}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="form" className="mt-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>使用提示</AlertTitle>
                      <AlertDescription>
                        <div className="space-y-2 mt-2">
                          <p>1. 在左侧填写表单数据，红色星号(*)表示必填字段</p>
                          <p>2. 点击"预览"查看生成的结构化数据</p>
                          <p>3. 点击"生成"创建最终的结构化数据代码</p>
                          <p>4. 使用"验证"确保数据符合标准</p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="mt-4">
                    <SchemaPreview
                      previewData={previewSchema}
                      isLoading={isPreviewing}
                      onRefresh={handlePreview}
                    />
                  </TabsContent>
                  
                  <TabsContent value="output" className="mt-4">
                    <SchemaOutput
                      generatedData={generatedSchema}
                      outputFormat={editorState.outputFormat}
                      onFormatChange={setOutputFormat}
                      onCopy={handleCopy}
                      onDownload={handleDownload}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* 快速操作面板 */}
            {hasSelectedType && (
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <h4 className="font-medium mb-3">快速操作</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab('preview')}
                      disabled={isPreviewing}
                      className="justify-start gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      查看预览
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleValidate}
                      disabled={isValidating}
                      className="justify-start gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      验证数据
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleValidation()}
                      className="justify-start gap-2"
                    >
                      <Search className="h-4 w-4" />
                      切换验证显示
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open('https://search.google.com/test/rich-results', '_blank')}
                      className="justify-start gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Google测试工具
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 空状态 - 未选择类型 */}
      {!isLoadingTypes && !hasSelectedType && schemaTypes && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Code className="h-12 w-12 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">开始生成结构化数据</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              选择一个结构化数据类型来开始创建符合Google和Schema.org标准的结构化数据。
              这将帮助搜索引擎更好地理解您的网页内容。
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline">支持10种类型</Badge>
              <Badge variant="outline">符合Google标准</Badge>
              <Badge variant="outline">Schema.org规范</Badge>
              <Badge variant="outline">一键生成代码</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误状态 - API加载失败 */}
      {!isLoadingTypes && !schemaTypes && (
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