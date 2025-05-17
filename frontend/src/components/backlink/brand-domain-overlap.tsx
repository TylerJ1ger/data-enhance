//frontend-new/src/components/backlink/brand-domain-overlap.tsx
"use client";

import React from 'react';
import { Link, Circle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { BrandDomainOverlapResponse } from '@/types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 动态导入ForceGraphChart组件，禁用SSR
const ForceGraphChart = dynamic(
  () => import('@/visualizations/force-graph-chart'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-primary animate-spin"></div>
      </div>
    )
  }
);

interface BrandDomainOverlapProps {
  brandOverlapData: BrandDomainOverlapResponse | null;
  isLoading?: boolean;
}

export function BrandDomainOverlap({
  brandOverlapData,
  isLoading = false,
}: BrandDomainOverlapProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4 mb-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
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
    
    // 计算所有品牌的总域名数
    const totalDomains = Object.values(brand_stats).reduce(
      (sum, stats) => sum + stats.total_domains, 
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
      totalDomains,
      averageOverlap,
      maxOverlap,
      maxOverlapPair
    };
  };

  const summary = getBrandSummary();

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Link className="w-10 h-10 mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">上传包含品牌数据的文件以查看品牌域名重叠分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>品牌域名重叠分析</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <div className="flex items-center mb-2">
              <Circle className="mr-2 h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">品牌数量</h4>
            </div>
            <div className="text-2xl font-bold">{summary.brandCount}</div>
          </div>
          
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <div className="flex items-center mb-2">
              <Circle className="mr-2 h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">域名总数</h4>
            </div>
            <div className="text-2xl font-bold">{summary.totalDomains.toLocaleString()}</div>
          </div>
          
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <div className="flex items-center mb-2">
              <Link className="mr-2 h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">平均重叠域名</h4>
            </div>
            <div className="text-2xl font-bold">{summary.averageOverlap}</div>
          </div>
        </div>
        
        {/* 最高重叠统计信息 */}
        {summary.maxOverlap > 0 && (
          <div className="bg-card rounded-lg border border-primary-200 p-4">
            <div className="text-primary-700 font-medium mb-1">最高重叠品牌对</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="font-medium mr-1">{summary.maxOverlapPair[0]}</span>
                <Link className="mx-2 text-primary" size={16} />
                <span className="font-medium ml-1">{summary.maxOverlapPair[1]}</span>
              </div>
              <Badge variant="secondary" className="bg-primary-100 text-primary-700">
                共享 <span className="font-bold ml-1">{summary.maxOverlap}</span> 个域名
              </Badge>
            </div>
          </div>
        )}
        
        {/* 图例 */}
        <div className="flex flex-wrap gap-4 bg-muted p-3 rounded-lg border">
          <div className="text-sm font-medium text-foreground">图例:</div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-primary mr-1"></div>
            <span>圆圈大小 = 域名数量</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="h-0.5 w-8 bg-muted-foreground mr-1"></div>
            <span>连线粗细 = 共同域名数量</span>
          </div>
        </div>
        
        {/* Force Graph 可视化 */}
        <div className="bg-card rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-2">品牌域名重叠可视化</h4>
          <div className="w-full bg-muted rounded-lg overflow-hidden border">
            <ForceGraphChart 
              brandOverlapData={brandOverlapData}
              height={550} 
              dataType="domain"
            />
          </div>
        </div>
      </CardContent>
      
      {/* 操作说明 */}
      <CardFooter>
        <Alert className="w-full">
          <AlertDescription>
            <div className="font-medium mb-1">操作提示</div>
            <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
              <li>拖拽节点可调整布局</li>
              <li>鼠标悬停在节点或连线上可查看详细信息</li>
              <li>鼠标滚轮可缩放图表</li>
              <li>点击并拖拽空白区域可平移整个图表</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}