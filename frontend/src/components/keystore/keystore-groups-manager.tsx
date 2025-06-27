// src/components/keystore/keystore-groups-manager.tsx
"use client";

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Eye, Users, MoreVertical, RefreshCw, Upload, X, Check, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useKeystoreApi } from "@/hooks/use-keystore-api";
import { toast } from 'react-toastify';

interface KeystoreGroupsManagerProps {
  groupsData: Record<string, unknown>;
  clustersData: Record<string, string[]>;
  isLoading?: boolean;
}

interface PendingAction {
  id: string;
  type: 'rename';
  groupName: string;
  newName: string;
  timestamp: number;
}

// 辅助函数：截断关键词文本
function truncateKeyword(keyword: string, maxLength: number = 40): string {
  if (keyword.length <= maxLength) {
    return keyword;
  }
  return keyword.substring(0, maxLength) + '...';
}

// 关键词显示组件，带tooltip
function KeywordCell({ keyword }: { keyword: string }) {
  const isLong = keyword.length > 40;
  const displayText = truncateKeyword(keyword);
  
  if (!isLong) {
    return <span className="break-words">{keyword}</span>;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="break-words cursor-help hover:text-primary transition-colors">
          {displayText}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="break-words">{keyword}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const KeystoreGroupsManager = memo(function KeystoreGroupsManager({
  groupsData,
  clustersData,
  isLoading = false
}: KeystoreGroupsManagerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [renameGroupName, setRenameGroupName] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // 新增：缓存操作相关状态
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [openDropdownGroup, setOpenDropdownGroup] = useState<string | null>(null);
  
  // 分页控制
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 50; // 每页显示50个组，减少DOM节点数量
  
  const { renameGroup, isProcessing } = useKeystoreApi();
  
  // 添加清理状态的函数
  const resetDetailState = () => {
    setSelectedGroup(null);
    setIsDetailDialogOpen(false);
    setOpenDropdownGroup(null); // 关闭所有dropdown
  };
  
  // 确保键盘事件正确处理
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDetailDialogOpen) {
        resetDetailState();
      }
    };
    
    if (isDetailDialogOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDetailDialogOpen]);

  // 新增：将操作添加到缓存
  const addPendingAction = (action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const newAction: PendingAction = {
      ...action,
      id: `${action.type}-${action.groupName}-${action.newName}-${Date.now()}`,
      timestamp: Date.now()
    };
    
    // 检查是否已存在相同的操作
    const existingIndex = pendingActions.findIndex(
      existing => existing.groupName === action.groupName && existing.type === action.type
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
  const isActionPending = (groupName: string, type: 'rename'): boolean => {
    return pendingActions.some(
      action => action.groupName === groupName && action.type === type
    );
  };

  const handleRenameGroup = useCallback(async () => {
    if (!selectedGroup || !renameGroupName.trim()) {
      toast.error('请输入有效的组名');
      return;
    }

    // 添加到缓存而不是立即执行
    addPendingAction({
      type: 'rename',
      groupName: selectedGroup,
      newName: renameGroupName.trim()
    });
    
    setIsRenameDialogOpen(false);
    setSelectedGroup(null);
    setRenameGroupName('');
  }, [selectedGroup, renameGroupName, addPendingAction]);

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
          if (action.type === 'rename') {
            await renameGroup({
              old_name: action.groupName,
              new_name: action.newName
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
          if (result.status === 'fulfilled' && !result.value.success) {
            failedActionsList.push(result.value.action);
          }
        }
      });
      
      // 清除成功的操作，保留失败的操作
      setPendingActions(failedActionsList);
      
      console.log(`并发执行完成: 成功 ${successCount} 个，失败 ${failedActionsList.length} 个`);
      
      if (successCount > 0) {
        // 触发数据刷新
        window.dispatchEvent(new CustomEvent('keystore-data-changed', {
          detail: { action: 'batch-groups-operations-completed', count: successCount }
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

  // 缓存集群映射以提高性能
  const clusterMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [clusterName, groupNames] of Object.entries(clustersData)) {
      groupNames.forEach(groupName => map.set(groupName, clusterName));
    }
    return map;
  }, [clustersData]);

  const getClusterForGroup = useCallback((groupName: string): string | null => {
    return clusterMap.get(groupName) || null;
  }, [clusterMap]);
  
  // 新增：批量选择相关函数
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedGroups(Object.keys(groupsData));
    } else {
      setSelectedGroups([]);
    }
  }, [groupsData]);
  
  const handleGroupSelect = useCallback((groupName: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups(prev => [...prev, groupName]);
    } else {
      setSelectedGroups(prev => prev.filter(g => g !== groupName));
    }
  }, []);
  
  // 缓存选择状态计算
  const selectionState = useMemo(() => {
    const totalGroups = Object.keys(groupsData).length;
    const selectedCount = selectedGroups.length;
    return {
      isAllSelected: selectedCount > 0 && selectedCount === totalGroups,
      isPartiallySelected: selectedCount > 0 && selectedCount < totalGroups
    };
  }, [selectedGroups.length, groupsData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词组管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(groupsData).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词组管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2" />
            <p>暂无关键词组数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 缓存排序后的组数据
  const groupEntries = useMemo(() => {
    return Object.entries(groupsData).sort((a, b) => b[1].total_qpm - a[1].total_qpm);
  }, [groupsData]);

  // 分页数据
  const paginatedGroups = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return groupEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [groupEntries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(groupEntries.length / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>关键词组管理</CardTitle>
            {groupEntries.length > itemsPerPage && (
              <p className="text-sm text-muted-foreground mt-1">
                显示 {currentPage * itemsPerPage + 1}-{Math.min((currentPage + 1) * itemsPerPage, groupEntries.length)} / 共 {groupEntries.length} 个组
              </p>
            )}
          </div>
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
                console.log('手动刷新组管理数据');
                window.dispatchEvent(new CustomEvent('keystore-data-changed', {
                  detail: { action: 'manual-refresh', source: 'groups-manager' }
                }));
              }}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pendingActions.length > 0 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              当前有 <strong>{pendingActions.length}</strong> 个操作待推送。
              <span className="text-blue-600 font-medium ml-1">
                点击推送按钮执行批量操作。
              </span>
            </AlertDescription>
          </Alert>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectionState.isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="选择所有组"
                  className={selectionState.isPartiallySelected ? 'data-[state=checked]:bg-primary data-[state=checked]:border-primary opacity-50' : ''}
                />
              </TableHead>
              <TableHead>组名</TableHead>
              <TableHead>所属族</TableHead>
              <TableHead>关键词数</TableHead>
              <TableHead>总QPM</TableHead>
              <TableHead>平均难度</TableHead>
              <TableHead className="w-[120px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGroups.map(([groupName, groupInfo]) => {
              const clusterName = getClusterForGroup(groupName);
              const hasPendingRename = isActionPending(groupName, 'rename');
              const isSelected = selectedGroups.includes(groupName);
              
              return (
                <TableRow key={groupName} className={isSelected ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleGroupSelect(groupName, !!checked)}
                      aria-label={`选择组 ${groupName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{groupName}</TableCell>
                  <TableCell>
                    {clusterName ? (
                      <Badge variant="secondary">{clusterName}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">未分配</span>
                    )}
                  </TableCell>
                  <TableCell>{groupInfo.keyword_count}</TableCell>
                  <TableCell>{groupInfo.total_qpm.toLocaleString()}</TableCell>
                  <TableCell>{groupInfo.avg_diff.toFixed(1)}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu 
                        open={openDropdownGroup === groupName} 
                        onOpenChange={(open) => setOpenDropdownGroup(open ? groupName : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[150px]">
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownGroup(null); // 先关闭dropdown
                              setSelectedGroup(groupName);
                              setIsDetailDialogOpen(true);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownGroup(null); // 先关闭dropdown
                              setSelectedGroup(groupName);
                              setRenameGroupName(groupName);
                              setIsRenameDialogOpen(true);
                            }}
                            disabled={hasPendingRename}
                            className={`flex items-center gap-2 ${
                              hasPendingRename ? 'text-green-600' : 'text-blue-600'
                            }`}
                          >
                            {hasPendingRename ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                            {hasPendingRename ? '已添加重命名' : '重命名'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {/* 分页控制 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              第 {currentPage + 1} 页，共 {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
              >
                首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage === totalPages - 1}
              >
                末页
              </Button>
            </div>
          </div>
        )}
        
        {/* 批量操作区域 */}
        {selectedGroups.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border-dashed border-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                已选择 {selectedGroups.length} 个组
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGroups([])}
                >
                  清除选择
                </Button>
                {/* 这里可以添加批量操作按钮 */}
              </div>
            </div>
          </div>
        )}

        {/* 推送确认弹窗 */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>确认批量操作</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  即将执行 <strong>{pendingActions.length}</strong> 个操作，请确认后继续。
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          重命名
                        </Badge>
                        <span className="font-medium">{action.groupName}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-primary">{action.newName}</span>
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
        
        {/* 组详情弹窗保持不变，但移除trigger */}
        <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetDetailState(); // 关闭弹窗时清除所有相关状态
          } else {
            setIsDetailDialogOpen(open);
          }
        }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>组详情: {selectedGroup}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedGroup && groupsData[selectedGroup] && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">关键词数量</div>
                      <div className="text-lg font-bold">{groupsData[selectedGroup].keyword_count}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">总QPM</div>
                      <div className="text-lg font-bold">{groupsData[selectedGroup].total_qpm.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">平均难度</div>
                      <div className="text-lg font-bold">{groupsData[selectedGroup].avg_diff.toFixed(1)}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">最高QPM</div>
                      <div className="text-lg font-bold">{groupsData[selectedGroup].max_qpm.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">关键词列表</h4>
                    <div className="max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>关键词</TableHead>
                            <TableHead>QPM</TableHead>
                            <TableHead>难度</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupsData[selectedGroup].data.map((keyword: unknown, index: number) => {const kw = keyword as Record<string, unknown>; return (
                            <TableRow key={index}>
                              <TableCell className="max-w-xs">
                                <KeywordCell keyword={String(kw.Keywords || kw.keyword || '')} />
                              </TableCell>
                              <TableCell>{kw.QPM || kw.qpm}</TableCell>
                              <TableCell>{kw.DIFF || kw.diff}</TableCell>
                            </TableRow>
                          );})}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* 重命名弹窗保持不变，但移除trigger */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重命名组</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-group-name">新组名</Label>
                <Input
                  id="new-group-name"
                  value={renameGroupName}
                  onChange={(e) => setRenameGroupName(e.target.value)}
                  placeholder="输入新的组名"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRenameDialogOpen(false);
                    setSelectedGroup(null);
                    setRenameGroupName('');
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleRenameGroup}
                  disabled={isProcessing}
                >
                  {isProcessing ? '处理中...' : '确认重命名'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});