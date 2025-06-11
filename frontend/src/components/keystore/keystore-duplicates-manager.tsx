// src/components/keystore/keystore-duplicates-manager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Move, Trash2, Eye } from "lucide-react";
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

  const handleMoveKeyword = async () => {
    if (!selectedKeyword || !selectedSourceGroup || !selectedTargetGroup) {
      return;
    }

    try {
      await moveKeyword({
        keyword: selectedKeyword,
        source_group: selectedSourceGroup,
        target_group: selectedTargetGroup
      });
      
      setIsActionDialogOpen(false);
      resetSelection();
    } catch (error) {
      console.error('移动关键词失败:', error);
    }
  };

  const handleRemoveKeyword = async () => {
    if (!selectedKeyword || !selectedSourceGroup) {
      return;
    }

    try {
      console.log(`开始删除关键词 "${selectedKeyword}" 从组 "${selectedSourceGroup}"`);
      
      const result = await removeKeyword({
        keyword: selectedKeyword,
        group: selectedSourceGroup
      });
      
      console.log('删除关键词API结果:', result);
      
      setIsActionDialogOpen(false);
      resetSelection();
      
      console.log(`关键词 "${selectedKeyword}" 已从组 "${selectedSourceGroup}" 删除完成`);
      
      // 等待一段时间确保状态已更新，然后强制触发父组件刷新
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 强制重新获取数据
      if (result.success) {
        console.log('删除成功，强制触发父组件重新渲染');
        
        // 通过触发一个自定义事件来强制父组件刷新
        window.dispatchEvent(new CustomEvent('keystore-data-changed', {
          detail: { action: 'keyword-deleted', keyword: selectedKeyword, group: selectedSourceGroup }
        }));
      }
      
    } catch (error) {
      console.error('删除关键词失败:', error);
      // 错误处理已在 useKeystoreApi 中处理，这里不需要额外操作
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
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            发现 <strong>{duplicatesData.total_duplicates}</strong> 个重复关键词。
            您可以将它们移动到其他组或从当前组中删除。
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
                <TableHead className="w-[200px] text-center">操作</TableHead>
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
                    <div className="flex flex-wrap gap-1 justify-center">
                      {duplicate.groups.map((group: DuplicateGroup) => (
                        <div key={group.group} className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openActionDialog(duplicate.keyword, group.group, 'move')}
                            title={`从 ${group.group} 移动关键词`}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                          >
                            <Move className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openActionDialog(duplicate.keyword, group.group, 'remove')}
                            title={`从 ${group.group} 删除关键词`}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
      </CardContent>
    </Card>
  );
}