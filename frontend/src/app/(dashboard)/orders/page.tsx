//frontend/src/app/(dashboard)/orders/page.tsx
"use client";

import { useState } from 'react';
import { Download, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { OrderGenerator } from "@/components/orders/order-generator";
import { OrderStats } from "@/components/orders/order-stats";
import { OrderFilterPanel } from "@/components/orders/order-filter-panel";
import { OrderCharts } from "@/components/orders/order-charts";
import { useOrdersApi } from "@/hooks/use-orders-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrderFilterRequest } from '@/types';

export default function OrdersPage() {
  const [showGenerator, setShowGenerator] = useState(true);
  
  // 使用订单专用API hook
  const {
    isGenerating,
    isFiltering,
    isLoadingCharts,
    isLoadingRanges,
    orderStats,
    filteredStats,
    chartData,
    filterRanges,
    summary,
    generateVirtualData,
    applyFilters,
    getExportUrl,
    resetData,
  } = useOrdersApi();

  const handleGenerateData = async (count: number) => {
    try {
      await generateVirtualData(count);
      setShowGenerator(false);
    } catch (error) {
      console.error('Error generating virtual order data:', error);
    }
  };

  const handleApplyFilter = async (filters: OrderFilterRequest) => {
    try {
      await applyFilters(filters);
    } catch (error) {
      console.error('Error applying order filters:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetData();
      setShowGenerator(true);
    } catch (error) {
      console.error('Error resetting order data:', error);
    }
  };

  const hasData = summary?.has_data || false;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">虚拟订单分析</h1>
          <p className="text-muted-foreground mt-1">
            生成虚拟订单数据进行业务分析和可视化展示
          </p>
        </div>
        {/* 添加v1 API指示 */}
        <div className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded">
          API v1
        </div>
      </div>
      <Separator />
      
      {/* Action Bar */}
      {hasData && (
        <div className="flex flex-wrap gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowGenerator(true)}
              className="gap-2"
              disabled={isGenerating || isFiltering}
            >
              <BarChart3 className="h-4 w-4" />
              生成新数据
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.open(getExportUrl(), '_blank');
              }}
              disabled={isGenerating || isFiltering}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              导出数据
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isGenerating || isFiltering}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重置所有数据
          </Button>
        </div>
      )}

      {/* 数据生成器 */}
      {(showGenerator || !hasData) && (
        <OrderGenerator
          onGenerate={handleGenerateData}
          isGenerating={isGenerating}
          disabled={isFiltering}
        />
      )}

      {/* 加载状态 */}
      {isGenerating && (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-[100px] w-full rounded-xl" />
            <Skeleton className="h-[100px] w-full rounded-xl" />
            <Skeleton className="h-[100px] w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* 主要仪表板 */}
      {hasData && !isGenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧筛选面板 */}
          <div className="lg:col-span-1">
            <OrderFilterPanel
              filterRanges={filterRanges}
              onApplyFilter={handleApplyFilter}
              isLoading={isFiltering || isLoadingRanges}
              disabled={isGenerating}
            />
          </div>

          {/* 右侧内容区域 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 统计卡片 */}
            <OrderStats
              originalStats={orderStats}
              filteredStats={filteredStats}
              isLoading={isGenerating || isFiltering}
            />

            {/* 数据摘要提示 */}
            {summary && (
              <Alert variant="info">
                <AlertDescription>
                  数据摘要：共生成 {summary.total_orders.toLocaleString()} 条订单数据，
                  当前筛选显示 {summary.filtered_orders.toLocaleString()} 条记录
                  {summary.last_generation_params.count && 
                    `（最后生成 ${summary.last_generation_params.count} 条）`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* 图表可视化 */}
            <OrderCharts
              chartData={chartData}
              isLoading={isLoadingCharts || isFiltering}
            />
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {!hasData && !isGenerating && !showGenerator && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无订单数据</h3>
            <p className="text-muted-foreground mb-4">
              开始生成虚拟订单数据进行分析和可视化
            </p>
            <Button onClick={() => setShowGenerator(true)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              生成虚拟数据
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}