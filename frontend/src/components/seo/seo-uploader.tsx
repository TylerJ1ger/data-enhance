//frontend-new/src/components/seo/seo-uploader.tsx
"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, File as FileIcon, X as XIcon, 
  Settings, ChevronDown, ChevronUp 
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ContentExtractor } from '@/types/seo';

interface SEOUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  contentExtractor: ContentExtractor;
  setContentExtractor: (extractor: ContentExtractor) => void;
  enableAdvancedAnalysis: boolean;
  setEnableAdvancedAnalysis: (enable: boolean) => void;
}

export function SeoUploader({
  onFileSelected,
  disabled = false,
  contentExtractor,
  setContentExtractor,
  enableAdvancedAnalysis,
  setEnableAdvancedAnalysis
}: SEOUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

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
      
      // 只取第一个文件
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
    },
    multiple: false,
    disabled,
  });

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-input hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? '将文件拖放到此处...'
              : '拖放HTML文件至此，或点击选择文件'}
          </p>
          <p className="text-xs text-muted-foreground">
            支持HTML文件格式
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

      {file && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="text-sm font-medium mb-2">
              已选文件:
            </h4>
            <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
              <div className="flex items-center space-x-2">
                <FileIcon className="text-muted-foreground h-4 w-4" />
                <span className="truncate max-w-xs">{file.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 高级选项按钮和面板 */}
      <Collapsible
        open={showAdvancedOptions}
        onOpenChange={setShowAdvancedOptions}
        className="border rounded-md"
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex w-full justify-between p-4 rounded-none border-b"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>{showAdvancedOptions ? '隐藏高级选项' : '显示高级选项'}</span>
            </div>
            {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="p-4 space-y-4">          
          {/* 内容提取引擎选择 */}
          <div className="space-y-2">
            <Label htmlFor="content-extractor">内容提取引擎</Label>
            <Select 
              value={contentExtractor} 
              onValueChange={(value) => setContentExtractor(value as ContentExtractor)}
              disabled={disabled}
            >
              <SelectTrigger id="content-extractor">
                <SelectValue placeholder="选择内容提取器" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动选择最佳引擎</SelectItem>
                <SelectItem value="trafilatura">Trafilatura (推荐)</SelectItem>
                <SelectItem value="newspaper">Newspaper3k</SelectItem>
                <SelectItem value="readability">Readability</SelectItem>
                <SelectItem value="goose3">Goose3</SelectItem>
                <SelectItem value="custom">自定义算法</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              不同的提取引擎适用于不同类型的页面，自动模式会尝试所有引擎并选择最佳结果
            </p>
          </div>
          
          {/* 高级内容分析开关 */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="advanced-analysis">启用高级内容分析</Label>
              <p className="text-xs text-muted-foreground">
                使用 language-tool-python 进行语法、拼写和可读性分析，可能会增加分析时间
              </p>
            </div>
            <Switch
              id="advanced-analysis"
              checked={enableAdvancedAnalysis}
              onCheckedChange={setEnableAdvancedAnalysis}
              disabled={disabled}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}