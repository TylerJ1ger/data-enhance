//frontend-new/src/components/dashboard/brand-overlap.tsx
"use client";

import React from 'react';
import { Link, Circle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { BrandOverlapResponse } from '@/types';

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter, 
  CardDescription 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 动态导入ForceGraphChart组件，禁用SSR
const ForceGraphChart = dynamic(
  () => import('@/visualizations/force-graph-chart'),
  { ssr: false, loading: () => <ChartLoadingState /> }
);

// 加载状态组件
function ChartLoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full"></div>
    </div>
  );
}

interface BrandOverlapProps {
  brandOverlapData: BrandOverlapResponse | null;
  isLoading?: boolean;
}

export function BrandOverlap({
  brandOverlapData,
  isLoading = false,
}: BrandOverlapProps) {
  // 空状态处理
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算统计数据
  const getBrandSummary = () => {
    if (!brandOverlapData || Object.keys(brandOverlapData.brand_stats).length === 0) {
      return null;
    }

    const { brand_stats, overlap_matrix } = brandOverlapData;
    const brandCount = Object.keys(brand_stats).length;
    
    // 计算所有品牌的总关键词数
    const totalKeywords = Object.values(brand_stats).reduce(
      (sum, stats) => sum + stats.total_keywords, 
      0
    );
    
    // 计算品牌间的平均重叠
    let totalOverlap = 0;
    let overlapCount = 0;
    
    Object.keys(overlap_matrix).forEach(brand1 => {
      Object.keys(overlap_matrix[brand1]).forEach(brand2 => {
        if (brand1 !== brand2) {
          totalOverlap += overlap_matrix[brand1][brand2];
          overlapCount++;
        }
      });
    });
    
    const averageOverlap = overlapCount ? Math.round(totalOverlap / overlapCount) : 0;
    
    // 找出重叠最多的品牌对
    let maxOverlap = 0;
    let maxOverlapPair = ['', ''];
    
    Object.keys(overlap_matrix).forEach(brand1 => {
      Object.keys(overlap_matrix[brand1]).forEach(brand2 => {
        if (brand1 !== brand2 && overlap_matrix[brand1][brand2] > maxOverlap) {
          maxOverlap = overlap_matrix[brand1][brand2];
          maxOverlapPair = [brand1, brand2];
        }
      });
    });
    
    return {
      brandCount,
      totalKeywords,
      averageOverlap,
      maxOverlap,
      maxOverlapPair
    };
  };

  const summary = getBrandSummary();

  // 无数据状态
  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Link className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">上传包含品牌数据的文件以查看品牌重叠分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>品牌关键词重叠分析</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <div className="flex items-center mb-2">
              <Circle className="mr-2 h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">品牌数量</h4>
            </div>
            <div className="text-2xl font-bold">{summary.brandCount}</div>
          </div>
          
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <div className="flex items-center mb-2">
              <Circle className="mr-2 h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">关键词总数</h4>
            </div>
            <div className="text-2xl font-bold">{summary.totalKeywords.toLocaleString()}</div>
          </div>
          
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <div className="flex items-center mb-2">
              <Link className="mr-2 h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">平均重叠关键词</h4>
            </div>
            <div className="text-2xl font-bold">{summary.averageOverlap}</div>
          </div>
        </div>
        
        {/* 最高重叠统计信息 */}
        {summary.maxOverlap > 0 && (
          <div className="bg-primary/5 rounded-lg border border-primary/20 p-4 text-sm">
            <div className="font-medium text-primary-foreground/90 mb-1">最高重叠品牌对</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="font-medium mr-1">{summary.maxOverlapPair[0]}</span>
                <Link className="mx-2 h-4 w-4 text-primary" />
                <span className="font-medium ml-1">{summary.maxOverlapPair[1]}</span>
              </div>
              <Badge variant="secondary">
                共享 <span className="font-bold ml-1">{summary.maxOverlap}</span> 个关键词
              </Badge>
            </div>
          </div>
        )}
        
        {/* 图例说明 */}
        <div className="bg-muted/50 p-4 rounded-lg border flex flex-wrap gap-4">
          <div className="text-sm font-medium text-muted-foreground">图例:</div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-primary mr-1"></div>
            <span>圆圈大小 = 关键词数量</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="h-0.5 w-8 bg-muted-foreground/60 mr-1"></div>
            <span>连线粗细 = 共同关键词数量</span>
          </div>
        </div>
        
        {/* Force Graph 可视化 */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-3 border-b">
            <h4 className="text-sm font-medium">品牌关键词重叠可视化</h4>
          </div>
          <div className="w-full bg-muted/30 rounded-b-lg overflow-hidden">
            <ForceGraphChart 
              brandOverlapData={brandOverlapData}
              height={550}
            />
          </div>
        </div>
      </CardContent>
      
      {/* 操作提示 */}
      <CardFooter>
        <Alert variant="info" className="w-full">
          <AlertTitle>操作提示</AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-1">
              <div className="flex gap-2 items-start">
                <span>•</span>
                <span>拖拽节点可调整布局</span>
              </div>
              <div className="flex gap-2 items-start">
                <span>•</span>
                <span>鼠标悬停在节点或连线上可查看详细信息</span>
              </div>
              <div className="flex gap-2 items-start">
                <span>•</span>
                <span>鼠标滚轮可缩放图表</span>
              </div>
              <div className="flex gap-2 items-start">
                <span>•</span>
                <span>点击并拖拽空白区域可平移整个图表</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}