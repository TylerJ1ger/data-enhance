//frontend-new/src/components/keyword/keyword-stats.tsx
"use client";

import { FileText, BarChart2, Filter, TrendingUp } from "lucide-react";
import { DataStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface KeywordStatsProps {
  originalStats: DataStats | null;
  filteredStats: DataStats | null;
  isLoading?: boolean;
}

export function KeywordStats({
  originalStats,
  filteredStats,
  isLoading = false,
}: KeywordStatsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4 mb-4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!originalStats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">上传文件以查看关键词统计信息</p>
        </CardContent>
      </Card>
    );
  }

  // 计算筛选后保留的关键词百分比
  const percentageRetained = filteredStats
    ? Math.round((filteredStats.keyword_count / originalStats.keyword_count) * 100)
    : 100;

  // 统计卡片组件
  const StatCard = ({
    icon,
    title,
    originalValue,
    filteredValue,
    formatter = (val: number) => val.toLocaleString(),
  }: {
    icon: React.ReactNode;
    title: string;
    originalValue: number;
    filteredValue?: number;
    formatter?: (val: number) => string;
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center mb-2">
          <div className="mr-2 text-primary">{icon}</div>
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {formatter(filteredValue !== undefined ? filteredValue : originalValue)}
          </div>
          {filteredValue !== undefined && filteredValue !== originalValue && (
            <div className="text-sm">
              <span className="text-muted-foreground">原始: </span>
              <span className="font-medium">{formatter(originalValue)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>关键词统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            title="总行数"
            originalValue={originalStats.total_rows}
            filteredValue={filteredStats?.total_rows}
          />

          <StatCard
            icon={<BarChart2 className="h-5 w-5" />}
            title="总关键词数"
            originalValue={originalStats.keyword_count}
            filteredValue={filteredStats?.keyword_count}
          />

          <StatCard
            icon={<Filter className="h-5 w-5" />}
            title="唯一关键词数"
            originalValue={originalStats.unique_keywords}
            filteredValue={filteredStats?.unique_keywords}
          />

          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="唯一关键词搜索量"
            originalValue={originalStats.unique_keywords_search_volume}
            filteredValue={filteredStats?.unique_keywords_search_volume}
          />
        </div>
        
        {filteredStats && filteredStats.keyword_count !== originalStats.keyword_count && (
          <Alert variant="info">
            <AlertTitle className="flex items-center">
              筛选已应用
              <Badge variant="outline" className="ml-2">
                {percentageRetained}%
              </Badge>
            </AlertTitle>
            <AlertDescription>
              显示 {filteredStats.keyword_count.toLocaleString()} 个关键词，共 {originalStats.keyword_count.toLocaleString()} 个
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}