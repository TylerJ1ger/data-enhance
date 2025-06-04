import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Sparkles, 
  Code,
  Archive,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'react-toastify';

// 定义支持的Schema类型
type SupportedSchemaType = 'Article' | 'Product' | 'Organization' | 'Person' | 'Event' | 
  'VideoObject' | 'WebSite' | 'Breadcrumb' | 'FAQPage' | 'HowTo';

interface SimpleTemplateSelectorProps {
  onDownloadTemplate: (schemaType: string, formatType: 'dynamic_fields' | 'data_json') => void;
  onBatchDownloadAll?: (formatType: 'dynamic_fields' | 'data_json') => void;
  getTemplateDetails?: (schemaType: string) => Promise<any>;
  backendTemplates?: any[];
  isLoadingTemplates?: boolean;
  disabled?: boolean;
}

export default function SimpleTemplateSelector({
  onDownloadTemplate,
  onBatchDownloadAll,
  getTemplateDetails,
  backendTemplates = [],
  isLoadingTemplates = false,
  disabled = false
}: SimpleTemplateSelectorProps) {
  const [selectedSchemaType, setSelectedSchemaType] = useState<SupportedSchemaType>('Article');
  const [selectedFormat, setSelectedFormat] = useState<'dynamic_fields' | 'data_json'>('dynamic_fields');
  const [templatePreview, setTemplatePreview] = useState<any>(null);

  // 支持的Schema类型
  const supportedSchemaTypes: SupportedSchemaType[] = [
    'Article', 'Product', 'Organization', 'Person', 'Event', 
    'VideoObject', 'WebSite', 'Breadcrumb', 'FAQPage', 'HowTo'
  ];

  // Schema类型的基本信息
  const schemaInfo: Record<SupportedSchemaType, { name: string; icon: string }> = {
    'Article': { name: '文章', icon: '📰' },
    'Product': { name: '产品', icon: '🛍️' },
    'Organization': { name: '组织', icon: '🏢' },
    'Person': { name: '人物', icon: '👤' },
    'Event': { name: '事件', icon: '📅' },
    'VideoObject': { name: '视频', icon: '🎥' },
    'WebSite': { name: '网站', icon: '🌐' },
    'Breadcrumb': { name: '面包屑导航', icon: '🧭' },
    'FAQPage': { name: '常见问题页面', icon: '❓' },
    'HowTo': { name: '操作指南', icon: '📋' }
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

  // 当选择的类型改变时加载预览
  useEffect(() => {
    if (selectedSchemaType) {
      loadTemplatePreview(selectedSchemaType);
    }
  }, [selectedSchemaType, getTemplateDetails]);

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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染模板列表
  const renderTemplateList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">选择模板类型</h4>
          <p className="text-sm text-muted-foreground">
            {backendTemplates.length > 0 
              ? `加载了 ${backendTemplates.length} 个后端模板`
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
            onValueChange={(value) => setSelectedSchemaType(value as SupportedSchemaType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择结构化数据类型" />
            </SelectTrigger>
            <SelectContent>
              {supportedSchemaTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center space-x-2">
                    <span>{schemaInfo[type].icon}</span>
                    <span>{schemaInfo[type].name}</span>
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
              <h5 className="text-sm font-medium">
                {schemaInfo[selectedSchemaType].icon} {schemaInfo[selectedSchemaType].name}
              </h5>
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
                {schemaInfo[selectedSchemaType].icon} {schemaInfo[selectedSchemaType].name}
              </h5>
              <p className="text-xs text-muted-foreground">
                选择类型查看详情
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>CSV模板下载</AlertTitle>
        <AlertDescription>
          选择所需的结构化数据类型和格式，下载对应的CSV模板。
          {backendTemplates.length > 0 && " 模板数据来自后端API，包含丰富的示例和字段说明。"}
        </AlertDescription>
      </Alert>

      {renderFormatSelector()}
      {renderTemplateList()}
      
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
    </div>
  );
}