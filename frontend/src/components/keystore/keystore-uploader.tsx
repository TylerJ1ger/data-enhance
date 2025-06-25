// src/components/keystore/keystore-uploader.tsx
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
import { Info, Database, Upload, Cloud, AlertTriangle } from "lucide-react";
import { toast } from 'react-toastify';

interface KeystoreUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onLoadExistingData?: () => Promise<void>;
  onRestoreFromIndexDB?: () => Promise<void>;
  onClearIndexDBData?: () => Promise<void>;
  isUploading: boolean;
}

export function KeystoreUploader({
  onFilesSelected,
  onLoadExistingData,
  onRestoreFromIndexDB,
  onClearIndexDBData,
  isUploading
}: KeystoreUploaderProps) {
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showDataConflictDialog, setShowDataConflictDialog] = useState(false);

  const handleLoadExistingData = async () => {
    if (!onLoadExistingData) return;
    
    setIsLoadingData(true);
    try {
      await onLoadExistingData();
      toast.success('已加载存储的关键词数据');
    } catch (error) {
      if (error instanceof Error && error.message === 'DATA_CONFLICT') {
        setShowDataConflictDialog(true);
      } else {
        console.error('加载数据失败:', error);
        toast.error('加载存储数据失败，请重试');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRestoreData = async () => {
    if (!onRestoreFromIndexDB) return;
    
    setShowDataConflictDialog(false);
    setIsLoadingData(true);
    try {
      await onRestoreFromIndexDB();
    } catch (error) {
      console.error('恢复数据失败:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleClearData = async () => {
    if (!onClearIndexDBData) return;
    
    setShowDataConflictDialog(false);
    setIsLoadingData(true);
    try {
      await onClearIndexDBData();
    } catch (error) {
      console.error('清空数据失败:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          传统上传文件
        </CardTitle>
        <CardDescription>
          使用覆盖模式上传CSV文件，会清空现有数据并重新构建关键词库。
          <span className="block text-xs text-muted-foreground mt-1">
            ⚠️ 此模式会覆盖所有现有数据
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 数据加载选项 */}
        {onLoadExistingData && (
          <>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">加载已有数据</div>
                  <div className="text-sm text-blue-700">
                    从前端IndexDB或后端Redis中加载已存储的关键词数据
                  </div>
                </div>
              </div>
              <Button
                onClick={handleLoadExistingData}
                disabled={isUploading || isLoadingData}
                variant="outline"
                size="sm"
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Cloud className="h-4 w-4" />
                {isLoadingData ? '加载中...' : '加载数据'}
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">或</span>
              <Separator className="flex-1" />
            </div>
          </>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>CSV文件格式要求：</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li><strong>Keywords</strong>: 关键词内容（必需）</li>
              <li><strong>group_name_map</strong>: 关键词组名（必需）</li>
              <li><strong>QPM</strong>: 搜索量（必需）</li>
              <li><strong>DIFF</strong>: 关键词难度（必需）</li>
              <li>其他列如Group, Force Group, Task Name等为可选</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>上传CSV/XLSX文件</span>
        </div>
        
        <FileUpload
          onFilesSelected={onFilesSelected}
          disabled={isUploading || isLoadingData}
          accept={{
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          }}
        />
      </CardContent>

      {/* 数据冲突对话框 */}
      <AlertDialog open={showDataConflictDialog} onOpenChange={setShowDataConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              数据冲突检测
            </AlertDialogTitle>
            <AlertDialogDescription>
              检测到本地 IndexedDB 中有数据，但服务器数据库已被重置。
            </AlertDialogDescription>
            <div className="text-sm text-muted-foreground">
              请选择以下操作之一：
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={handleClearData}
              disabled={isLoadingData}
              className="w-full sm:w-auto"
            >
              清空本地数据
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestoreData}
              disabled={isLoadingData}
              className="w-full sm:w-auto"
            >
              {isLoadingData ? '恢复中...' : '恢复服务器数据'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}