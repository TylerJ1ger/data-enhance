//frontend-new/src/components/keyword/file-stats.tsx
"use client";

import { FileTextIcon, BarChart2Icon, FilterIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DataStats } from "@/types";

interface FileStatsProps {
  originalStats: DataStats | null;
  filteredStats: DataStats | null;
  isLoading?: boolean;
}

export function FileStats({
  originalStats,
  filteredStats,
  isLoading = false,
}: FileStatsProps) {
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <FileTextIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
            <p>上传文件以查看关键词统计信息</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage of keywords retained after filtering
  const percentageRetained = filteredStats
    ? Math.round((filteredStats.keyword_count / originalStats.keyword_count) * 100)
    : 100;

  // Stats card component
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
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center mb-2">
        <div className="mr-2 text-primary">{icon}</div>
        <h4 className="text-sm font-medium">{title}</h4>
      </div>
      <div className="flex justify-between items-end">
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
    </div>
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>关键词统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<FileTextIcon className="h-4 w-4" />}
            title="总行数"
            originalValue={originalStats.total_rows}
            filteredValue={filteredStats?.total_rows}
          />
          
          <StatCard
            icon={<BarChart2Icon className="h-4 w-4" />}
            title="总关键词数"
            originalValue={originalStats.keyword_count}
            filteredValue={filteredStats?.keyword_count}
          />
          
          <StatCard
            icon={<FilterIcon className="h-4 w-4" />}
            title="唯一关键词数"
            originalValue={originalStats.unique_keywords}
            filteredValue={filteredStats?.unique_keywords}
          />
        </div>
        
        {filteredStats && filteredStats.keyword_count !== originalStats.keyword_count && (
          <Alert className="mt-4" variant="info">
            <AlertTitle>筛选已应用</AlertTitle>
            <AlertDescription>
              显示 {filteredStats.keyword_count.toLocaleString()} 个关键词，共 {originalStats.keyword_count.toLocaleString()} 个关键词 ({percentageRetained}%)
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}