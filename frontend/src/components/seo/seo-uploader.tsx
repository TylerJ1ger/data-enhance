//frontend-new/src/components/seo/seo-uploader.tsx
"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, File as FileIcon, X as XIcon, 
  Settings, ChevronDown, ChevronUp, 
  AlertCircle, FileText, Users
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ContentExtractor } from '@/types/seo';

interface SEOUploaderProps {
  onFileSelected?: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  disabled?: boolean;
  contentExtractor: ContentExtractor;
  setContentExtractor: (extractor: ContentExtractor) => void;
  enableAdvancedAnalysis: boolean;
  setEnableAdvancedAnalysis: (enable: boolean) => void;
  mode?: 'single' | 'batch';
  onModeChange?: (mode: 'single' | 'batch') => void;
}

export function SeoUploader({
  onFileSelected,
  onFilesSelected,
  disabled = false,
  contentExtractor,
  setContentExtractor,
  enableAdvancedAnalysis,
  setEnableAdvancedAnalysis,
  mode = 'single',
  onModeChange
}: SEOUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
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
      
      if (mode === 'single') {
        // 单文件模式：只取第一个文件
        if (acceptedFiles.length > 0) {
          const file = acceptedFiles[0];
          setFiles([file]);
          onFileSelected?.(file);
        }
      } else {
        // 批量模式：处理多个文件
        const newFiles = [...files, ...acceptedFiles];
        
        // 限制文件数量
        if (newFiles.length > 50) {
          setError('最多只能上传50个文件');
          return;
        }
        
        setFiles(newFiles);
        onFilesSelected?.(newFiles);
      }
    },
    [mode, files, onFileSelected, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
    },
    multiple: mode === 'batch',
    disabled,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    if (mode === 'batch') {
      onFilesSelected?.(newFiles);
    } else if (newFiles.length === 0) {
      // 单文件模式清空
      onFileSelected?.(null as any);
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
    if (mode === 'batch') {
      onFilesSelected?.([]);
    } else {
      onFileSelected?.(null as any);
    }
  };

  const handleModeChange = (newMode: 'single' | 'batch') => {
    // 切换模式时清空文件
    setFiles([]);
    setError(null);
    onModeChange?.(newMode);
  };

  const getDropzoneText = () => {
    if (isDragActive) {
      return mode === 'batch' ? '将文件拖放到此处...' : '将文件拖放到此处...';
    }
    
    if (mode === 'batch') {
      return '拖放多个HTML文件至此，或点击选择文件';
    } else {
      return '拖放HTML文件至此，或点击选择文件';
    }
  };

  const getFileCountInfo = () => {
    if (mode === 'single') {
      return files.length > 0 ? '已选择1个文件' : '支持单个HTML文件';
    } else {
      return `已选择${files.length}个文件（最多50个）`;
    }
  };

  return (
    <div className="space-y-4">
      {/* 模式切换标签 */}
      <Tabs value={mode} onValueChange={(value) => handleModeChange(value as 'single' | 'batch')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            单文件分析
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            批量分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            上传单个HTML文件进行详细的SEO分析，适合深入分析单个页面
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            批量上传多个HTML文件进行SEO分析，适合批量检查多个页面。最多支持50个文件。
            <br />
            <span className="text-orange-600 font-medium">
              注意：批量分析可能需要较长时间，请耐心等待
            </span>
          </div>
        </TabsContent>
      </Tabs>

      {/* 文件上传区域 */}
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
            {getDropzoneText()}
          </p>
          <p className="text-xs text-muted-foreground">
            {getFileCountInfo()}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* 已选文件列表 */}
      {files.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">
                已选文件 ({files.length}):
              </h4>
              {files.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={disabled}
                >
                  清除全部
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm"
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <FileIcon className="text-muted-foreground h-4 w-4" />
                    <span className="truncate max-w-xs">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive ml-2"
                    aria-label="移除文件"
                    disabled={disabled}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* 批量模式的额外信息 */}
            {mode === 'batch' && files.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">批量分析信息:</div>
                  <ul className="text-xs space-y-1">
                    <li>• 预计分析时间: {Math.ceil(files.length * 30 / 60)} - {Math.ceil(files.length * 60 / 60)} 分钟</li>
                    <li>• 分析完成后可导出CSV报告</li>
                    <li>• 支持摘要和详细两种导出格式</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 高级选项面板 */}
      <Collapsible
        open={showAdvancedOptions}
        onOpenChange={setShowAdvancedOptions}
        className="border rounded-md"
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex w-full justify-between p-4 rounded-none border-b"
            disabled={disabled}
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
                使用 language-tool-python 进行语法、拼写和可读性分析
                {mode === 'batch' && <span className="text-orange-600">，批量模式下会显著增加分析时间</span>}
              </p>
            </div>
            <Switch
              id="advanced-analysis"
              checked={enableAdvancedAnalysis}
              onCheckedChange={setEnableAdvancedAnalysis}
              disabled={disabled}
            />
          </div>

          {/* 批量模式特殊提示 */}
          {mode === 'batch' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>批量分析注意事项:</strong>
                <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                  <li>分析时间与文件数量成正比，请耐心等待</li>
                  <li>建议关闭高级内容分析以加快处理速度</li>
                  <li>大文件或复杂页面会增加处理时间</li>
                  <li>分析完成后系统会自动保存结果</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}