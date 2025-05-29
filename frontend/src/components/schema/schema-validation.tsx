//frontend/src/components/schema/schema-validation.tsx
"use client";

import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  EyeOff,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ValidationResult } from '@/types';
import { useState } from 'react';

interface SchemaValidationProps {
  validationResult: ValidationResult | null;
  isValidating?: boolean;
  onToggleShow?: () => void;
  onRevalidate?: () => void;
}

export function SchemaValidation({
  validationResult,
  isValidating = false,
  onToggleShow,
  onRevalidate,
}: SchemaValidationProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    errors: true,
    warnings: false,
  });

  // 切换详情显示
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 打开外部验证工具
  const openGoogleValidator = () => {
    window.open('https://search.google.com/test/rich-results', '_blank');
  };

  const openSchemaValidator = () => {
    window.open('https://validator.schema.org/', '_blank');
  };

  // 加载状态
  if (isValidating) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <CardTitle className="text-lg">验证中...</CardTitle>
            <Badge variant="outline" className="text-xs">
              正在检查
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无验证结果
  if (!validationResult) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">数据验证</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>验证结构化数据是否符合Schema.org标准</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {onToggleShow && (
              <Button onClick={onToggleShow} size="sm" variant="ghost">
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
            <h4 className="font-medium mb-2">暂无验证结果</h4>
            <p className="text-sm mb-4">填写表单后点击验证按钮检查数据完整性</p>
            {onRevalidate && (
              <Button onClick={onRevalidate} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                开始验证
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 获取验证状态图标和颜色
  const getValidationStatus = () => {
    if (validationResult.is_valid && validationResult.warnings.length === 0) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        title: "验证通过",
        description: "结构化数据格式完全正确，符合Schema.org标准",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        statusColor: "bg-green-100 text-green-800"
      };
    } else if (validationResult.is_valid && validationResult.warnings.length > 0) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        title: "验证通过（有警告）",
        description: "结构化数据基本正确，但有一些建议优化的地方",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        statusColor: "bg-yellow-100 text-yellow-800"
      };
    } else {
      return {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        title: "验证失败",
        description: "结构化数据存在错误，需要修复后重新验证",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        statusColor: "bg-red-100 text-red-800"
      };
    }
  };

  const status = getValidationStatus();
  const hasErrors = validationResult.errors.length > 0;
  const hasWarnings = validationResult.warnings.length > 0;
  const totalIssues = validationResult.errors.length + validationResult.warnings.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">数据验证</CardTitle>
            <Badge 
              className={`text-xs ${status.statusColor} border-0`}
            >
              {validationResult.is_valid ? "通过" : "失败"}
            </Badge>
            {totalIssues > 0 && (
              <Badge variant="outline" className="text-xs">
                {totalIssues} 个问题
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onRevalidate && (
              <Button onClick={onRevalidate} size="sm" variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                重新验证
              </Button>
            )}
            {onToggleShow && (
              <Button onClick={onToggleShow} size="sm" variant="ghost">
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 验证状态概览 */}
        <div className={`p-4 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
          <div className="flex items-start space-x-3">
            {status.icon}
            <div className="flex-1">
              <h4 className={`font-medium ${status.color} mb-2`}>
                {status.title}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {status.description}
              </p>
              
              {/* 统计信息 */}
              <div className="flex items-center flex-wrap gap-4">
                {hasErrors && (
                  <div className="flex items-center space-x-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">
                      {validationResult.errors.length} 个错误
                    </span>
                  </div>
                )}
                {hasWarnings && (
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">
                      {validationResult.warnings.length} 个警告
                    </span>
                  </div>
                )}
                {!hasErrors && !hasWarnings && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      无问题发现
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 详细验证结果 */}
        {(hasErrors || hasWarnings) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">详细问题列表</h4>
              <Button
                onClick={() => setShowDetails(!showDetails)}
                size="sm"
                variant="ghost"
                className="gap-2"
              >
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDetails ? '隐藏详情' : '显示详情'}
              </Button>
            </div>
            
            {showDetails && (
              <div className="space-y-3">
                {/* 错误列表 */}
                {hasErrors && (
                  <Collapsible 
                    open={expandedSections.errors} 
                    onOpenChange={() => toggleSection('errors')}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-2">
                          {expandedSections.errors ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-600">
                            错误 ({validationResult.errors.length})
                          </span>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          必须修复
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2">
                      <Card className="border-red-200 bg-red-50/50">
                        <CardContent className="p-4">
                          <ScrollArea className="max-h-64">
                            <div className="space-y-3">
                              {validationResult.errors.map((error, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-medium text-red-600">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                
                {/* 警告列表 */}
                {hasWarnings && (
                  <Collapsible 
                    open={expandedSections.warnings} 
                    onOpenChange={() => toggleSection('warnings')}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-2">
                          {expandedSections.warnings ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-yellow-600">
                            警告 ({validationResult.warnings.length})
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          建议优化
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2">
                      <Card className="border-yellow-200 bg-yellow-50/50">
                        <CardContent className="p-4">
                          <ScrollArea className="max-h-64">
                            <div className="space-y-3">
                              {validationResult.warnings.map((warning, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-medium text-yellow-600">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-yellow-700 leading-relaxed">{warning}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* 在线验证工具推荐 */}
        <div className="space-y-4">
          <h4 className="font-medium">在线验证工具</h4>
          
          {/* 验证通过且无警告的情况 */}
          {validationResult.is_valid && !hasWarnings && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">验证完成</AlertTitle>
              <AlertDescription className="text-green-700">
                您的结构化数据完全符合Schema.org标准，可以直接使用。
                建议使用Google的富媒体结果测试工具进行最终验证。
              </AlertDescription>
            </Alert>
          )}

          {/* 外部验证工具 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border-dashed hover:border-solid transition-all">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-sm mb-1">Google富媒体测试</h5>
                    <p className="text-xs text-muted-foreground mb-3">
                      检查您的结构化数据是否能被Google正确识别
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openGoogleValidator}
                      className="w-full gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      测试结构化数据
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-dashed hover:border-solid transition-all">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-sm mb-1">Schema.org验证器</h5>
                    <p className="text-xs text-muted-foreground mb-3">
                      验证结构化数据是否符合Schema.org标准
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openSchemaValidator}
                      className="w-full gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Schema验证
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 使用提示 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>验证提示</AlertTitle>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>复制生成的结构化数据到上述工具中进行在线验证</li>
                <li>Google富媒体测试可以预览搜索结果中的显示效果</li>
                <li>Schema.org验证器提供更详细的技术规范检查</li>
                <li>建议在发布到网站前使用这些工具进行最终确认</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}