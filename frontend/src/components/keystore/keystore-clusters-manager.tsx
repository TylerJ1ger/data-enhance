// src/components/keystore/keystore-clusters-manager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Layers, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useKeystoreApi } from "@/hooks/use-keystore-api";
import { toast } from 'react-toastify';

interface KeystoreClustersManagerProps {
  clustersData: Record<string, string[]>;
  groupsData: Record<string, any>;
  isLoading?: boolean;
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
  
  const { createCluster, updateCluster, deleteCluster, isProcessing } = useKeystoreApi();

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

  const handleCreateCluster = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const result = await createCluster({
        cluster_name: clusterName.trim(),
        group_names: selectedGroups
      });

      if (result?.success) {
        // 立即更新本地状态，提供即时反馈
        setLocalClusters(prev => ({
          ...prev,
          [clusterName.trim()]: [...selectedGroups]
        }));

        resetForm();
        setIsCreateDialogOpen(false);
        
        // 成功提示
        toast.success(`族 "${clusterName.trim()}" 创建成功！包含 ${selectedGroups.length} 个组`);
      }
    } catch (error) {
      console.error('创建族失败:', error);
      // 错误处理已在 hook 中完成
    }
  };

  const handleUpdateCluster = async () => {
    if (!selectedCluster || !validateForm()) {
      return;
    }

    try {
      const result = await updateCluster({
        cluster_name: selectedCluster,
        group_names: selectedGroups
      });

      if (result?.success) {
        // 立即更新本地状态
        setLocalClusters(prev => ({
          ...prev,
          [selectedCluster]: [...selectedGroups]
        }));

        resetForm();
        setIsEditDialogOpen(false);
        
        // 成功提示
        toast.success(`族 "${selectedCluster}" 更新成功！`);
      }
    } catch (error) {
      console.error('更新族失败:', error);
    }
  };

  const handleDeleteCluster = async (clusterName: string) => {
    if (!confirm(`确定要删除族 "${clusterName}" 吗？删除后该族下的组将变为未分配状态。`)) {
      return;
    }

    try {
      const result = await deleteCluster(clusterName);
      
      if (result?.success) {
        // 立即更新本地状态
        setLocalClusters(prev => {
          const newClusters = { ...prev };
          delete newClusters[clusterName];
          return newClusters;
        });

        toast.success(`族 "${clusterName}" 已删除`);
      }
    } catch (error) {
      console.error('删除族失败:', error);
    }
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} disabled={availableGroups.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                创建族
              </Button>
            </DialogTrigger>
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
        </div>
      </CardHeader>
      <CardContent>
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
                      <Dialog open={isEditDialogOpen && selectedCluster === clusterName} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(clusterName, groupNames)}
                            disabled={isProcessing}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
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
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCluster(clusterName)}
                        disabled={isProcessing}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
      </CardContent>
    </Card>
  );
}