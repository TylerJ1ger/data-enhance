//frontend-new/src/components/sitemap/sitemap-uploader.tsx
"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SitemapUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function SitemapUploader({
  onFilesSelected,
  disabled = false,
}: SitemapUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // 处理被拒绝的文件
      if (rejectedFiles.length > 0) {
        const errorMessages = rejectedFiles.map((file) => {
          const errors = file.errors.map((e: any) => e.message).join(', ');
          return `${file.file.name}: ${errors}`;
        });
        setError(errorMessages.join('\n'));
        return;
      }

      setError(null);
      
      // 更新文件状态
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
      
      // 调用父组件处理器
      onFilesSelected([...files, ...acceptedFiles]);
    },
    [files, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: true,
    disabled,
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  // 获取文件类型的徽章颜色和标签
  const getFileTypeBadge = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'xml':
        return { color: "bg-orange-100 text-orange-800", label: "XML" };
      case 'csv':
        return { color: "bg-green-100 text-green-800", label: "CSV" };
      case 'xlsx':
        return { color: "bg-blue-100 text-blue-800", label: "XLSX" };
      default:
        return { color: "bg-gray-100 text-gray-800", label: extension?.toUpperCase() || "未知" };
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? '将文件拖放到此处...'
              : '拖放文件至此，或点击选择文件'}
          </p>
          <p className="text-xs text-muted-foreground">
            支持XML、CSV和XLSX文件格式
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">
                已选文件 ({files.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  onFilesSelected([]);
                }}
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                清除全部
              </Button>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {files.map((file, index) => {
                const fileType = getFileTypeBadge(file.name);
                
                return (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-muted/40 p-2 rounded-md text-sm group"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0", fileType.color)}>
                        {fileType.label}
                      </Badge>
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-70 group-hover:opacity-100"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}