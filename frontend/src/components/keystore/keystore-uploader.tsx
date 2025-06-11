// src/components/keystore/keystore-uploader.tsx
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Info, Database, Upload, Cloud } from "lucide-react";
import { toast } from 'react-toastify';

interface KeystoreUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onLoadExistingData?: () => Promise<void>;
  isUploading: boolean;
}

export function KeystoreUploader({
  onFilesSelected,
  onLoadExistingData,
  isUploading
}: KeystoreUploaderProps) {
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleLoadExistingData = async () => {
    if (!onLoadExistingData) return;
    
    setIsLoadingData(true);
    try {
      await onLoadExistingData();
      toast.success('已加载存储的关键词数据');
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载存储数据失败，请重试');
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>上传关键词库文件</CardTitle>
        <CardDescription>
          上传CSV文件以构建关键词库。支持批量上传，系统会自动合并和去重处理。
          <span className="block text-xs text-muted-foreground mt-1">
            正在使用API v1 - 新的关键词库管理接口
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
    </Card>
  );
}