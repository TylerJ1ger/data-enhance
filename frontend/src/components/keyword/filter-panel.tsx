//frontend-new/src/components/keyword/filter-panel.tsx
"use client";

import { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider"; // 导入 shadcn UI 的 Slider 组件
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FilterRanges, FilterRangeValues } from '@/types';
import { Label } from '@/components/ui/label';
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
  const [positionRange, setPositionRange] = useState<[number, number]>(filterRanges.position);
  const [searchVolumeRange, setSearchVolumeRange] = useState<[number, number]>(filterRanges.search_volume);
  const [keywordDifficultyRange, setKeywordDifficultyRange] = useState<[number, number]>(filterRanges.keyword_difficulty);
  const [cpcRange, setCpcRange] = useState<[number, number]>(filterRanges.cpc);
  const [keywordFrequencyRange, setKeywordFrequencyRange] = useState<[number, number]>(filterRanges.keyword_frequency || [1, 100]);

  // Update local state when props change
  useEffect(() => {
    setPositionRange(filterRanges.position);
    setSearchVolumeRange(filterRanges.search_volume);
    setKeywordDifficultyRange(filterRanges.keyword_difficulty);
    setCpcRange(filterRanges.cpc);
    if (filterRanges.keyword_frequency) {
      setKeywordFrequencyRange(filterRanges.keyword_frequency);
    }
  }, [filterRanges]);

  const handleApplyFilter = () => {
    onApplyFilter({
      position_range: positionRange,
      search_volume_range: searchVolumeRange,
      keyword_difficulty_range: keywordDifficultyRange,
      cpc_range: cpcRange,
      keyword_frequency_range: keywordFrequencyRange,
    });
  };

  const handleResetFilters = () => {
    setPositionRange(filterRanges.position);
    setSearchVolumeRange(filterRanges.search_volume);
    setKeywordDifficultyRange(filterRanges.keyword_difficulty);
    setCpcRange(filterRanges.cpc);
    setKeywordFrequencyRange(filterRanges.keyword_frequency || [1, 100]);
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

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Filter className="mr-2 h-5 w-5 text-primary" />
                <CardTitle className="text-lg">筛选条件</CardTitle>
              </div>
              <div>
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* 排名位置 Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">排名位置</Label>
                <span className="text-sm text-muted-foreground">
                  {formatPosition(positionRange[0])} - {formatPosition(positionRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={positionRange}
                value={[positionRange[0], positionRange[1]]}
                min={filterRanges.position[0]}
                max={filterRanges.position[1]}
                step={1}
                onValueChange={(values) => setPositionRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPosition(filterRanges.position[0])}</span>
                <span>{formatPosition(filterRanges.position[1])}</span>
              </div>
            </div>
          
            <Separator className="my-2" />

            {/* 搜索量 Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">搜索量</Label>
                <span className="text-sm text-muted-foreground">
                  {formatSearchVolume(searchVolumeRange[0])} - {formatSearchVolume(searchVolumeRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={searchVolumeRange}
                value={[searchVolumeRange[0], searchVolumeRange[1]]}
                min={filterRanges.search_volume[0]}
                max={filterRanges.search_volume[1]}
                step={1}
                onValueChange={(values) => setSearchVolumeRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatSearchVolume(filterRanges.search_volume[0])}</span>
                <span>{formatSearchVolume(filterRanges.search_volume[1])}</span>
              </div>
            </div>
          
            <Separator className="my-2" />

            {/* 关键词难度 Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">关键词难度</Label>
                <span className="text-sm text-muted-foreground">
                  {formatKeywordDifficulty(keywordDifficultyRange[0])} - {formatKeywordDifficulty(keywordDifficultyRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={keywordDifficultyRange}
                value={[keywordDifficultyRange[0], keywordDifficultyRange[1]]}
                min={filterRanges.keyword_difficulty[0]}
                max={filterRanges.keyword_difficulty[1]}
                step={1}
                onValueChange={(values) => setKeywordDifficultyRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatKeywordDifficulty(filterRanges.keyword_difficulty[0])}</span>
                <span>{formatKeywordDifficulty(filterRanges.keyword_difficulty[1])}</span>
              </div>
            </div>
          
            <Separator className="my-2" />

            {/* 点击成本 Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">点击成本 (CPC)</Label>
                <span className="text-sm text-muted-foreground">
                  {formatCPC(cpcRange[0])} - {formatCPC(cpcRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={cpcRange}
                value={[cpcRange[0], cpcRange[1]]}
                min={filterRanges.cpc[0]}
                max={filterRanges.cpc[1]}
                step={0.01}
                onValueChange={(values) => setCpcRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCPC(filterRanges.cpc[0])}</span>
                <span>{formatCPC(filterRanges.cpc[1])}</span>
              </div>
            </div>
          
            <Separator className="my-2" />

            {/* 关键词重复次数 Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">关键词重复次数</Label>
                <span className="text-sm text-muted-foreground">
                  {formatKeywordFrequency(keywordFrequencyRange[0])} - {formatKeywordFrequency(keywordFrequencyRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={keywordFrequencyRange}
                value={[keywordFrequencyRange[0], keywordFrequencyRange[1]]}
                min={1}
                max={100}
                step={1}
                onValueChange={(values) => setKeywordFrequencyRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>100</span>
              </div>
            </div>
            
            {/* 按钮 */}
            <div className="flex space-x-4 pt-2">
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