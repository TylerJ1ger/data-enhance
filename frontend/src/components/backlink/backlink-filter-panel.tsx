//frontend-new/src/components/backlink/backlink-filter-panel.tsx
"use client";

import { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { BacklinkFilterRanges, BacklinkFilterRangeValues } from "@/types";

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
  const [domainAscoreRange, setDomainAscoreRange] = useState<[number, number]>(filterRanges.domain_ascore);
  const [backlinksRange, setBacklinksRange] = useState<[number, number]>(filterRanges.backlinks);
  const [domainFrequencyRange, setDomainFrequencyRange] = useState<[number, number]>(filterRanges.domain_frequency);

  // Update local state when props change
  useEffect(() => {
    setDomainAscoreRange(filterRanges.domain_ascore);
    setBacklinksRange(filterRanges.backlinks);
    setDomainFrequencyRange(filterRanges.domain_frequency);
  }, [filterRanges]);

  const handleApplyFilter = () => {
    onApplyFilter({
      domain_ascore_range: domainAscoreRange,
      backlinks_range: backlinksRange,
      domain_frequency_range: domainFrequencyRange,
    });
  };

  const handleResetFilters = () => {
    setDomainAscoreRange(filterRanges.domain_ascore);
    setBacklinksRange(filterRanges.backlinks);
    setDomainFrequencyRange(filterRanges.domain_frequency);
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

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center cursor-pointer space-x-0" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center">
          <Filter className="mr-2 h-4 w-4 text-primary" />
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </div>
        <div className="ml-auto">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-4 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">域名权重</label>
                <span className="text-sm text-muted-foreground">
                  {formatDomainAscore(domainAscoreRange[0])} - {formatDomainAscore(domainAscoreRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={domainAscoreRange}
                value={domainAscoreRange}
                min={filterRanges.domain_ascore[0]}
                max={filterRanges.domain_ascore[1]}
                step={1}
                onValueChange={(values) => setDomainAscoreRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatDomainAscore(filterRanges.domain_ascore[0])}</span>
                <span>{formatDomainAscore(filterRanges.domain_ascore[1])}</span>
              </div>
            </div>
          
            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">外链数</label>
                <span className="text-sm text-muted-foreground">
                  {formatBacklinks(backlinksRange[0])} - {formatBacklinks(backlinksRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={backlinksRange}
                value={backlinksRange}
                min={filterRanges.backlinks[0]}
                max={filterRanges.backlinks[1]}
                step={1}
                onValueChange={(values) => setBacklinksRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBacklinks(filterRanges.backlinks[0])}</span>
                <span>{formatBacklinks(filterRanges.backlinks[1])}</span>
              </div>
            </div>
          
            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">域名重复次数</label>
                <span className="text-sm text-muted-foreground">
                  {formatDomainFrequency(domainFrequencyRange[0])} - {formatDomainFrequency(domainFrequencyRange[1])}
                </span>
              </div>
              <Slider 
                defaultValue={domainFrequencyRange}
                value={domainFrequencyRange}
                min={filterRanges.domain_frequency[0]}
                max={filterRanges.domain_frequency[1]}
                step={1}
                onValueChange={(values) => setDomainFrequencyRange([values[0], values[1]] as [number, number])}
                disabled={disabled || isLoading}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatDomainFrequency(filterRanges.domain_frequency[0])}</span>
                <span>{formatDomainFrequency(filterRanges.domain_frequency[1])}</span>
              </div>
            </div>
          </div>
          
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
      )}
    </Card>
  );
}