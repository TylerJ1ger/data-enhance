//frontend-new/src/components/backlink/backlink-stats.tsx
"use client";

import { FileText, BarChart2, Filter } from "lucide-react";
import { BacklinkDataStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface BacklinkStatsProps {
  originalStats: BacklinkDataStats | null;
  filteredStats: BacklinkDataStats | null;
  isLoading?: boolean;
}

export function BacklinkStats({
  originalStats,
  filteredStats,
  isLoading = false,
}: BacklinkStatsProps) {
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!originalStats) {
    return (
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 text-muted-foreground/70" />
            <p>上传文件以查看外链统计信息</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage of domains retained after filtering
  const percentageRetained = filteredStats
    ? Math.round((filteredStats.domain_count / originalStats.domain_count) * 100)
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
    <Card>
      <CardContent className="p-4">
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
      </CardContent>
    </Card>
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">外链统计信息</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            title="总行数"
            originalValue={originalStats.total_rows}
            filteredValue={filteredStats?.total_rows}
          />
          
          <StatCard
            icon={<BarChart2 className="h-4 w-4" />}
            title="总域名数"
            originalValue={originalStats.domain_count}
            filteredValue={filteredStats?.domain_count}
          />
          
          <StatCard
            icon={<Filter className="h-4 w-4" />}
            title="唯一域名数"
            originalValue={originalStats.unique_domains}
            filteredValue={filteredStats?.unique_domains}
          />
        </div>
        
        {filteredStats && filteredStats.domain_count !== originalStats.domain_count && (
          <Alert className="mt-4" variant="info">
            <AlertTitle className="text-sm font-medium">筛选已应用</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              显示 {filteredStats.domain_count.toLocaleString()} 个域名，共 {originalStats.domain_count.toLocaleString()} 个域名 ({percentageRetained}%)
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}