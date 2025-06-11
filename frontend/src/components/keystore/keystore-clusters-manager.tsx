// src/components/keystore/keystore-clusters-manager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Layers, AlertCircle, CheckCircle2, Loader2, RefreshCw, Upload, X, MoreVertical, Check, AlertTriangle, Wand2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useKeystoreApi } from "@/hooks/use-keystore-api";

interface KeystoreClustersManagerProps {
  clustersData: Record<string, string[]>;
  groupsData: Record<string, unknown>;
  isLoading?: boolean;
}

interface PendingClusterAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  clusterName: string;
  groupNames?: string[];
  timestamp: number;
}

export function KeystoreClustersManager({
  clustersData,
  groupsData,
  isLoading = false
}: KeystoreClustersManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [clusterName, setClusterName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [localClusters, setLocalClusters] = useState<Record<string, string[]>>({});
  const [validationError, setValidationError] = useState<string>('');
  
  // 新增：缓存操作相关状态
  const [pendingActions, setPendingActions] = useState<PendingClusterAction[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  
  // 自动创建族相关状态
  const [isAutoCreateDialogOpen, setIsAutoCreateDialogOpen] = useState(false);
  const [clusterSuggestions, setClusterSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  
  const { createCluster, updateCluster, deleteCluster, getClusterSuggestions, isProcessing } = useKeystoreApi();

  // 同步外部数据到本地状态
  useEffect(() => {
    setLocalClusters(clustersData);
  }, [clustersData]);

  // 表单验证
  const validateForm = (): boolean => {
    if (!clusterName.trim()) {
      setValidationError('请输入族名');
      return false;
    }
    
    if (clusterName.trim().length < 2) {
      setValidationError('族名至少需要2个字符');
      return false;
    }

    if (selectedGroups.length === 0) {
      setValidationError('请至少选择一个组');
      return false;
    }

    // 检查族名是否已存在（编辑模式下排除当前族）
    const existingClusters = Object.keys(localClusters);
    if (selectedCluster) {
      // 编辑模式：如果族名未改变则允许
      if (clusterName.trim() !== selectedCluster && existingClusters.includes(clusterName.trim())) {
        setValidationError('族名已存在，请使用其他名称');
        return false;
      }
    } else {
      // 创建模式：检查族名是否已存在
      if (existingClusters.includes(clusterName.trim())) {
        setValidationError('族名已存在，请使用其他名称');
        return false;
      }
    }

    setValidationError('');
    return true;
  };

  // 新增：将操作添加到缓存
  const addPendingAction = (action: Omit<PendingClusterAction, 'id' | 'timestamp'>) => {
    const newAction: PendingClusterAction = {
      ...action,
      id: `${action.type}-${action.clusterName}-${Date.now()}`,
      timestamp: Date.now()
    };
    
    // 检查是否已存在相同的操作
    const existingIndex = pendingActions.findIndex(
      existing => existing.clusterName === action.clusterName && existing.type === action.type
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
  const isActionPending = (clusterName: string, type: 'create' | 'update' | 'delete'): boolean => {
    return pendingActions.some(
      action => action.clusterName === clusterName && action.type === type
    );
  };
  
  // 新增：并发执行所有缓存操作
  const executePendingActions = async () => {
    if (pendingActions.length === 0) return;
    
    setIsPushing(true);
    const failedActionsList: PendingClusterAction[] = [];
    
    try {
      console.log(`开始并发执行 ${pendingActions.length} 个操作...`);
      
      // 将所有操作转换为 Promise 数组，实现并发执行
      const actionPromises = pendingActions.map(async (action) => {
        try {
          if (action.type === 'create') {
            await createCluster({
              cluster_name: action.clusterName,
              group_names: action.groupNames || []
            });
          } else if (action.type === 'update') {
            await updateCluster({
              cluster_name: action.clusterName,
              group_names: action.groupNames || []
            });
          } else if (action.type === 'delete') {
            await deleteCluster(action.clusterName);
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
          detail: { action: 'batch-clusters-operations-completed', count: successCount }
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

  const handleCreateCluster = async () => {
    if (!validateForm()) {
      return;
    }

    // 添加到缓存而不是立即执行
    addPendingAction({
      type: 'create',
      clusterName: clusterName.trim(),
      groupNames: [...selectedGroups]
    });
    
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleUpdateCluster = async () => {
    if (!selectedCluster || !validateForm()) {
      return;
    }

    // 添加到缓存而不是立即执行
    addPendingAction({
      type: 'update',
      clusterName: selectedCluster,
      groupNames: [...selectedGroups]
    });
    
    resetForm();
    setIsEditDialogOpen(false);
  };

  const handleDeleteCluster = async (clusterName: string) => {
    // 添加到缓存而不是立即执行
    addPendingAction({
      type: 'delete',
      clusterName: clusterName
    });
  };

  const resetForm = () => {
    setClusterName('');
    setSelectedGroups([]);
    setSelectedCluster(null);
    setValidationError('');
  };

  const openEditDialog = (clusterName: string, groupNames: string[]) => {
    setSelectedCluster(clusterName);
    setClusterName(clusterName);
    setSelectedGroups([...groupNames]);
    setValidationError('');
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // 自动创建族相关函数
  const openAutoCreateDialog = async () => {
    setIsAutoCreateDialogOpen(true);
    setIsLoadingSuggestions(true);
    setSelectedSuggestions([]);
    
    try {
      const result = await getClusterSuggestions();
      if (result.success) {
        setClusterSuggestions(result.cluster_suggestions || []);
      } else {
        console.error('获取族建议失败:', result.error);
        setClusterSuggestions([]);
      }
    } catch (error) {
      console.error('获取族建议时出错:', error);
      setClusterSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionToggle = (suggestionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuggestions(prev => [...prev, suggestionId]);
    } else {
      setSelectedSuggestions(prev => prev.filter(id => id !== suggestionId));
    }
  };

  const handleAutoCreateClusters = async () => {
    if (selectedSuggestions.length === 0) {
      return;
    }

    for (const suggestionId of selectedSuggestions) {
      const suggestion = clusterSuggestions.find(s => s.suggested_cluster_name === suggestionId);
      if (suggestion) {
        // 添加到缓存操作中
        addPendingAction({
          type: 'create',
          clusterName: suggestion.suggested_cluster_name,
          groupNames: suggestion.groups
        });
      }
    }

    setIsAutoCreateDialogOpen(false);
    setSelectedSuggestions([]);
  };

  const getUnassignedGroups = () => {
    const assignedGroups = new Set<string>();
    Object.values(localClusters).forEach(groups => {
      groups.forEach(group => assignedGroups.add(group));
    });
    
    return Object.keys(groupsData).filter(group => !assignedGroups.has(group));
  };

  const getAvailableGroups = () => {
    if (selectedCluster) {
      // 编辑模式：显示当前族的组 + 未分配的组
      const currentClusterGroups = localClusters[selectedCluster] || [];
      const unassignedGroups = getUnassignedGroups();
      return [...currentClusterGroups, ...unassignedGroups];
    } else {
      // 创建模式：只显示未分配的组
      return getUnassignedGroups();
    }
  };

  const handleGroupToggle = (groupName: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups(prev => [...prev, groupName]);
    } else {
      setSelectedGroups(prev => prev.filter(g => g !== groupName));
    }
    // 清除验证错误
    if (validationError) {
      setValidationError('');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词族管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableGroups = getAvailableGroups();
  const unassignedGroups = getUnassignedGroups();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>关键词族管理</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              创建和管理关键词族，将相关的关键词组组织在一起
            </p>
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
                console.log('手动刷新族管理数据');
                window.dispatchEvent(new CustomEvent('keystore-data-changed', {
                  detail: { action: 'manual-refresh', source: 'clusters-manager' }
                }));
              }}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button onClick={openCreateDialog} disabled={availableGroups.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              创建族
            </Button>
            <Button 
              variant="outline" 
              onClick={openAutoCreateDialog}
              disabled={Object.keys(groupsData).length < 2}
              className="gap-1"
            >
              <Wand2 className="h-4 w-4" />
              自动创建
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
        
        {/* 创建族对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>创建关键词族</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cluster-name">族名 *</Label>
                  <Input
                    id="cluster-name"
                    value={clusterName}
                    onChange={(e) => {
                      setClusterName(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="输入族名（如：品牌词、行业词等）"
                    className={validationError ? "border-destructive" : ""}
                  />
                </div>
                
                <div>
                  <Label>选择组 * ({selectedGroups.length}/{availableGroups.length})</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {availableGroups.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>暂无可分配的组</p>
                        <p className="text-xs">所有组都已分配到其他族中</p>
                      </div>
                    ) : (
                      availableGroups.map(groupName => (
                        <div key={groupName} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${groupName}`}
                            checked={selectedGroups.includes(groupName)}
                            onCheckedChange={(checked) => handleGroupToggle(groupName, !!checked)}
                          />
                          <Label htmlFor={`group-${groupName}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <span>{groupName}</span>
                              <span className="text-muted-foreground text-xs">
                                {groupsData[groupName]?.keyword_count || 0} 关键词
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isProcessing}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreateCluster}
                    disabled={isProcessing || availableGroups.length === 0}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        创建族
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        {Object.keys(localClusters).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-2" />
            <p>暂无关键词族</p>
            <p className="text-sm">创建族来组织您的关键词组</p>
            {availableGroups.length > 0 && (
              <p className="text-xs mt-2 text-primary">
                当前有 {availableGroups.length} 个组可以分配
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(localClusters).map(([clusterName, groupNames]) => {
              const totalKeywords = groupNames.reduce((sum, groupName) => {
                return sum + (groupsData[groupName]?.keyword_count || 0);
              }, 0);
              
              const totalQPM = groupNames.reduce((sum, groupName) => {
                return sum + (groupsData[groupName]?.total_qpm || 0);
              }, 0);
              
              const avgDiff = groupNames.length > 0 
                ? groupNames.reduce((sum, groupName) => {
                    return sum + (groupsData[groupName]?.avg_diff || 0);
                  }, 0) / groupNames.length
                : 0;
              
              return (
                <div key={clusterName} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        {clusterName}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {groupNames.length}
                          </Badge>
                          个组
                        </span>
                        <span>{totalKeywords.toLocaleString()} 个关键词</span>
                        <span>总QPM: {totalQPM.toLocaleString()}</span>
                        <span>平均难度: {avgDiff.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[150px]">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(clusterName, groupNames)}
                            disabled={isActionPending(clusterName, 'update')}
                            className={`flex items-center gap-2 ${
                              isActionPending(clusterName, 'update') ? 'text-green-600' : 'text-blue-600'
                            }`}
                          >
                            {isActionPending(clusterName, 'update') ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                            {isActionPending(clusterName, 'update') ? '已添加更新' : '编辑族'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCluster(clusterName)}
                            disabled={isActionPending(clusterName, 'delete')}
                            className={`flex items-center gap-2 ${
                              isActionPending(clusterName, 'delete') ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {isActionPending(clusterName, 'delete') ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            {isActionPending(clusterName, 'delete') ? '已添加删除' : '删除族'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* 编辑对话框保持不变，但移除trigger */}
                      <Dialog open={isEditDialogOpen && selectedCluster === clusterName} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>编辑关键词族</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-cluster-name">族名</Label>
                              <Input
                                id="edit-cluster-name"
                                value={clusterName}
                                disabled
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                族名创建后不可修改
                              </p>
                            </div>
                            
                            <div>
                              <Label>选择组 * ({selectedGroups.length}/{getAvailableGroups().length})</Label>
                              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                                {getAvailableGroups().map(groupName => (
                                  <div key={groupName} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-group-${groupName}`}
                                      checked={selectedGroups.includes(groupName)}
                                      onCheckedChange={(checked) => handleGroupToggle(groupName, !!checked)}
                                    />
                                    <Label htmlFor={`edit-group-${groupName}`} className="flex-1 cursor-pointer">
                                      <div className="flex justify-between items-center">
                                        <span>{groupName}</span>
                                        <span className="text-muted-foreground text-xs">
                                          {groupsData[groupName]?.keyword_count || 0} 关键词
                                        </span>
                                      </div>
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {validationError && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{validationError}</AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsEditDialogOpen(false);
                                  resetForm();
                                }}
                                disabled={isProcessing}
                              >
                                取消
                              </Button>
                              <Button
                                onClick={handleUpdateCluster}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    更新中...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    更新族
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {groupNames.map(groupName => (
                      <Badge key={groupName} variant="secondary" className="text-xs">
                        {groupName}
                        <span className="ml-1 text-muted-foreground">
                          ({groupsData[groupName]?.keyword_count || 0})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* 未分配的组 */}
        {unassignedGroups.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">未分配的组 ({unassignedGroups.length})</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedGroups.map(groupName => (
                <Badge key={groupName} variant="outline" className="text-xs">
                  {groupName}
                  <span className="ml-1 text-muted-foreground">
                    ({groupsData[groupName]?.keyword_count || 0})
                  </span>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              这些组暂未分配到任何族中，您可以创建新族来管理它们。
            </p>
          </div>
        )}
        
        {/* 自动创建族弹窗 */}
        <Dialog open={isAutoCreateDialogOpen} onOpenChange={setIsAutoCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>自动创建族建议</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">正在分析组间重复关键词...</span>
                </div>
              ) : clusterSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                  <p>未发现可以自动创建族的组合</p>
                  <p className="text-sm">组之间需要有共同的关键词才能生成族建议</p>
                </div>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      系统分析了组间的重复关键词，发现 <strong>{clusterSuggestions.length}</strong> 个族建议。
                      选择您希望创建的族，点击确认后将添加到待操作列表中。
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    {clusterSuggestions.map((suggestion, index) => (
                      <div key={suggestion.suggested_cluster_name} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`suggestion-${suggestion.suggested_cluster_name}`}
                            checked={selectedSuggestions.includes(suggestion.suggested_cluster_name)}
                            onCheckedChange={(checked) => handleSuggestionToggle(suggestion.suggested_cluster_name, !!checked)}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{suggestion.suggested_cluster_name}</h4>
                              <Badge variant="secondary">
                                置信度: {Math.round(suggestion.confidence)}%
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">包含组数:</span>
                                <span className="ml-1 font-medium">{suggestion.group_count}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">共享关键词:</span>
                                <span className="ml-1 font-medium">{suggestion.total_shared_keywords}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">总关键词:</span>
                                <span className="ml-1 font-medium">{suggestion.total_keywords}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">重叠率:</span>
                                <span className="ml-1 font-medium">
                                  {((suggestion.total_shared_keywords / suggestion.total_keywords) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">包含的组:</div>
                              <div className="flex flex-wrap gap-1">
                                {suggestion.groups.map((groupName: string) => (
                                  <Badge key={groupName} variant="outline" className="text-xs">
                                    {groupName}
                                    <span className="ml-1 text-muted-foreground">
                                      ({suggestion.group_stats.find((g: any) => g.group_name === groupName)?.keyword_count || 0})
                                    </span>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            {suggestion.shared_keywords_sample.length > 0 && (
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">
                                  共享关键词示例 (显示前10个):
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                  {suggestion.shared_keywords_sample.join(', ')}
                                  {suggestion.total_shared_keywords > 10 && (
                                    <span> ... 等{suggestion.total_shared_keywords}个</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setIsAutoCreateDialogOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleAutoCreateClusters}
                      disabled={selectedSuggestions.length === 0}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      确认创建 ({selectedSuggestions.length})
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
                        <Badge variant={
                          action.type === 'create' ? 'default' : 
                          action.type === 'update' ? 'secondary' : 'destructive'
                        }>
                          {action.type === 'create' ? '创建' : 
                           action.type === 'update' ? '更新' : '删除'}
                        </Badge>
                        <span className="font-medium">{action.clusterName}</span>
                        {action.groupNames && action.groupNames.length > 0 && (
                          <>
                            <span className="text-muted-foreground">包含</span>
                            <span className="font-medium text-primary">{action.groupNames.length} 个组</span>
                          </>
                        )}
                      </div>
                      {action.groupNames && action.groupNames.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          组: {action.groupNames.join(', ')}
                        </div>
                      )}
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