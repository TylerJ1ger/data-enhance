"use client";

import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { 
  RefreshCw, 
  Cloud, 
  CloudOff, 
  Database, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useSyncApi } from '../../hooks/use-sync-api';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  showControls?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  showDetails = false,
  showControls = false,
  className = ""
}) => {
  const {
    syncStatus,
    isLoading,
    error,
    performSync,
    enableAutoSync,
    getLocalStats
  } = useSyncApi();

  const [localStats, setLocalStats] = React.useState<{
    total_keywords: number;
    total_groups: number;
    total_qpm: number;
  }>({ total_keywords: 0, total_groups: 0, total_qpm: 0 });

  React.useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await getLocalStats();
        setLocalStats(stats);
      } catch (err) {
        console.error('Failed to get local stats:', err);
      }
    };
    updateStats();
  }, [getLocalStats, syncStatus.last_sync]);

  const getSyncStatusIcon = () => {
    if (syncStatus.is_syncing || isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (syncStatus.pending_operations > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (syncStatus.auto_sync_enabled) {
      return <Cloud className="h-4 w-4 text-green-500" />;
    }
    return <CloudOff className="h-4 w-4 text-gray-500" />;
  };

  const getSyncStatusText = () => {
    if (syncStatus.is_syncing || isLoading) {
      return "同步中...";
    }
    if (error) {
      return "同步错误";
    }
    if (syncStatus.pending_operations > 0) {
      return `${syncStatus.pending_operations} 项待同步`;
    }
    if (syncStatus.last_sync) {
      const lastSync = new Date(syncStatus.last_sync);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
      if (diffMinutes < 1) {
        return "刚刚同步";
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前同步`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        return `${diffHours}小时前同步`;
      }
    }
    return "未同步";
  };

  const getSyncStatusBadgeVariant = () => {
    if (syncStatus.is_syncing || isLoading) {
      return "secondary";
    }
    if (error) {
      return "destructive";
    }
    if (syncStatus.pending_operations > 0) {
      return "secondary";
    }
    if (syncStatus.auto_sync_enabled) {
      return "default";
    }
    return "outline";
  };

  const handleManualSync = async () => {
    try {
      await performSync();
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  if (!showDetails) {
    // 简单的状态指示器
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getSyncStatusBadgeVariant()} className={`flex items-center gap-2 ${className}`}>
              {getSyncStatusIcon()}
              {getSyncStatusText()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p>自动同步: {syncStatus.auto_sync_enabled ? '开启' : '关闭'}</p>
              <p>待同步: {syncStatus.pending_operations} 项</p>
              <p>本地数据: {localStats.total_keywords} 关键词</p>
              {error && <p className="text-red-500">错误: {error}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 详细的同步状态卡片
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            数据同步状态
          </div>
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={syncStatus.is_syncing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(syncStatus.is_syncing || isLoading) ? 'animate-spin' : ''}`} />
                手动同步
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          前端IndexedDB与后端Redis数据同步状态
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 当前状态 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">当前状态</span>
          <Badge variant={getSyncStatusBadgeVariant()} className="flex items-center gap-2">
            {getSyncStatusIcon()}
            {getSyncStatusText()}
          </Badge>
        </div>

        {/* 自动同步控制 */}
        {showControls && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">自动同步</span>
            <Switch
              checked={syncStatus.auto_sync_enabled}
              onCheckedChange={enableAutoSync}
            />
          </div>
        )}

        {/* 待同步操作 */}
        {syncStatus.pending_operations > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">待同步操作</span>
              <Badge variant="secondary">{syncStatus.pending_operations} 项</Badge>
            </div>
            <Progress value={(syncStatus.pending_operations / (syncStatus.pending_operations + 10)) * 100} className="h-2" />
          </div>
        )}

        {/* 本地数据统计 */}
        <div className="space-y-2">
          <span className="text-sm font-medium">本地数据</span>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">{localStats.total_keywords}</div>
              <div className="text-muted-foreground">关键词</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{localStats.total_groups}</div>
              <div className="text-muted-foreground">组</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{Math.round(localStats.total_qpm)}</div>
              <div className="text-muted-foreground">总QPM</div>
            </div>
          </div>
        </div>

        {/* 最后同步时间 */}
        {syncStatus.last_sync && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">最后同步</span>
            <span>{new Date(syncStatus.last_sync).toLocaleString()}</span>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* 同步成功指示 */}
        {!error && !syncStatus.is_syncing && syncStatus.last_sync && syncStatus.pending_operations === 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">数据已同步</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};