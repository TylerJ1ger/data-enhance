//frontend/src/components/schema/schema-form.tsx
"use client";

import { useState } from 'react';
import { Plus, Minus, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from 'lucide-react';

import { SchemaType, SCHEMA_FIELD_CONFIGS, type SchemaFieldConfig } from '@/types';
import { useSchemaApi } from "@/hooks/use-schema-api";

interface SchemaFormProps {
  schemaType: SchemaType;
  formData: Record<string, any>;
  errors: Record<string, string>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SchemaForm({
  schemaType,
  formData,
  errors,
  isLoading = false,
  disabled = false,
}: SchemaFormProps) {
  const {
    updateFormData,
    updateNestedFormData,
    addArrayItem,
    removeArrayItem,
  } = useSchemaApi();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // 获取当前类型的字段配置
  const fieldConfigs = SCHEMA_FIELD_CONFIGS[schemaType] || [];

  // 切换折叠状态
  const toggleCollapse = (key: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 处理字段值变更
  const handleFieldChange = (config: SchemaFieldConfig, newValue: any, path: string[] = []) => {
    if (path.length > 0) {
      updateNestedFormData([...path, config.key], newValue);
    } else {
      updateFormData(config.key, newValue);
    }
  };

  // 处理数组项添加
  const handleAddArrayItem = (config: SchemaFieldConfig) => {
    const defaultItem = config.items?.reduce((acc: any, item: SchemaFieldConfig) => {
      if (item.type === 'array') {
        acc[item.key] = [];
      } else if (item.type === 'object') {
        acc[item.key] = {};
      } else {
        acc[item.key] = '';
      }
      return acc;
    }, {}) || {};
    
    addArrayItem(config.key, defaultItem);
  };

  // 处理数组项删除
  const handleRemoveArrayItem = (config: SchemaFieldConfig, index: number) => {
    removeArrayItem(config.key, index);
  };

  // 渲染单个字段
  const renderField = (config: SchemaFieldConfig, value: any, path: string[] = [], parentKey?: string): React.ReactNode => {
    const fieldKey = path.length > 0 ? path.join('.') : config.key;
    const fieldError = errors[fieldKey];
    const isRequired = config.required;
    const isDisabled = disabled || isLoading;

    switch (config.type) {
      case 'text':
      case 'url':
      case 'email':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor={fieldKey} className="text-sm font-medium">
                {config.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {config.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{config.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id={fieldKey}
              type={config.type}
              value={value || ''}
              onChange={(e) => handleFieldChange(config, e.target.value, path)}
              placeholder={config.placeholder}
              disabled={isDisabled}
              className={fieldError ? "border-destructive" : ""}
            />
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor={fieldKey} className="text-sm font-medium">
                {config.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {config.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{config.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Textarea
              id={fieldKey}
              value={value || ''}
              onChange={(e) => handleFieldChange(config, e.target.value, path)}
              placeholder={config.placeholder}
              disabled={isDisabled}
              rows={3}
              className={fieldError ? "border-destructive" : ""}
            />
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor={fieldKey} className="text-sm font-medium">
                {config.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {config.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{config.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id={fieldKey}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(config, e.target.value, path)}
              placeholder={config.placeholder}
              disabled={isDisabled}
              className={fieldError ? "border-destructive" : ""}
              min={config.validation?.min}
              max={config.validation?.max}
            />
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>
        );

      case 'date':
      case 'datetime-local':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor={fieldKey} className="text-sm font-medium">
                {config.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {config.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{config.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id={fieldKey}
              type={config.type}
              value={value || ''}
              onChange={(e) => handleFieldChange(config, e.target.value, path)}
              disabled={isDisabled}
              className={fieldError ? "border-destructive" : ""}
            />
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>
        );

      case 'array':
        const arrayValue = Array.isArray(value) ? value : [];
        const isCollapsed = collapsedSections[fieldKey];
        
        return (
          <div key={fieldKey} className="space-y-4">
            <Collapsible open={!isCollapsed} onOpenChange={() => toggleCollapse(fieldKey)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <Label className="text-sm font-medium cursor-pointer">
                        {config.label}
                        {isRequired && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {config.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{config.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {arrayValue.length} 项
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddArrayItem(config);
                    }}
                    disabled={isDisabled}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    添加
                  </Button>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-3 mt-3">
                {arrayValue.map((item: any, index: number) => (
                  <Card key={index} className="border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          项目 {index + 1}
                        </CardTitle>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveArrayItem(config, index)}
                          disabled={isDisabled}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Minus className="h-3 w-3" />
                          删除
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {config.items?.map((itemConfig: SchemaFieldConfig) => (
                        renderField(
                          itemConfig,
                          item[itemConfig.key],
                          [config.key, index.toString()],
                          config.key
                        )
                      ))}
                    </CardContent>
                  </Card>
                ))}
                
                {arrayValue.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">暂无项目，点击"添加"按钮创建第一个项目</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
            
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>
        );

      case 'object':
        const objectValue = value || {};
        const isObjectCollapsed = collapsedSections[fieldKey];
        
        return (
          <div key={fieldKey} className="space-y-4">
            <Collapsible open={!isObjectCollapsed} onOpenChange={() => toggleCollapse(fieldKey)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer p-3 border rounded-lg hover:bg-muted/50">
                  {isObjectCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <Label className="text-sm font-medium cursor-pointer">
                    {config.label}
                    {isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {config.description && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{config.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-3 pl-4 border-l-2 border-muted">
                {config.items?.map((itemConfig: SchemaFieldConfig) => (
                  renderField(
                    itemConfig,
                    objectValue[itemConfig.key],
                    [config.key],
                    config.key
                  )
                ))}
              </CollapsibleContent>
            </Collapsible>
            
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 渲染表单字段
  return (
    <div className="space-y-6">
      {fieldConfigs.map((config, index) => (
        <div key={config.key}>
          {renderField(config, formData[config.key])}
          {index < fieldConfigs.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
      
      {fieldConfigs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>该结构化数据类型暂无可配置字段</p>
        </div>
      )}
    </div>
  );
}