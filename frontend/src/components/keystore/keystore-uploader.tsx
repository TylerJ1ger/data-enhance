// src/components/keystore/keystore-uploader.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface KeystoreUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}

export function KeystoreUploader({
  onFilesSelected,
  isUploading
}: KeystoreUploaderProps) {
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
        
        <FileUpload
          onFilesSelected={onFilesSelected}
          disabled={isUploading}
          accept={{
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          }}
        />
      </CardContent>
    </Card>
  );
}