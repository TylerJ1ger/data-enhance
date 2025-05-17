//frontend-new/src/components/keyword/keyword-filter.tsx
"use client";

import React, { useState } from 'react';
import { Search, Loader } from 'lucide-react';
import { KeywordFilterResponse } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface KeywordFilterProps {
  onFilter: (keyword: string) => void;
  results: KeywordFilterResponse | null;
  isLoading: boolean;
  disabled?: boolean;
}

export function KeywordFilter({
  onFilter,
  results,
  isLoading,
  disabled = false,
}: KeywordFilterProps) {
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onFilter(keyword.trim());
    }
  };
  
  const renderLoading = () => (
    <div className="flex justify-center my-8">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  
  const renderEmptyState = () => (
    <div className="text-center py-8 text-muted-foreground">
      未找到匹配的关键词数据
    </div>
  );
  
  const renderResults = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        共找到 {results?.results.length} 条"{keyword}"关键词数据
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>品牌</TableHead>
              <TableHead>关键词</TableHead>
              <TableHead>排名位置</TableHead>
              <TableHead>流量</TableHead>
              <TableHead>链接</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results?.results.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.brand}</TableCell>
                <TableCell>{item.keyword}</TableCell>
                <TableCell>
                  {item.position !== undefined && item.position !== null 
                    ? (<Badge variant="outline">{item.position}</Badge>) 
                    : '-'}
                </TableCell>
                <TableCell>
                  {item.traffic !== undefined && item.traffic !== null 
                    ? item.traffic.toLocaleString() 
                    : '-'}
                </TableCell>
                <TableCell>
                  {item.url ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a 
                            href={item.url.startsWith('http') ? item.url : `https://${item.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            查看链接
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.url}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>关键词筛选</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-grow">
            <Input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入关键词..."
              disabled={disabled || isLoading}
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={disabled || isLoading || !keyword.trim()}
            className="min-w-[80px]"
          >
            {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {isLoading ? '' : '搜索'}
          </Button>
        </form>
        
        {isLoading && renderLoading()}
        
        {!isLoading && results && (
          results.results.length === 0 ? renderEmptyState() : renderResults()
        )}
      </CardContent>
    </Card>
  );
}