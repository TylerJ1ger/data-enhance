// src/components/keystore/keystore-duplicates-manager.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Move, Trash2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useKeystoreApi } from "@/hooks/use-keystore-api";

interface KeystoreDuplicatesManagerProps {
  duplicatesData: any;
  groupsData: Record<string, any>;
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
      await removeKeyword({
        keyword: selectedKeyword,
        group: selectedSourceGroup
      });
      
      setIsActionDialogOpen(false);
      resetSelection();
    } catch (error) {
      console.error('删除关键词失败:', error);
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
          {duplicatesData.details.slice(0, 3).map((duplicate: any) => (
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
        <CardTitle>重复关键词管理</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            发现 <strong>{duplicatesData.total_duplicates}</strong> 个重复关键词。
            您可以将它们移动到其他组或从当前组中删除。
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>关键词</TableHead>
              <TableHead>出现组数</TableHead>
              <TableHead>总QPM</TableHead>
              <TableHead>所在组</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {duplicatesData.details.map((duplicate: any) => (
              <TableRow key={duplicate.keyword}>
                <TableCell className="font-medium">{duplicate.keyword}</TableCell>
                <TableCell>
                  <Badge variant="destructive">{duplicate.group_count}</Badge>
                </TableCell>
                <TableCell>{duplicate.total_qpm.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {duplicate.groups.map((group: any) => (
                      <Badge key={group.group} variant="outline" className="text-xs">
                        {group.group} ({group.qpm})
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {duplicate.groups.map((group: any) => (
                      <div key={group.group} className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionDialog(duplicate.keyword, group.group, 'move')}
                          title={`从 ${group.group} 移动`}
                        >
                          <Move className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionDialog(duplicate.keyword, group.group, 'remove')}
                          title={`从 ${group.group} 删除`}
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