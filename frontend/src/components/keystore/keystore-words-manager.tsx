// src/components/keystore/keystore-words-manager.tsx
"use client";

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Eye, MoreVertical, RefreshCw, FileText, X, Trash2, Move } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KeywordInfo {
  keyword: string;
  group_name: string;
  cluster_name?: string;
  qpm: number;
  diff: number;
}

interface GroupInfo {
  keyword_count: number;
  total_qpm: number;
  avg_qpm: number;
  avg_diff: number;
  max_qpm: number;
  data: any[];
}

interface KeystoreWordsManagerProps {
  groupsData: Record<string, GroupInfo>;
  clustersData: Record<string, string[]>;
  isLoading?: boolean;
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

export const KeystoreWordsManager = memo(function KeystoreWordsManager({
  groupsData,
  clustersData,
  isLoading = false
}: KeystoreWordsManagerProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordInfo | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [openDropdownKeyword, setOpenDropdownKeyword] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetGroup, setTargetGroup] = useState<string>('');
  
  // 分页控制
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 50; // 每页显示50个关键词
  
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
  
  // 将所有关键词扁平化处理
  const allKeywords = useMemo(() => {
    const keywords: KeywordInfo[] = [];
    
    Object.entries(groupsData).forEach(([groupName, groupInfo]) => {
      const clusterName = getClusterForGroup(groupName);
      (groupInfo as GroupInfo).data.forEach((keywordData: any) => {
        keywords.push({
          keyword: String(keywordData.Keywords || keywordData.keyword || ''),
          group_name: groupName,
          cluster_name: clusterName || undefined,
          qpm: Number(keywordData.QPM || keywordData.qpm || 0),
          diff: Number(keywordData.DIFF || keywordData.diff || 0)
        });
      });
    });
    
    return keywords.sort((a, b) => b.qpm - a.qpm); // 按QPM降序排列
  }, [groupsData, getClusterForGroup]);

  // 筛选和搜索逻辑
  const filteredKeywords = useMemo(() => {
    let filtered = allKeywords;
    
    // 搜索关键词
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(kw => 
        kw.keyword.toLowerCase().includes(searchLower) ||
        kw.group_name.toLowerCase().includes(searchLower) ||
        (kw.cluster_name && kw.cluster_name.toLowerCase().includes(searchLower))
      );
    }
    
    // 按组筛选
    if (selectedGroup) {
      filtered = filtered.filter(kw => kw.group_name === selectedGroup);
    }
    
    // 按族筛选
    if (selectedCluster) {
      filtered = filtered.filter(kw => kw.cluster_name === selectedCluster);
    }
    
    return filtered;
  }, [allKeywords, searchTerm, selectedGroup, selectedCluster]);

