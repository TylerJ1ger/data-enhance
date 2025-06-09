// src/components/keystore/keystore-stats.tsx
"use client";

import { Database, Users, FileText, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { KeystoreSummary, GroupOverview, KeystoreFileStats } from "@/types/keystore";

interface KeystoreStatsProps {
  summary: KeystoreSummary | null;
  groupsOverview: GroupOverview[];
  fileStats: KeystoreFileStats[];
  isLoading?: boolean;
}

export function KeystoreStats({
  summary,
  groupsOverview,
  fileStats,
  isLoading = false,
}: KeystoreStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Database className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">上传文件以查看关键词库统计信息</p>
        </CardContent>
      </Card>
    );
  }

  const StatCard = ({
    icon,
    title,
    value,
    description,
    badgeText,
    badgeVariant = "secondary"
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    description: string;
    badgeText?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-primary">{icon}</div>
          {badgeText && (
            <Badge variant={badgeVariant} className="text-xs">
              {badgeText}
            </Badge>
          )}
        </div>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 主要统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          title="总关键词数"
          value={summary.total_keywords}
          description={`唯一关键词: ${summary.unique_keywords}`}
        />
        
        <StatCard
          icon={<Users className="h-5 w-5" />}
          title="关键词组数"
          value={summary.total_groups}
          description={`关键词族: ${summary.total_clusters}`}
        />
        
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="总搜索量"
          value={summary.total_qpm.toLocaleString()}
          description={`平均难度: ${summary.avg_diff.toFixed(1)}`}
        />
        
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="重复关键词"
          value={summary.duplicate_keywords_count}
          description="需要处理的重复项"
          badgeText={summary.duplicate_keywords_count > 0 ? "需关注" : "无重复"}
          badgeVariant={summary.duplicate_keywords_count > 0 ? "destructive" : "secondary"}
        />
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 文件统计 */}
        {fileStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">文件处理统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fileStats.map((file, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{file.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.rows} 行 • {file.keywords} 关键词 • {file.groups} 组
                      </div>
                    </div>
                    <Badge variant="outline">{file.keywords}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 组概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">热门关键词组</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupsOverview.slice(0, 5).map((group, index) => (
                <div key={group.group_name} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{group.group_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.keyword_count} 关键词 • 难度: {group.avg_diff.toFixed(1)}
                      {group.cluster_name && (
                        <span className="ml-2">
                          <Badge variant="outline" className="text-xs">
                            {group.cluster_name}
                          </Badge>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{group.total_qpm.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">QPM</div>
                  </div>
                </div>
              ))}
              
              {groupsOverview.length > 5 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  还有 {groupsOverview.length - 5} 个组...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}