// src/components/keystore/keystore-duplicates-manager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Trash2, Eye, Upload, X, MoreVertical, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useKeystoreApi } from "@/hooks/use-keystore-api";

interface DuplicateGroup {
  group: string;
  qpm: number;
}

interface DuplicateDetail {
  keyword: string;
  group_count: number;
  total_qpm: number;
  groups: DuplicateGroup[];
}

interface DuplicatesData {
  total_duplicates: number;
  details: DuplicateDetail[];
}

interface GroupData {
  keyword_count: number;
}

interface PendingAction {
  id: string;
  type: 'move' | 'remove';
  keyword: string;
  sourceGroup: string;
  targetGroup?: string;
  timestamp: number;
}

interface KeystoreDuplicatesManagerProps {
  duplicatesData: DuplicatesData | null;
  groupsData: Record<string, GroupData>;
  previewMode?: boolean;
  isLoading?: boolean;
}


export function KeystoreDuplicatesManager({
  duplicatesData,
  groupsData,
  previewMode = false,
  isLoading = false
}: KeystoreDuplicatesManagerProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedSourceGroup, setSelectedSourceGroup] = useState<string>('');
  const [selectedTargetGroup, setSelectedTargetGroup] = useState<string>('');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'move' | 'remove'>('move');
  
  // 新增：缓存操作相关状态
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  
  
  const { moveKeyword, removeKeyword, isProcessing } = useKeystoreApi();

  // 简化的调试日志
  useEffect(() => {
    console.log('🔍 重复关键词组件数据更新:', {
      totalDuplicates: duplicatesData?.total_duplicates || 0,
      duplicatesCount: duplicatesData?.details?.length || 0,
      hasData: !!duplicatesData,
      isLoading: isLoading,
      timestamp: new Date().toISOString()
    });
  }, [duplicatesData, isLoading]);

  // 新增：将操作添加到缓存
  const addPendingAction = (action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const newAction: PendingAction = {
      ...action,
      id: `${action.type}-${action.keyword}-${action.sourceGroup}-${Date.now()}`,
      timestamp: Date.now()
    };
    
    // 检查是否已存在相同的操作
    const existingIndex = pendingActions.findIndex(
      existing => existing.keyword === action.keyword && 
                 existing.sourceGroup === action.sourceGroup && 
                 existing.type === action.type
    );
    
    if (existingIndex >= 0) {
      // 更新现有操作
      const updatedActions = [...pendingActions];
      updatedActions[existingIndex] = newAction;
      setPendingActions(updatedActions);
    } else {
      // 添加新操作
      setPendingActions(prev => [...prev, newAction]);
    }
  };
  
  // 新增：检查操作是否已缓存
  const isActionPending = (keyword: string, sourceGroup: string, type: 'move' | 'remove'): boolean => {
    return pendingActions.some(
      action => action.keyword === keyword && 
               action.sourceGroup === sourceGroup && 
               action.type === type
    );
  };
  
  
  
  const handleMoveKeyword = async () => {
    if (!selectedKeyword || !selectedSourceGroup || !selectedTargetGroup) {
      return;
    }

    // 添加到缓存而不是立即执行
    addPendingAction({
      type: 'move',
      keyword: selectedKeyword,
      sourceGroup: selectedSourceGroup,
      targetGroup: selectedTargetGroup
    });
    
    setIsActionDialogOpen(false);
    resetSelection();
  };

  const handleRemoveKeyword = async () => {
    if (!selectedKeyword || !selectedSourceGroup) {
      return;
    }

    // 添加到缓存而不是立即执行
    addPendingAction({
      type: 'remove',
      keyword: selectedKeyword,
      sourceGroup: selectedSourceGroup
    });
    
    setIsActionDialogOpen(false);
    resetSelection();
  };
  
  // 新增：并发执行所有缓存操作
  const executePendingActions = async () => {
    if (pendingActions.length === 0) return;
    
    setIsPushing(true);
    const failedActionsList: PendingAction[] = [];
    
    try {
      console.log(`开始并发执行 ${pendingActions.length} 个操作...`);
      
      // 将所有操作转换为 Promise 数组，实现并发执行
      const actionPromises = pendingActions.map(async (action) => {
        try {
          if (action.type === 'move') {
            await moveKeyword({
              keyword: action.keyword,
              source_group: action.sourceGroup,
              target_group: action.targetGroup!
            });
          } else if (action.type === 'remove') {
            await removeKeyword({
              keyword: action.keyword,
              group: action.sourceGroup
            });
          }
          return { success: true, action };
        } catch (error) {
          console.error(`执行操作失败:`, action, error);
          return { success: false, action, error };
        }
      });
      
      // 等待所有操作完成
      const results = await Promise.allSettled(actionPromises);
      
      // 处理结果
      let successCount = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          // 如果 Promise 被拒绝或操作失败，添加到失败列表
          if (result.status === 'fulfilled' && !result.value.success) {
            failedActionsList.push(result.value.action);
          } else if (result.status === 'rejected') {
            console.error('Promise 执行失败:', result.reason);
            // 如果无法确定具体的 action，我们需要从原始列表中推断
          }
        }
      });
      
      // 清除成功的操作，保留失败的操作
      setPendingActions(failedActionsList);
      
      console.log(`并发执行完成: 成功 ${successCount} 个，失败 ${failedActionsList.length} 个`);
      
      if (successCount > 0) {
        // 触发数据刷新
        window.dispatchEvent(new CustomEvent('keystore-data-changed', {
          detail: { action: 'batch-operations-completed', count: successCount }
        }));
      }
      
      if (failedActionsList.length > 0) {
        console.warn(`${failedActionsList.length} 个操作执行失败`);
      }
      
    } finally {
      setIsPushing(false);
      setIsConfirmDialogOpen(false);
    }
  };

  const resetSelection = () => {
    setSelectedKeyword(null);
    setSelectedSourceGroup('');
    setSelectedTargetGroup('');
  };

  const openActionDialog = (keyword: string, sourceGroup: string, type: 'move' | 'remove') => {
    setSelectedKeyword(keyword);
    setSelectedSourceGroup(sourceGroup);
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>重复关键词分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!duplicatesData || duplicatesData.total_duplicates === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>重复关键词分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
            <p>没有发现重复关键词</p>
            <p className="text-sm">所有关键词都在唯一的组中</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (previewMode) {
    // 预览模式：只显示概览信息
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            发现 <strong>{duplicatesData.total_duplicates}</strong> 个重复关键词，需要处理。
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          {duplicatesData.details.slice(0, 3).map((duplicate: DuplicateDetail) => (
            <div key={duplicate.keyword} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">{duplicate.keyword}</div>
                <div className="text-sm text-muted-foreground">
                  出现在 {duplicate.group_count} 个组中 • 总QPM: {duplicate.total_qpm.toLocaleString()}
                </div>
              </div>
              <Badge variant="destructive">{duplicate.group_count} 个组</Badge>
            </div>
          ))}
          
          {duplicatesData.details.length > 3 && (
            <div className="text-center text-sm text-muted-foreground pt-2">
              还有 {duplicatesData.details.length - 3} 个重复关键词...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>重复关键词管理</CardTitle>
          <div className="flex gap-2">
            {pendingActions.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingActions([])}
                  className="gap-1 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  取消操作 ({pendingActions.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsConfirmDialogOpen(true)}
                  disabled={isPushing}
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  推送 ({pendingActions.length})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('手动刷新重复关键词数据');
                window.dispatchEvent(new CustomEvent('keystore-data-changed', {
                  detail: { action: 'manual-refresh', source: 'duplicates-manager' }
                }));
              }}
              className="gap-1"
            >
              <Eye className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            发现 <strong>{duplicatesData.total_duplicates}</strong> 个重复关键词。
            您可以点击操作按钮选择从特定组中删除关键词。
            {pendingActions.length > 0 && (
              <>
                <br />
                <span className="text-blue-600 font-medium">当前有 {pendingActions.length} 个操作待推送。</span>
              </>
            )}
          </AlertDescription>
        </Alert>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">关键词</TableHead>
                <TableHead className="w-[100px] text-center">出现组数</TableHead>
                <TableHead className="w-[120px] text-right">总QPM</TableHead>
                <TableHead className="min-w-[300px]">所在组</TableHead>
                <TableHead className="w-[120px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicatesData.details.map((duplicate: DuplicateDetail) => (
                <TableRow key={duplicate.keyword} className="hover:bg-muted/50">
                  <TableCell className="font-medium max-w-[200px] truncate" title={duplicate.keyword}>
                    {duplicate.keyword}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive" className="text-xs">
                      {duplicate.group_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {duplicate.total_qpm.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {duplicate.groups.map((group: DuplicateGroup) => (
                        <Badge 
                          key={group.group} 
                          variant="outline" 
                          className="text-xs whitespace-nowrap"
                          title={`${group.group}: QPM ${group.qpm}`}
                        >
                          {group.group} <span className="text-muted-foreground">({group.qpm})</span>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                          {duplicate.groups.map((group: DuplicateGroup) => {
                            const hasPendingRemove = isActionPending(duplicate.keyword, group.group, 'remove');
                            
                            return (
                              <DropdownMenuItem
                                key={group.group}
                                onClick={() => openActionDialog(duplicate.keyword, group.group, 'remove')}
                                disabled={hasPendingRemove}
                                className="flex items-center justify-between gap-2 px-3 py-2"
                              >
                                <span className="text-sm">
                                  {group.group} <span className="text-muted-foreground">(QPM: {group.qpm})</span>
                                </span>
                                <div className={`flex items-center ${
                                  hasPendingRemove ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {hasPendingRemove ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'move' ? '移动关键词' : '删除关键词'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">关键词</div>
                <div className="font-medium">{selectedKeyword}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">源组</div>
                <div className="font-medium">{selectedSourceGroup}</div>
              </div>
              
              {actionType === 'move' && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">目标组</div>
                  <Select value={selectedTargetGroup} onValueChange={setSelectedTargetGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择目标组" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(groupsData)
                        .filter(group => group !== selectedSourceGroup)
                        .map(group => (
                          <SelectItem key={group} value={group}>
                            {group} ({groupsData[group]?.keyword_count || 0} 关键词)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsActionDialogOpen(false);
                    resetSelection();
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={actionType === 'move' ? handleMoveKeyword : handleRemoveKeyword}
                  disabled={isProcessing || (actionType === 'move' && !selectedTargetGroup)}
                  variant={actionType === 'remove' ? 'destructive' : 'default'}
                >
                  {isProcessing ? '处理中...' : (actionType === 'move' ? '移动' : '删除')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* 新增：推送确认弹窗 */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>确认批量操作</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  即将执行 {pendingActions.length} 个操作，请确认后继续。
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={action.type === 'move' ? 'default' : 'destructive'}>
                          {action.type === 'move' ? '移动' : '删除'}
                        </Badge>
                        <span className="font-medium">{action.keyword}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        从组: <span className="font-medium">{action.sourceGroup}</span>
                        {action.type === 'move' && action.targetGroup && (
                          <>
                            {' '}→ 到组: <span className="font-medium">{action.targetGroup}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingActions(prev => prev.filter(a => a.id !== action.id));
                      }}
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(false)}
                  disabled={isPushing}
                >
                  取消
                </Button>
                <Button
                  onClick={executePendingActions}
                  disabled={isPushing || pendingActions.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isPushing ? '正在执行...' : `确认执行 (${pendingActions.length})`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
      </CardContent>
    </Card>
  );
}