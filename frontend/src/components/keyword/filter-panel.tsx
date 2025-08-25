//frontend-new/src/components/keyword/filter-panel.tsx
"use client";

import { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterRanges, FilterRangeValues, FilterConfigs } from '@/types';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filterRanges: FilterRangeValues;
  onApplyFilter: (filters: FilterRanges) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function FilterPanel({
  filterRanges,
  onApplyFilter,
  isLoading = false,
  disabled = false,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // 筛选配置状态
  const [filterConfigs, setFilterConfigs] = useState<FilterConfigs>({
    position: {
      enabled: true,
      range: filterRanges.position,
    },
    search_volume: {
      enabled: true,
      range: filterRanges.search_volume,
    },
    keyword_difficulty: {
      enabled: true,
      range: filterRanges.keyword_difficulty,
    },
    cpc: {
      enabled: true,
      range: filterRanges.cpc,
    },
    keyword_frequency: {
      enabled: true,
      range: filterRanges.keyword_frequency || [1, 100],
    },
  });

  // Update local state when props change
  useEffect(() => {
    setFilterConfigs(prev => ({
      position: {
        ...prev.position,
        range: filterRanges.position,
      },
      search_volume: {
        ...prev.search_volume,
        range: filterRanges.search_volume,
      },
      keyword_difficulty: {
        ...prev.keyword_difficulty,
        range: filterRanges.keyword_difficulty,
      },
      cpc: {
        ...prev.cpc,
        range: filterRanges.cpc,
      },
      keyword_frequency: {
        ...prev.keyword_frequency,
        range: filterRanges.keyword_frequency || [1, 100],
      },
    }));
  }, [filterRanges]);

  // 更新特定筛选项的启用状态
  const updateFilterEnabled = (filterKey: keyof FilterConfigs, enabled: boolean) => {
    setFilterConfigs(prev => ({
      ...prev,
      [filterKey]: {
        ...prev[filterKey],
        enabled,
      },
    }));
  };

  // 批量设置所有筛选项的启用状态
  const toggleAllFilters = (enabled: boolean) => {
    setFilterConfigs(prev => {
      const newConfig = { ...prev };
      Object.keys(newConfig).forEach(key => {
        newConfig[key as keyof FilterConfigs] = {
          ...newConfig[key as keyof FilterConfigs],
          enabled,
        };
      });
      return newConfig;
    });
  };

  // 检查是否所有筛选项都启用
  const areAllFiltersEnabled = () => {
    return Object.values(filterConfigs).every(config => config.enabled);
  };

  // 更新特定筛选项的范围值
  const updateFilterRange = (filterKey: keyof FilterConfigs, range: [number, number]) => {
    setFilterConfigs(prev => ({
      ...prev,
      [filterKey]: {
        ...prev[filterKey],
        range,
      },
    }));
  };

  // 更新单个范围值（从输入框）
  const updateSingleRangeValue = (filterKey: keyof FilterConfigs, index: 0 | 1, value: number) => {
    const currentRange = filterConfigs[filterKey].range;
    const newRange: [number, number] = [...currentRange] as [number, number];
    newRange[index] = value;
    
    // 确保最小值不大于最大值
    if (index === 0 && newRange[0] > newRange[1]) {
      newRange[1] = newRange[0];
    } else if (index === 1 && newRange[1] < newRange[0]) {
      newRange[0] = newRange[1];
    }
    
    updateFilterRange(filterKey, newRange);
  };

  const handleApplyFilter = () => {
    const filters: FilterRanges = {};
    
    // 只包含启用的筛选项
    if (filterConfigs.position.enabled) {
      filters.position_range = filterConfigs.position.range;
    }
    if (filterConfigs.search_volume.enabled) {
      filters.search_volume_range = filterConfigs.search_volume.range;
    }
    if (filterConfigs.keyword_difficulty.enabled) {
      filters.keyword_difficulty_range = filterConfigs.keyword_difficulty.range;
    }
    if (filterConfigs.cpc.enabled) {
      filters.cpc_range = filterConfigs.cpc.range;
    }
    if (filterConfigs.keyword_frequency.enabled) {
      filters.keyword_frequency_range = filterConfigs.keyword_frequency.range;
    }
    
    onApplyFilter(filters);
  };

  const handleResetFilters = () => {
    setFilterConfigs({
      position: {
        enabled: true,
        range: filterRanges.position,
      },
      search_volume: {
        enabled: true,
        range: filterRanges.search_volume,
      },
      keyword_difficulty: {
        enabled: true,
        range: filterRanges.keyword_difficulty,
      },
      cpc: {
        enabled: true,
        range: filterRanges.cpc,
      },
      keyword_frequency: {
        enabled: true,
        range: filterRanges.keyword_frequency || [1, 100],
      },
    });
  };

  // Format values for display
  const formatPosition = (value: number) => `${value.toFixed(0)}`;
  const formatSearchVolume = (value: number) => 
    value >= 1000000 
      ? `${(value / 1000000).toFixed(1)}M` 
      : value >= 1000 
        ? `${(value / 1000).toFixed(1)}K` 
        : `${value}`;
  const formatKeywordDifficulty = (value: number) => `${value.toFixed(0)}`;
  const formatCPC = (value: number) => `$${value.toFixed(2)}`;
  const formatKeywordFrequency = (value: number) => `${value.toFixed(0)}`;

  // 筛选项配置
  const filterItems = [
    {
      key: 'position' as keyof FilterConfigs,
      title: '排名位置',
      formatter: formatPosition,
      originalRange: filterRanges.position,
      step: 1,
      inputType: 'number',
    },
    {
      key: 'search_volume' as keyof FilterConfigs,
      title: '搜索量',
      formatter: formatSearchVolume,
      originalRange: filterRanges.search_volume,
      step: 1,
      inputType: 'number',
    },
    {
      key: 'keyword_difficulty' as keyof FilterConfigs,
      title: '关键词难度',
      formatter: formatKeywordDifficulty,
      originalRange: filterRanges.keyword_difficulty,
      step: 1,
      inputType: 'number',
    },
    {
      key: 'cpc' as keyof FilterConfigs,
      title: '点击成本 (CPC)',
      formatter: formatCPC,
      originalRange: filterRanges.cpc,
      step: 0.01,
      inputType: 'number',
    },
    {
      key: 'keyword_frequency' as keyof FilterConfigs,
      title: '关键词重复次数',
      formatter: formatKeywordFrequency,
      originalRange: filterRanges.keyword_frequency || [1, 100],
      step: 1,
      inputType: 'number',
    },
  ];

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Filter className="mr-2 h-5 w-5 text-primary" />
                <CardTitle className="text-lg">筛选条件</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>提示：选中滑杆后可使用键盘左右箭头键进行精确调节</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* 全局开关控制 */}
            <div className="mb-4 bg-muted/30 rounded-lg">
              <Label className="text-sm font-medium flex items-center">
                <Switch
                  checked={areAllFiltersEnabled()}
                  onCheckedChange={(checked) => toggleAllFilters(checked)}
                  disabled={disabled || isLoading}
                  className="mr-2"
                />
                全部筛选项
              </Label>
            </div>
            
            <Separator />
            
            {filterItems.map((item, index) => {
              const config = filterConfigs[item.key];
              const isItemDisabled = disabled || isLoading || !config.enabled;
              
              return (
                <div key={item.key}>
                  {/* 筛选项标题和开关 */}
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium flex items-center">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => updateFilterEnabled(item.key, checked)}
                        disabled={disabled || isLoading}
                        className="mr-2"
                      />
                      {item.title}
                    </Label>
                    <span className={cn(
                      "text-sm",
                      config.enabled ? "text-muted-foreground" : "text-muted-foreground/50"
                    )}>
                      {item.formatter(config.range[0])} - {item.formatter(config.range[1])}
                    </span>
                  </div>

                  {/* 滑杆 */}
                  <Slider 
                    value={[config.range[0], config.range[1]]}
                    min={item.originalRange[0]}
                    max={item.originalRange[1]}
                    step={item.step}
                    onValueChange={(values) => updateFilterRange(item.key, [values[0], values[1]] as [number, number])}
                    disabled={isItemDisabled}
                    className={cn(
                      "my-2",
                      !config.enabled && "opacity-50"
                    )}
                  />

                  {/* 范围显示和输入框 */}
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">最小:</span>
                      <Input
                        type={item.inputType}
                        value={config.range[0]}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            updateSingleRangeValue(item.key, 0, value);
                          }
                        }}
                        disabled={isItemDisabled}
                        className="w-20 h-7 text-xs"
                        step={item.step}
                        min={item.originalRange[0]}
                        max={item.originalRange[1]}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">最大:</span>
                      <Input
                        type={item.inputType}
                        value={config.range[1]}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            updateSingleRangeValue(item.key, 1, value);
                          }
                        }}
                        disabled={isItemDisabled}
                        className="w-20 h-7 text-xs"
                        step={item.step}
                        min={item.originalRange[0]}
                        max={item.originalRange[1]}
                      />
                    </div>
                  </div>

                  {/* 原始范围显示 */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{item.formatter(item.originalRange[0])}</span>
                    <span>{item.formatter(item.originalRange[1])}</span>
                  </div>
                  
                  {index < filterItems.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
            
            {/* 按钮 */}
            <div className="flex space-x-4 pt-4">
              <Button
                variant="default"
                onClick={handleApplyFilter}
                disabled={isLoading || disabled}
                className="flex-1"
              >
                应用筛选
              </Button>
              <Button
                variant="outline"
                onClick={handleResetFilters}
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