//frontend-new/src/components/backlink/backlink-filter-panel.tsx
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
import { BacklinkFilterRanges, BacklinkFilterRangeValues, BacklinkFilterConfigs } from '@/types';
import { cn } from '@/lib/utils';

interface BacklinkFilterPanelProps {
  filterRanges: BacklinkFilterRangeValues;
  onApplyFilter: (filters: BacklinkFilterRanges) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function BacklinkFilterPanel({
  filterRanges,
  onApplyFilter,
  isLoading = false,
  disabled = false,
}: BacklinkFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // 筛选配置状态
  const [filterConfigs, setFilterConfigs] = useState<BacklinkFilterConfigs>({
    domain_ascore: {
      enabled: true,
      range: filterRanges.domain_ascore,
    },
    backlinks: {
      enabled: true,
      range: filterRanges.backlinks,
    },
    domain_frequency: {
      enabled: true,
      range: filterRanges.domain_frequency,
    },
  });

  // Update local state when props change
  useEffect(() => {
    setFilterConfigs(prev => ({
      domain_ascore: {
        ...prev.domain_ascore,
        range: filterRanges.domain_ascore,
      },
      backlinks: {
        ...prev.backlinks,
        range: filterRanges.backlinks,
      },
      domain_frequency: {
        ...prev.domain_frequency,
        range: filterRanges.domain_frequency,
      },
    }));
  }, [filterRanges]);

  // 更新特定筛选项的启用状态
  const updateFilterEnabled = (filterKey: keyof BacklinkFilterConfigs, enabled: boolean) => {
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
        newConfig[key as keyof BacklinkFilterConfigs] = {
          ...newConfig[key as keyof BacklinkFilterConfigs],
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
  const updateFilterRange = (filterKey: keyof BacklinkFilterConfigs, range: [number, number]) => {
    setFilterConfigs(prev => ({
      ...prev,
      [filterKey]: {
        ...prev[filterKey],
        range,
      },
    }));
  };

  // 更新单个范围值（从输入框）
  const updateSingleRangeValue = (filterKey: keyof BacklinkFilterConfigs, index: 0 | 1, value: number) => {
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
    const filters: BacklinkFilterRanges = {};

    // 只包含启用的筛选项
    if (filterConfigs.domain_ascore.enabled) {
      filters.domain_ascore_range = filterConfigs.domain_ascore.range;
    }
    if (filterConfigs.backlinks.enabled) {
      filters.backlinks_range = filterConfigs.backlinks.range;
    }
    if (filterConfigs.domain_frequency.enabled) {
      filters.domain_frequency_range = filterConfigs.domain_frequency.range;
    }

    onApplyFilter(filters);
  };

  const handleResetFilters = () => {
    setFilterConfigs({
      domain_ascore: {
        enabled: true,
        range: filterRanges.domain_ascore,
      },
      backlinks: {
        enabled: true,
        range: filterRanges.backlinks,
      },
      domain_frequency: {
        enabled: true,
        range: filterRanges.domain_frequency,
      },
    });
  };

  // Format values for display
  const formatDomainAscore = (value: number) => `${value.toFixed(0)}`;
  const formatBacklinks = (value: number) =>
    value >= 1000000
      ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000
        ? `${(value / 1000).toFixed(1)}K`
        : `${value}`;
  const formatDomainFrequency = (value: number) => `${value.toFixed(0)}`;

  // 筛选项配置
  const filterItems = [
    {
      key: 'domain_ascore' as keyof BacklinkFilterConfigs,
      title: '域名权重',
      formatter: formatDomainAscore,
      originalRange: filterRanges.domain_ascore,
      step: 1,
      inputType: 'number',
    },
    {
      key: 'backlinks' as keyof BacklinkFilterConfigs,
      title: '外链数',
      formatter: formatBacklinks,
      originalRange: filterRanges.backlinks,
      step: 1,
      inputType: 'number',
    },
    {
      key: 'domain_frequency' as keyof BacklinkFilterConfigs,
      title: '域名重复次数',
      formatter: formatDomainFrequency,
      originalRange: filterRanges.domain_frequency,
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
                全局筛选
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