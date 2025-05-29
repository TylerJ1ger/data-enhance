//frontend/src/components/schema/schema-save-load.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  Save, 
  Upload, 
  Trash2, 
  Calendar, 
  FileText, 
  Plus,
  Search,
  MoreHorizontal,
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useSchemaApi } from "@/hooks/use-schema-api";
import { SchemaType } from '@/types';
import { toast } from 'react-toastify';

interface SchemaSaveLoadProps {
  onSave?: (name: string) => void;
  showSaveDialog?: boolean;
  onCloseSaveDialog?: () => void;
}

interface SavedConfig {
  id: string;
  name: string;
  schema_type: SchemaType;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function SchemaSaveLoad({
  onSave,
  showSaveDialog = false,
  onCloseSaveDialog,
}: SchemaSaveLoadProps) {
  // 状态管理
  const [saveName, setSaveName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<SavedConfig | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<SavedConfig | null>(null);
  const [saveError, setSaveError] = useState<string>('');

  const {
    getSavedConfigs,
    loadConfig,
    deleteConfig,
    formState,
  } = useSchemaApi();

  // 加载保存的配置
  useEffect(() => {
    loadSavedConfigs();
  }, [showSaveDialog]);

  // 重新加载配置列表
  const loadSavedConfigs = () => {
    try {
      const configs = getSavedConfigs();
      setSavedConfigs(configs);
    } catch (error) {
      console.error('Failed to load saved configs:', error);
      toast.error('加载配置失败');
    }
  };

  // 处理保存
  const handleSave = () => {
    setSaveError('');
    
    if (!saveName.trim()) {
      setSaveError('请输入配置名称');
      return;
    }

    if (saveName.trim().length < 2) {
      setSaveError('配置名称至少需要2个字符');
      return;
    }

    if (saveName.trim().length > 50) {
      setSaveError('配置名称不能超过50个字符');
      return;
    }

    // 检查是否存在同名配置
    const existingConfig = savedConfigs.find(
      config => config.name.toLowerCase() === saveName.trim().toLowerCase()
    );

    if (existingConfig) {
      setSaveError('已存在同名配置，请使用不同的名称');
      return;
    }

    if (onSave) {
      try {
        onSave(saveName.trim());
        setSaveName('');
        setSaveError('');
        
        if (onCloseSaveDialog) {
          onCloseSaveDialog();
        }
        
        // 重新加载配置列表
        setTimeout(() => {
          loadSavedConfigs();
        }, 100);
        
      } catch (error) {
        setSaveError('保存配置失败，请重试');
      }
    }
  };

  // 处理加载
  const handleLoad = (config: SavedConfig) => {
    try {
      loadConfig(config.id);
      setSelectedConfig(config);
      toast.success(`已加载配置：${config.name}`);
    } catch (error) {
      toast.error('加载配置失败');
    }
  };

  // 处理删除确认
  const handleDeleteConfirm = (config: SavedConfig) => {
    setConfigToDelete(config);
    setShowDeleteDialog(true);
  };

  // 执行删除
  const handleDelete = () => {
    if (configToDelete) {
      try {
        deleteConfig(configToDelete.id);
        
        // 重新加载配置列表
        loadSavedConfigs();
        
        // 如果删除的是当前选中的配置，清除选中状态
        if (selectedConfig?.id === configToDelete.id) {
          setSelectedConfig(null);
        }
        
        toast.success(`已删除配置：${configToDelete.name}`);
        setConfigToDelete(null);
      } catch (error) {
        toast.error('删除配置失败');
      }
    }
    setShowDeleteDialog(false);
  };

  // 处理配置重命名
  const handleRename = (config: SavedConfig, newName: string) => {
    if (!newName.trim() || newName === config.name) {
      return;
    }

    // 检查新名称是否与其他配置重复
    const existingConfig = savedConfigs.find(
      c => c.id !== config.id && c.name.toLowerCase() === newName.trim().toLowerCase()
    );

    if (existingConfig) {
      toast.error('已存在同名配置');
      return;
    }

    try {
      // 删除旧配置
      deleteConfig(config.id);
      
      // 保存新配置
      if (onSave) {
        // 临时加载配置数据
        loadConfig(config.id);
        onSave(newName.trim());
      }
      
      // 重新加载列表
      setTimeout(() => {
        loadSavedConfigs();
      }, 100);
      
      toast.success('配置重命名成功');
    } catch (error) {
      toast.error('重命名失败');
    }
  };

  // 过滤配置列表
  const filteredConfigs = savedConfigs.filter(config =>
    config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.schema_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '未知时间';
    }
  };

  // 获取结构化数据类型的显示名称
  const getSchemaTypeDisplayName = (type: SchemaType) => {
    const names: Record<SchemaType, string> = {
      Article: '文章',
      Breadcrumb: '面包屑',
      Event: '事件',
      FAQPage: 'FAQ',
      HowTo: '操作指南',
      Organization: '组织',
      Person: '人物',
      Product: '产品',
      VideoObject: '视频',
      WebSite: '网站',
    };
    return names[type] || type;
  };

  // 获取配置的完整度百分比
  const getConfigCompleteness = (config: SavedConfig) => {
    const data = config.data;
    if (!data || typeof data !== 'object') return 0;
    
    const totalFields = Object.keys(data).length;
    const filledFields = Object.keys(data).filter(key => {
      const value = data[key];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).some(k => value[k]);
      }
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    return totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">配置管理</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {savedConfigs.length} 个配置
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索配置名称或类型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 配置列表 */}
          <ScrollArea className="h-72">
            <div className="space-y-3">
              {filteredConfigs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">
                    {searchTerm ? '未找到匹配的配置' : '暂无保存的配置'}
                  </p>
                  <p className="text-xs mt-1">
                    {!searchTerm && '完成表单填写后可保存配置'}
                  </p>
                </div>
              ) : (
                filteredConfigs.map((config) => {
                  const completeness = getConfigCompleteness(config);
                  const isSelected = selectedConfig?.id === config.id;
                  
                  return (
                    <Card 
                      key={config.id}
                      className={`transition-all duration-200 ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'hover:bg-muted/50 cursor-pointer'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div 
                            className="flex-1 min-w-0 space-y-2" 
                            onClick={() => setSelectedConfig(config)}
                          >
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-sm truncate">
                                {config.name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {getSchemaTypeDisplayName(config.schema_type)}
                              </Badge>
                              {isSelected && (
                                <Badge variant="default" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  当前
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(config.updated_at)}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <div className="text-xs text-muted-foreground">
                                  完整度: {completeness}%
                                </div>
                                <div className={`w-16 h-1.5 bg-muted rounded-full overflow-hidden`}>
                                  <div 
                                    className={`h-full transition-all duration-300 ${
                                      completeness >= 80 ? 'bg-green-500' :
                                      completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${completeness}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleLoad(config)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  加载配置
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleLoad(config)}
                                  className="gap-2"
                                >
                                  <Upload className="h-4 w-4" />
                                  加载配置
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteConfirm(config)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  删除配置
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* 当前状态显示 */}
          {formState.selectedType && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">当前编辑中的配置</p>
                  <p className="text-xs text-muted-foreground">
                    {getSchemaTypeDisplayName(formState.selectedType)}
                  </p>
                </div>
                <Badge variant={formState.isValid ? "default" : "secondary"} className="text-xs">
                  {formState.isValid ? '数据完整' : '待完善'}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground">
                已填写 {Object.keys(formState.formData).filter(key => formState.formData[key]).length} 个字段
                {Object.keys(formState.errors).length > 0 && (
                  <span className="text-destructive ml-2">
                    · {Object.keys(formState.errors).length} 个错误
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 快速操作提示 */}
          {savedConfigs.length === 0 && !formState.selectedType && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>开始使用配置管理</AlertTitle>
              <AlertDescription className="text-sm">
                选择结构化数据类型并填写表单后，您可以保存配置以便日后快速复用。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 保存对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={onCloseSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存配置</DialogTitle>
            <DialogDescription>
              为当前的结构化数据配置起一个名称，以便日后快速加载使用。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">配置名称</Label>
              <Input
                id="save-name"
                placeholder="例如: 产品页面配置"
                value={saveName}
                onChange={(e) => {
                  setSaveName(e.target.value);
                  setSaveError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saveError) {
                    handleSave();
                  }
                }}
                className={saveError ? "border-destructive" : ""}
              />
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
            </div>
            
            {formState.selectedType && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">类型:</span>
                  <Badge variant="outline">
                    {getSchemaTypeDisplayName(formState.selectedType)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">已填写字段:</span>
                  <span className="font-medium">
                    {Object.keys(formState.formData).filter(key => formState.formData[key]).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">数据状态:</span>
                  <Badge variant={formState.isValid ? "default" : "secondary"} className="text-xs">
                    {formState.isValid ? '完整' : '待完善'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onCloseSaveDialog}>
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!saveName.trim() || !!saveError}
            >
              <Save className="h-4 w-4 mr-2" />
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除配置</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除配置 <strong>"{configToDelete?.name}"</strong> 吗？
              <br />
              此操作不可撤销，配置数据将永久丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}