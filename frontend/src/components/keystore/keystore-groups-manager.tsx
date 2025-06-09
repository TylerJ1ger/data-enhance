// src/components/keystore/keystore-groups-manager.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Eye, Users, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useKeystoreApi } from "@/hooks/use-keystore-api";
import { toast } from 'react-toastify';

interface KeystoreGroupsManagerProps {
  groupsData: Record<string, any>;
  clustersData: Record<string, string[]>;
  isLoading?: boolean;
}

export function KeystoreGroupsManager({
  groupsData,
  clustersData,
  isLoading = false
}: KeystoreGroupsManagerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [renameGroupName, setRenameGroupName] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { renameGroup, isProcessing } = useKeystoreApi();

  const handleRenameGroup = async () => {
    if (!selectedGroup || !renameGroupName.trim()) {
      toast.error('请输入有效的组名');
      return;
    }

    try {
      await renameGroup({
        old_name: selectedGroup,
        new_name: renameGroupName.trim()
      });
      
      setIsRenameDialogOpen(false);
      setSelectedGroup(null);
      setRenameGroupName('');
    } catch (error) {
      console.error('重命名组失败:', error);
    }
  };

  const getClusterForGroup = (groupName: string): string | null => {
    for (const [clusterName, groupNames] of Object.entries(clustersData)) {
      if (groupNames.includes(groupName)) {
        return clusterName;
      }
    }
    return null;
  };

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

  const groupEntries = Object.entries(groupsData).sort((a, b) => b[1].total_qpm - a[1].total_qpm);

  return (
    <Card>
      <CardHeader>
        <CardTitle>关键词组管理</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>组名</TableHead>
              <TableHead>所属族</TableHead>
              <TableHead>关键词数</TableHead>
              <TableHead>总QPM</TableHead>
              <TableHead>平均难度</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupEntries.map(([groupName, groupInfo]) => {
              const clusterName = getClusterForGroup(groupName);
              
              return (
                <TableRow key={groupName}>
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
                    <div className="flex gap-2">
                      <Dialog open={isDetailDialogOpen && selectedGroup === groupName} onOpenChange={setIsDetailDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGroup(groupName)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>组详情: {groupName}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-muted p-3 rounded">
                                <div className="text-sm text-muted-foreground">关键词数量</div>
                                <div className="text-lg font-bold">{groupInfo.keyword_count}</div>
                              </div>
                              <div className="bg-muted p-3 rounded">
                                <div className="text-sm text-muted-foreground">总QPM</div>
                                <div className="text-lg font-bold">{groupInfo.total_qpm.toLocaleString()}</div>
                              </div>
                              <div className="bg-muted p-3 rounded">
                                <div className="text-sm text-muted-foreground">平均难度</div>
                                <div className="text-lg font-bold">{groupInfo.avg_diff.toFixed(1)}</div>
                              </div>
                              <div className="bg-muted p-3 rounded">
                                <div className="text-sm text-muted-foreground">最高QPM</div>
                                <div className="text-lg font-bold">{groupInfo.max_qpm.toLocaleString()}</div>
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
                                    {groupInfo.data.map((keyword: any, index: number) => (
                                      <TableRow key={index}>
                                        <TableCell>{keyword.Keywords || keyword.keyword}</TableCell>
                                        <TableCell>{keyword.QPM || keyword.qpm}</TableCell>
                                        <TableCell>{keyword.DIFF || keyword.diff}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isRenameDialogOpen && selectedGroup === groupName} onOpenChange={setIsRenameDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(groupName);
                              setRenameGroupName(groupName);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
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
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}