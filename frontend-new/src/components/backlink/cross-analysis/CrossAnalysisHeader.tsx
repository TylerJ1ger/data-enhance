 // frontend-new/src/components/backlink/cross-analysis/cross-analysis-header.tsx
import React from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CrossAnalysisHeaderProps {
  resultsCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
  className?: string;
}

export function CrossAnalysisHeader({
  resultsCount,
  isFullscreen,
  onToggleFullscreen,
  onExport,
  className
}: CrossAnalysisHeaderProps) {
  return (
    <CardHeader className={cn("sticky top-0 z-20 bg-card pb-3", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <CardTitle>交叉分析结果</CardTitle>
          <Badge variant="secondary">{resultsCount} 条匹配</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 全屏切换按钮 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? '退出全屏' : '全屏模式'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* 导出按钮 */}
          <Button onClick={onExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            导出结果
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}