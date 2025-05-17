//frontend-new/src/components/sitemap/sitemap-filter.tsx
"use client";

import { useState } from 'react';
import { Plus, X, Filter, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { SitemapFilterRequest } from '@/types/sitemap';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SitemapFilterProps {
  onApplyFilter: (filters: SitemapFilterRequest) => void;
  domains: string[];
  commonPaths?: string[];
  isLoading?: boolean;
  isLoadingCommonPaths?: boolean;
  disabled?: boolean;
}

export function SitemapFilter({
  onApplyFilter,
  domains,
  commonPaths = [],
  isLoading = false,
  isLoadingCommonPaths = false,
  disabled = false,
}: SitemapFilterProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [domain, setDomain] = useState<string>('all');
  const [paths, setPaths] = useState<string[]>(['']);
  const [pathFilterType, setPathFilterType] = useState<string>('contains');
  const [depth, setDepth] = useState<string>('');

  const handleAddPath = () => {
    setPaths([...paths, '']);
  };

  const handleRemovePath = (index: number) => {
    const newPaths = [...paths];
    newPaths.splice(index, 1);
    setPaths(newPaths);
  };

  const handlePathChange = (index: number, value: string) => {
    const newPaths = [...paths];
    newPaths[index] = value;
    setPaths(newPaths);
  };

  const handleAddCommonPath = (path: string) => {
    if (!paths.includes(path)) {
      setPaths([...paths, path]);
    }
  };

  const handleApplyFilter = () => {
    const filteredPaths = paths.filter(path => path.trim() !== '');
    
    onApplyFilter({
      domain: domain || undefined,
      paths: filteredPaths.length > 0 ? filteredPaths : undefined,
      path_filter_type: pathFilterType,
      depth: depth ? parseInt(depth, 10) : undefined,
    });
  };

  const handleReset = () => {
    setDomain('');
    setPaths(['']);
    setPathFilterType('contains');
    setDepth('');
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4 flex flex-row items-center justify-between">
            <div className="flex items-center">
              <Filter className="mr-2 h-5 w-5 text-primary" />
              <CardTitle>URL筛选</CardTitle>
            </div>
            <div>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* 域名筛选 */}
            <div className="space-y-2">
              <Label htmlFor="domain-select">域名</Label>
              <Select
                value={domain}
                onValueChange={setDomain}
                disabled={disabled || isLoading}
              >
                <SelectTrigger id="domain-select">
                  <SelectValue placeholder="所有域名" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有域名</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 路径筛选 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>路径筛选（支持多个）</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddPath}
                  disabled={disabled || isLoading}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  添加路径
                </Button>
              </div>
              
              {/* 常用路径下拉菜单 */}
              {commonPaths.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="common-path-select">常用路径</Label>
                  <div className="relative">
                    <Select 
                      onValueChange={(value) => {
                        if (value) {
                          handleAddCommonPath(value);
                        }
                      }}
                      disabled={isLoadingCommonPaths || disabled}
                    >
                      <SelectTrigger id="common-path-select">
                        <SelectValue placeholder="选择添加常用路径..." />
                      </SelectTrigger>
                      <SelectContent>
                        {commonPaths.map((path, index) => (
                          <SelectItem key={index} value={path}>
                            {path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {isLoadingCommonPaths && (
                      <div className="absolute right-10 top-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">选择后将添加到下方路径列表</p>
                </div>
              )}
              
              {/* 路径输入框列表 */}
              <div className="space-y-2">
                {paths.map((path, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={path}
                      onChange={(e) => handlePathChange(index, e.target.value)}
                      placeholder="/blog, /products, 等"
                      disabled={disabled || isLoading}
                    />
                    {paths.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePath(index)}
                        disabled={disabled || isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <Label htmlFor="path-filter-type">路径筛选类型</Label>
                <Select
                  value={pathFilterType}
                  onValueChange={setPathFilterType}
                  disabled={disabled || isLoading}
                >
                  <SelectTrigger id="path-filter-type">
                    <SelectValue placeholder="选择筛选类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">包含路径</SelectItem>
                    <SelectItem value="not_contains">不包含路径</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 深度筛选 */}
            <div className="space-y-2">
              <Label htmlFor="url-depth">URL深度</Label>
              <Input
                id="url-depth"
                type="number"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                placeholder="例如：2代表二级目录"
                min="0"
                disabled={disabled || isLoading}
              />
            </div>
            
            {/* 按钮组 */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleApplyFilter}
                disabled={isLoading || disabled}
                className="flex-1"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                应用筛选
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading || disabled}
              >
                重置
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}