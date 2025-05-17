//frontend-new/src/components/seo/content-display.tsx
"use client";

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ExtractedContent } from '@/types/seo';

interface ContentDisplayProps {
  content: ExtractedContent;
  isLoading?: boolean;
}

export function ContentDisplay({ content, isLoading = false }: ContentDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <Skeleton className="h-6 w-1/4"/>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full"/>
        </CardContent>
      </Card>
    );
  }

  if (!content || !content.text) {
    return null;
  }

  // 高亮拼写和语法错误的内容显示
  const renderHighlightedContent = () => {
    // 合并所有错误，并按照位置排序
    const allErrors = [
      ...content.spelling_errors.map(err => ({ ...err, type: 'spelling' as const })),
      ...content.grammar_errors.map(err => ({ ...err, type: 'grammar' as const }))
    ].sort((a, b) => {
      // 首先按文本内容排序
      if (a.text !== b.text) return a.text.localeCompare(b.text);
      // 然后按偏移量排序
      return a.offset - b.offset;
    });

    if (allErrors.length === 0) {
      return <div className="whitespace-pre-line">{content.text}</div>;
    }

    // 按段落分割内容，便于显示
    const paragraphs = content.text.split(/\n+/);
    
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph, pIndex) => {
          // 找出当前段落中的错误
          const paragraphErrors = allErrors.filter(err => 
            paragraph.includes(err.text.substring(err.offset, err.offset + err.length))
          );
          
          if (paragraphErrors.length === 0) {
            return <p key={pIndex}>{paragraph}</p>;
          }
          
          // 为段落中的错误创建高亮标记
          let lastPos = 0;
          const parts = [];
          
          for (const error of paragraphErrors) {
            // 找到错误在当前段落中的位置
            const errorText = error.text.substring(error.offset, error.offset + error.length);
            const errorPos = paragraph.indexOf(errorText, lastPos);
            
            if (errorPos === -1) continue;
            
            // 添加错误前的文本
            if (errorPos > lastPos) {
              parts.push(<span key={`${pIndex}-${lastPos}`}>{paragraph.substring(lastPos, errorPos)}</span>);
            }
            
            // 添加带高亮的错误文本
            const errorClass = error.type === 'spelling' 
              ? 'bg-destructive/15 text-destructive'
              : 'bg-yellow-100 text-yellow-800';
            
            parts.push(
              <TooltipProvider key={`${pIndex}-${errorPos}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn("px-1 rounded cursor-help", errorClass)}>
                      {paragraph.substring(errorPos, errorPos + errorText.length)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div>
                      <p className="font-medium">{error.message}</p>
                      {error.replacements && error.replacements.length > 0 && (
                        <p className="text-xs mt-1">
                          建议: {error.replacements.join(', ')}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
            
            lastPos = errorPos + errorText.length;
          }
          
          // 添加段落剩余部分
          if (lastPos < paragraph.length) {
            parts.push(<span key={`${pIndex}-${lastPos}`}>{paragraph.substring(lastPos)}</span>);
          }
          
          return <p key={pIndex}>{parts}</p>;
        })}
      </div>
    );
  };

  // 渲染错误列表
  const renderErrorList = () => {
    const hasSpellingErrors = content.spelling_errors && content.spelling_errors.length > 0;
    const hasGrammarErrors = content.grammar_errors && content.grammar_errors.length > 0;
    
    if (!hasSpellingErrors && !hasGrammarErrors) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>未发现语法或拼写错误</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* 拼写错误 */}
        {hasSpellingErrors && (
          <div>
            <h3 className="font-medium text-destructive mb-2">拼写错误 ({content.spelling_errors.length})</h3>
            <div className="space-y-2">
              {content.spelling_errors.map((error, index) => (
                <div key={`spelling-${index}`} className="bg-destructive/10 rounded-md p-3 border border-destructive/20">
                  <div className="text-destructive font-medium mb-1">
                    问题文本: <span className="font-normal">{error.text.substring(error.offset, error.offset + error.length)}</span>
                  </div>
                  <div className="text-sm text-destructive/90 mb-1">
                    {error.message}
                  </div>
                  {error.replacements && error.replacements.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      建议更正: {error.replacements.join(', ')}
                    </div>
                  )}
                  <div className="mt-2 text-xs bg-background p-2 rounded text-foreground whitespace-pre-wrap">
                    上下文: {error.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 语法错误 */}
        {hasGrammarErrors && (
          <div>
            <h3 className="font-medium text-yellow-700 mb-2">语法错误 ({content.grammar_errors.length})</h3>
            <div className="space-y-2">
              {content.grammar_errors.map((error, index) => (
                <div key={`grammar-${index}`} className="bg-yellow-50 rounded-md p-3 border border-yellow-200">
                  <div className="text-yellow-800 font-medium mb-1">
                    问题文本: <span className="font-normal">{error.text.substring(error.offset, error.offset + error.length)}</span>
                  </div>
                  <div className="text-sm text-yellow-700 mb-1">
                    {error.message}
                  </div>
                  {error.replacements && error.replacements.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      建议更正: {error.replacements.join(', ')}
                    </div>
                  )}
                  <div className="mt-2 text-xs bg-background p-2 rounded text-foreground whitespace-pre-wrap">
                    上下文: {error.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalErrors = content.spelling_errors.length + content.grammar_errors.length;

  return (
    <Card>
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">提取的页面内容</CardTitle>
          {totalErrors > 0 && (
            <Badge variant="destructive">
              {totalErrors} 个问题
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">内容预览</TabsTrigger>
              <TabsTrigger value="errors">
                错误列表 ({totalErrors})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="mt-4">
              <div className="p-4 bg-card rounded-md border max-h-96 overflow-y-auto">
                {renderHighlightedContent()}
              </div>
            </TabsContent>
            
            <TabsContent value="errors" className="mt-4">
              <div className="p-4 bg-card rounded-md border max-h-96 overflow-y-auto">
                {renderErrorList()}
              </div>
            </TabsContent>
          </Tabs>
          
          <Separator className="my-4" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>字符数: {content.text.length}</span>
            <span>字数: {content.text.split(/\s+/).filter(Boolean).length}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}