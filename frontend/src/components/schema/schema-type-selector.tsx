//frontend/src/components/schema/schema-type-selector.tsx
"use client";

import { 
  FileText, 
  Navigation, 
  Calendar, 
  HelpCircle, 
  BookOpen, 
  Building, 
  User, 
  Package, 
  Video, 
  Globe,
  Loader,
  Search
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SchemaType, SchemaTypesResponse } from '@/types';

interface SchemaTypeSelectorProps {
  schemaTypes: SchemaTypesResponse | null;
  selectedType: SchemaType | null;
  onTypeSelect: (type: SchemaType) => void;
  isLoading?: boolean;
}

// 结构化数据类型图标映射
const SCHEMA_TYPE_ICONS: Record<SchemaType, React.ReactElement> = {
  Article: <FileText className="h-6 w-6" />,
  Breadcrumb: <Navigation className="h-6 w-6" />,
  Event: <Calendar className="h-6 w-6" />,
  FAQPage: <HelpCircle className="h-6 w-6" />,
  HowTo: <BookOpen className="h-6 w-6" />,
  Organization: <Building className="h-6 w-6" />,
  Person: <User className="h-6 w-6" />,
  Product: <Package className="h-6 w-6" />,
  VideoObject: <Video className="h-6 w-6" />,
  WebSite: <Globe className="h-6 w-6" />,
};

// 结构化数据类型颜色映射
const SCHEMA_TYPE_COLORS: Record<SchemaType, string> = {
  Article: "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:hover:bg-blue-900",
  Breadcrumb: "bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:hover:bg-green-900",
  Event: "bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-800 dark:hover:bg-purple-900",
  FAQPage: "bg-orange-50 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:border-orange-800 dark:hover:bg-orange-900",
  HowTo: "bg-teal-50 border-teal-200 hover:bg-teal-100 dark:bg-teal-950 dark:border-teal-800 dark:hover:bg-teal-900",
  Organization: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-800 dark:hover:bg-indigo-900",
  Person: "bg-pink-50 border-pink-200 hover:bg-pink-100 dark:bg-pink-950 dark:border-pink-800 dark:hover:bg-pink-900",
  Product: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:border-yellow-800 dark:hover:bg-yellow-900",
  VideoObject: "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:border-red-800 dark:hover:bg-red-900",
  WebSite: "bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900",
};

// 结构化数据类型分类
const SCHEMA_TYPE_CATEGORIES = {
  content: {
    name: '内容类型',
    types: ['Article', 'FAQPage', 'HowTo'] as SchemaType[],
    description: '适用于文章、问答、教程等内容页面'
  },
  business: {
    name: '商业类型', 
    types: ['Product', 'Organization', 'Event'] as SchemaType[],
    description: '适用于产品、公司、活动等商业信息'
  },
  technical: {
    name: '技术类型',
    types: ['WebSite', 'Breadcrumb', 'VideoObject'] as SchemaType[],
    description: '适用于网站结构、导航、媒体等技术标记'
  },
  personal: {
    name: '个人类型',
    types: ['Person'] as SchemaType[],
    description: '适用于个人信息、简历等'
  }
};

export function SchemaTypeSelector({
  schemaTypes,
  selectedType,
  onTypeSelect,
  isLoading = false,
}: SchemaTypeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'category'>('category');

  // 加载状态
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (!schemaTypes) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">加载结构化数据类型中...</p>
        </CardContent>
      </Card>
    );
  }

  const typeEntries = Object.entries(schemaTypes.schema_types);

  // 过滤类型
  const filteredTypes = typeEntries.filter(([type, config]) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      type.toLowerCase().includes(searchLower) ||
      config.name.toLowerCase().includes(searchLower) ||
      config.description.toLowerCase().includes(searchLower)
    );
  });

  // 渲染单个类型卡片
  const renderTypeCard = (type: string, config: any) => {
    const schemaType = type as SchemaType;
    const isSelected = selectedType === schemaType;
    
    return (
      <TooltipProvider key={type}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${
                isSelected 
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                  : `${SCHEMA_TYPE_COLORS[schemaType]} border-dashed hover:border-solid`
              }`}
              onClick={() => onTypeSelect(schemaType)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background text-muted-foreground border"
                  }`}>
                    {SCHEMA_TYPE_ICONS[schemaType]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {config.name}
                      </h3>
                      {isSelected && (
                        <Badge variant="default" className="text-xs ml-2">
                          已选择
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {config.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="destructive" className="text-xs">
                        {config.required_fields.length} 必填
                      </Badge>
                      {config.optional_fields.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {config.optional_fields.length} 可选
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{config.name}</p>
              <p className="text-xs">{config.description}</p>
              <div className="text-xs">
                <span className="text-muted-foreground">必填字段: </span>
                {config.required_fields.join(', ')}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>选择结构化数据类型</CardTitle>
            <CardDescription>
              选择一个结构化数据类型开始创建。支持 {typeEntries.length} 种常用的结构化数据格式。
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'category' ? 'default' : 'outline'}
              onClick={() => setViewMode('category')}
            >
              分类视图
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              网格视图
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索结构化数据类型..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 类型选择器 */}
        {viewMode === 'category' ? (
          <div className="space-y-6">
            {Object.entries(SCHEMA_TYPE_CATEGORIES).map(([categoryKey, category]) => {
              const categoryTypes = filteredTypes.filter(([type]) => 
                category.types.includes(type as SchemaType)
              );
              
              if (categoryTypes.length === 0) return null;
              
              return (
                <div key={categoryKey} className="space-y-3">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTypes.map(([type, config]) => renderTypeCard(type, config))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTypes.map(([type, config]) => renderTypeCard(type, config))}
          </div>
        )}
        
        {/* 无搜索结果 */}
        {filteredTypes.length === 0 && searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p>未找到匹配的结构化数据类型</p>
            <p className="text-sm">尝试使用其他关键词搜索</p>
          </div>
        )}

        {/* 选中类型的详细信息 */}
        {selectedType && schemaTypes.schema_types[selectedType] && (
          <div className="mt-6 p-6 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                {SCHEMA_TYPE_ICONS[selectedType]}
              </div>
              <div>
                <h4 className="font-semibold text-lg">
                  {schemaTypes.schema_types[selectedType].name}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {selectedType}
                </Badge>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-4">
              {schemaTypes.schema_types[selectedType].description}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-destructive mb-2 block">
                  必填字段 ({schemaTypes.schema_types[selectedType].required_fields.length})
                </Label>
                <div className="flex flex-wrap gap-1">
                  {schemaTypes.schema_types[selectedType].required_fields.map((field) => (
                    <Badge key={field} variant="destructive" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {schemaTypes.schema_types[selectedType].optional_fields.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    可选字段 ({schemaTypes.schema_types[selectedType].optional_fields.length})
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {schemaTypes.schema_types[selectedType].optional_fields.map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 提示：必填字段必须填写才能成功生成结构化数据，可选字段可以根据需要选择性填写。
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}