  // 分页数据
  const paginatedKeywords = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return filteredKeywords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredKeywords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredKeywords.length / itemsPerPage);

  // 获取所有组名和族名用于筛选
  const groupNames = useMemo(() => {
    return Array.from(new Set(allKeywords.map(kw => kw.group_name))).sort();
  }, [allKeywords]);

  const clusterNames = useMemo(() => {
    return Array.from(new Set(allKeywords.map(kw => kw.cluster_name).filter(Boolean))).sort();
  }, [allKeywords]);

  // 批量选择相关函数
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedKeywords(paginatedKeywords.map(kw => kw.keyword));
    } else {
      setSelectedKeywords([]);
    }
  }, [paginatedKeywords]);
  
  const handleKeywordSelect = useCallback((keyword: string, checked: boolean) => {
    if (checked) {
      setSelectedKeywords(prev => [...prev, keyword]);
    } else {
      setSelectedKeywords(prev => prev.filter(k => k !== keyword));
    }
  }, []);
  
  // 缓存选择状态计算
  const selectionState = useMemo(() => {
    const currentPageKeywords = paginatedKeywords.map(kw => kw.keyword);
    const selectedInCurrentPage = selectedKeywords.filter(k => currentPageKeywords.includes(k));
    return {
      isAllSelected: selectedInCurrentPage.length > 0 && selectedInCurrentPage.length === currentPageKeywords.length,
      isPartiallySelected: selectedInCurrentPage.length > 0 && selectedInCurrentPage.length < currentPageKeywords.length
    };
  }, [selectedKeywords, paginatedKeywords]);

  // 重置筛选和搜索
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGroup('');
    setSelectedCluster('');
    setCurrentPage(0);
    setSelectedKeywords([]);
  };

  // 批量删除关键词
  const handleBatchDelete = () => {
    console.log('批量删除关键词:', selectedKeywords);
    // 这里应该调用API删除关键词
    // 暂时模拟删除操作
    setSelectedKeywords([]);
    setIsDeleteDialogOpen(false);
    // 触发数据刷新事件
    window.dispatchEvent(new CustomEvent('keystore-data-changed', {
      detail: { action: 'batch-delete', keywords: selectedKeywords }
    }));
  };

  // 批量移动关键词到其他组
  const handleBatchMove = () => {
    if (!targetGroup) return;
    console.log('批量移动关键词到组:', targetGroup, selectedKeywords);
    // 这里应该调用API移动关键词
    // 暂时模拟移动操作
    setSelectedKeywords([]);
    setIsMoveDialogOpen(false);
    setTargetGroup('');
    // 触发数据刷新事件
    window.dispatchEvent(new CustomEvent('keystore-data-changed', {
      detail: { action: 'batch-move', keywords: selectedKeywords, targetGroup }
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词管理</CardTitle>
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

  if (allKeywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2" />
            <p>暂无关键词数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>关键词管理</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              显示 {currentPage * itemsPerPage + 1}-{Math.min((currentPage + 1) * itemsPerPage, filteredKeywords.length)} / 共 {filteredKeywords.length} 个关键词
              {filteredKeywords.length !== allKeywords.length && ` (总共 ${allKeywords.length} 个)`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('手动刷新关键词数据');
              window.dispatchEvent(new CustomEvent('keystore-data-changed', {
                detail: { action: 'manual-refresh', source: 'words-manager' }
              }));
            }}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 搜索和筛选区域 */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索关键词、组名或族名..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0); // 重置到第一页
                }}
                className="pl-10"
              />
            </div>
            
            {/* 组筛选 */}
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">所有组</option>
              {groupNames.map(groupName => (
                <option key={groupName} value={groupName}>{groupName}</option>
              ))}
            </select>
            
            {/* 族筛选 */}
            <select
              value={selectedCluster}
              onChange={(e) => {
                setSelectedCluster(e.target.value);  
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">所有族</option>
              {clusterNames.map(clusterName => (
                <option key={clusterName} value={clusterName}>{clusterName}</option>
              ))}
            </select>
            
            {/* 重置按钮 */}
            {(searchTerm || selectedGroup || selectedCluster) && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                重置
              </Button>
            )}
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectionState.isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="选择当前页所有关键词"
                  className={selectionState.isPartiallySelected ? 'data-[state=checked]:bg-primary data-[state=checked]:border-primary opacity-50' : ''}
                />
              </TableHead>
              <TableHead>关键词</TableHead>
              <TableHead>所属组</TableHead>
              <TableHead>所属族</TableHead>
              <TableHead>QPM</TableHead>
              <TableHead>难度</TableHead>
              <TableHead className="w-[80px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedKeywords.map((keywordInfo, index) => {
              const isSelected = selectedKeywords.includes(keywordInfo.keyword);
              const uniqueKey = `${keywordInfo.keyword}-${keywordInfo.group_name}-${index}`;
              
              return (
                <TableRow key={uniqueKey} className={isSelected ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleKeywordSelect(keywordInfo.keyword, !!checked)}
                      aria-label={`选择关键词 ${keywordInfo.keyword}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-xs">
                    <KeywordCell keyword={keywordInfo.keyword} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{keywordInfo.group_name}</Badge>
                  </TableCell>
                  <TableCell>
                    {keywordInfo.cluster_name ? (
                      <Badge variant="outline">{keywordInfo.cluster_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">未分配</span>
                    )}
                  </TableCell>
                  <TableCell>{keywordInfo.qpm.toLocaleString()}</TableCell>
                  <TableCell>{keywordInfo.diff.toFixed(1)}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu 
                        open={openDropdownKeyword === uniqueKey} 
                        onOpenChange={(open) => setOpenDropdownKeyword(open ? uniqueKey : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[150px]">
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownKeyword(null);
                              setSelectedKeyword(keywordInfo);
                              setIsDetailDialogOpen(true);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            查看详情
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
        
        {/* 批量选择状态 */}
        {selectedKeywords.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border-dashed border-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                已选择 {selectedKeywords.length} 个关键词
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMoveDialogOpen(true)}
                  className="gap-1"
                >
                  <Move className="h-4 w-4" />
                  移动到其他组
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  批量删除
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedKeywords([])}
                >
                  清除选择
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 关键词详情弹窗 */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>关键词详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedKeyword && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">关键词</div>
                      <div className="text-lg font-bold break-words">{selectedKeyword.keyword}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">所属组</div>
                      <div className="text-lg font-bold">{selectedKeyword.group_name}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">所属族</div>
                      <div className="text-lg font-bold">{selectedKeyword.cluster_name || '未分配'}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">QPM</div>
                      <div className="text-lg font-bold">{selectedKeyword.qpm.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm text-muted-foreground">难度</div>
                      <div className="text-lg font-bold">{selectedKeyword.diff.toFixed(1)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 批量删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                您确定要删除选中的 <span className="font-medium text-foreground">{selectedKeywords.length}</span> 个关键词吗？
              </p>
              <p className="text-sm text-destructive mt-2">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                确认删除
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 批量移动对话框 */}
        <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>移动关键词到其他组</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                将选中的 <span className="font-medium text-foreground">{selectedKeywords.length}</span> 个关键词移动到：
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">目标组</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">请选择目标组</option>
                  {groupNames.map(groupName => (
                    <option key={groupName} value={groupName}>{groupName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMoveDialogOpen(false);
                  setTargetGroup('');
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleBatchMove}
                disabled={!targetGroup}
                className="gap-1"
              >
                <Move className="h-4 w-4" />
                确认移动
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});