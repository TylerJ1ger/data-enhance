//frontend-new/src/components/seo/seo-filter.tsx
"use client";

import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SEOCategory } from '@/types/seo';
import { cn } from '@/lib/utils';

interface SEOFilterProps {
  categories: SEOCategory[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SeoFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  isLoading = false,
  disabled = false,
}: SEOFilterProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleCategoryChange = (value: string) => {
    onCategoryChange(value === "all" ? null : value);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Filter className="mr-2 h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">SEO问题筛选</CardTitle>
          </div>
          <div>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              按类别筛选
            </label>
            <Select
              value={selectedCategory || "all"}
              onValueChange={handleCategoryChange}
              disabled={disabled || isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="所有类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类别</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-xs text-muted-foreground">
              {selectedCategory ? 
                `当前筛选: ${selectedCategory}` : 
                "选择一个类别来筛选SEO问题"
              }
            </div>
          </div>
          
          <Alert className="bg-primary/10 border-primary/20">
            <AlertTitle className="text-primary font-medium">优先级说明</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li className="text-sm">
                  <Badge variant="destructive" className="font-normal mr-1">高优先级</Badge>
                  严重影响网站SEO表现，建议立即修复
                </li>
                <li className="text-sm">
                  <Badge variant="default" className="font-normal bg-amber-500 hover:bg-amber-500/90 mr-1">中优先级</Badge>
                  对SEO有一定影响，建议尽快处理
                </li>
                <li className="text-sm">
                  <Badge variant="secondary" className="font-normal mr-1">低优先级</Badge>
                  会影响SEO效果，在有时间时处理
                </li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted/50 rounded-md p-4 text-sm">
            <h4 className="font-medium mb-2">问题类型说明</h4>
            <ul className="space-y-3">
              <li className="flex items-center">
                <span className={cn(
                  "inline-block w-3 h-3 rounded-full bg-red-500 mr-2",
                  disabled && "opacity-50"
                )}></span>
                <span><strong>问题</strong>: 确定存在的SEO错误，需要修复</span>
              </li>
              <li className="flex items-center">
                <span className={cn(
                  "inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2",
                  disabled && "opacity-50"
                )}></span>
                <span><strong>警告</strong>: 需要检查但不一定是问题的项目</span>
              </li>
              <li className="flex items-center">
                <span className={cn(
                  "inline-block w-3 h-3 rounded-full bg-blue-500 mr-2",
                  disabled && "opacity-50"
                )}></span>
                <span><strong>机会</strong>: 可以优化改进的部分</span>
              </li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}