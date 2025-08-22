// src/components/keystore/keystore-incremental-uploader.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  Users, 
  Hash,
  X,
  Eye,
  UploadCloud
} from "lucide-react";
import { useKeystoreApi } from "@/hooks/use-keystore-api";
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

interface UploadDiffResult {
  success: boolean;
  diff_analysis?: {
    new_groups: Array<{
      group_name: string;
      keyword_count: number;
      sample_keywords: string[];
    }>;
    new_keywords_in_existing_groups: Array<{
      keyword: string;
      group: string;
    }>;
    new_keywords_in_new_groups: Array<{
      keyword: string;
      group: string;
    }>;
    duplicate_keywords: Array<{
      keyword: string;
      group: string;
      action: string;
    }>;
    existing_groups_with_new_keywords: Array<{
      group_name: string;
      new_keyword_count: number;
      sample_new_keywords: string[];
    }>;
    summary: {
      total_new_groups: number;
      total_new_keywords: number;
      total_duplicate_keywords: number;
      total_files_processed: number;
      existing_groups_affected: number;
      new_keywords_in_existing_groups: number;
      new_keywords_in_new_groups: number;
    };
  };
  upload_mode_recommended?: string;
  can_proceed?: boolean;
  error?: string;
}

interface KeystoreIncrementalUploaderProps {
  onUploadComplete?: () => void;
}

export function KeystoreIncrementalUploader({ onUploadComplete }: KeystoreIncrementalUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [diffResult, setDiffResult] = useState<UploadDiffResult | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const { previewUploadDiff, uploadFiles } = useKeystoreApi();

  // 文件拖拽处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFiles = acceptedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.csv') || 
      file.name.toLowerCase().endsWith('.xlsx')
    );
    
    if (csvFiles.length !== acceptedFiles.length) {
      toast.warning('只支持 CSV 和 XLSX 文件格式');
    }
    
    if (csvFiles.length > 0) {
      setFiles(csvFiles);
      setDiffResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  // 分析文件差异
  const handleAnalyzeDiff = async () => {
    if (!files.length) {
      toast.error('请先选择文件');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await previewUploadDiff(files);
      setDiffResult(result);
      setIsPreviewDialogOpen(true);
    } catch (error) {
      console.error('分析文件差异失败:', error);
      toast.error('分析文件差异失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 确认上传
  const handleConfirmUpload = async () => {
    if (!files.length || !diffResult?.can_proceed) {
      toast.error('无法执行上传');
      return;
    }

    setIsUploading(true);
    try {
      await uploadFiles(files, 'append');
      toast.success('增量上传完成！');
      setFiles([]);
      setDiffResult(null);
      setIsPreviewDialogOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error('增量上传失败:', error);
      toast.error('增量上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // 清除文件
  const handleClearFiles = () => {
    setFiles([]);
    setDiffResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5" />
          增量上传文件
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          上传新的关键词库文件，系统将分析差异并与现有数据合并
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 文件选择区域 */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary">拖放文件到这里...</p>
          ) : (
            <div>
              <p className="text-muted-foreground mb-1">
                拖拽文件到这里，或点击选择文件
              </p>
              <p className="text-xs text-muted-foreground">
                支持 CSV 和 XLSX 格式，可选择多个文件
              </p>
            </div>
          )}
        </div>

        {/* 已选择的文件列表 */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">已选择的文件 ({files.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFiles}
                className="h-8 gap-1"
              >
                <X className="h-4 w-4" />
                清除
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyzeDiff}
            disabled={!files.length || isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                分析差异
              </>
            )}
          </Button>
        </div>

        {/* 分析结果预览弹窗 */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>上传差异分析</DialogTitle>
            </DialogHeader>
            
            {diffResult && (
              <div className="space-y-6">
                {diffResult.success ? (
                  <>
                    {/* 总览 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {diffResult.diff_analysis?.summary.total_new_groups || 0}
                        </div>
                        <div className="text-sm text-green-700">新增组</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {diffResult.diff_analysis?.summary.total_new_keywords || 0}
                        </div>
                        <div className="text-sm text-blue-700">新增关键词</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {diffResult.diff_analysis?.summary.existing_groups_affected || 0}
                        </div>
                        <div className="text-sm text-orange-700">影响的现有组</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">
                          {diffResult.diff_analysis?.summary.total_duplicate_keywords || 0}
                        </div>
                        <div className="text-sm text-gray-700">重复关键词</div>
                      </div>
                    </div>

                    {/* 新增组详情 */}
                    {diffResult.diff_analysis?.new_groups && diffResult.diff_analysis.new_groups.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Plus className="h-4 w-4 text-green-600" />
                          新增组 ({diffResult.diff_analysis.new_groups.length})
                        </h4>
                        <div className="space-y-2">
                          {diffResult.diff_analysis.new_groups.map((group, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{group.group_name}</span>
                                <Badge variant="secondary">
                                  {group.keyword_count} 个关键词
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                示例关键词: {group.sample_keywords.join(', ')}
                                {group.sample_keywords.length < group.keyword_count && '...'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 现有组的新增关键词 */}
                    {diffResult.diff_analysis?.existing_groups_with_new_keywords && 
                     diffResult.diff_analysis.existing_groups_with_new_keywords.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          现有组的新增关键词 ({diffResult.diff_analysis.existing_groups_with_new_keywords.length})
                        </h4>
                        <div className="space-y-2">
                          {diffResult.diff_analysis.existing_groups_with_new_keywords.map((group, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{group.group_name}</span>
                                <Badge variant="outline">
                                  +{group.new_keyword_count} 个新关键词
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                新增关键词: {group.sample_new_keywords.join(', ')}
                                {group.sample_new_keywords.length < group.new_keyword_count && '...'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 重复关键词 */}
                    {diffResult.diff_analysis?.duplicate_keywords && 
                     diffResult.diff_analysis.duplicate_keywords.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Hash className="h-4 w-4 text-orange-600" />
                          重复关键词 ({diffResult.diff_analysis.duplicate_keywords.length})
                        </h4>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            这些关键词已存在于数据库中，上传时将跳过或使用更高QPM值的版本更新。
                          </AlertDescription>
                        </Alert>
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-2">
                            {diffResult.diff_analysis.duplicate_keywords.slice(0, 20).map((item, index) => (
                              <div key={index} className="text-sm p-2 bg-orange-50 rounded">
                                <span className="font-medium">{item.keyword}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({item.group})
                                </span>
                              </div>
                            ))}
                          </div>
                          {diffResult.diff_analysis.duplicate_keywords.length > 20 && (
                            <div className="text-sm text-muted-foreground mt-2 text-center">
                              ... 还有 {diffResult.diff_analysis.duplicate_keywords.length - 20} 个重复关键词
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsPreviewDialogOpen(false)}
                        disabled={isUploading}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleConfirmUpload}
                        disabled={!diffResult.can_proceed || isUploading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            上传中...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            确认增量上传
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      分析失败: {diffResult.error || '未知错误'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}