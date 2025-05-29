//frontend/src/components/orders/order-stats.tsx
"use client";

import { ShoppingCart, Users, DollarSign, Filter, Calendar, Package } from 'lucide-react';
import { OrderStats as OrderStatsType } from '@/types/index'; // 修复：重命名类型导入避免冲突
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface OrderStatsProps {
  originalStats: OrderStatsType | null;
  filteredStats: OrderStatsType | null;
  isLoading?: boolean;
}

export function OrderStats({
  originalStats,
  filteredStats,
  isLoading = false,
}: OrderStatsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4 mb-4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!originalStats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">生成虚拟订单数据以查看统计信息</p>
        </CardContent>
      </Card>
    );
  }

  // 计算筛选后保留的订单百分比
  const percentageRetained = filteredStats
    ? Math.round((filteredStats.total_orders / originalStats.total_orders) * 100)
    : 100;

  // 计算总收入（所有币种）
  const getTotalRevenue = (stats: OrderStatsType) => {
    return Object.values(stats.total_revenue).reduce((sum, amount) => sum + amount, 0);
  };

  // 格式化收入显示
  const formatRevenue = (revenue: Record<string, number>) => {
    return Object.entries(revenue)
      .map(([currency, amount]) => `${amount.toFixed(2)} ${currency.toUpperCase()}`)
      .join(' | ');
  };

  // 统计卡片组件 - 移除"原始: xxx"显示
  const StatCard = ({
    icon,
    title,
    originalValue,
    filteredValue,
    formatter = (val: any) => typeof val === 'number' ? val.toLocaleString() : val,
  }: {
    icon: React.ReactNode;
    title: string;
    originalValue: any;
    filteredValue?: any;
    formatter?: (val: any) => string;
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center mb-2">
          <div className="mr-2 text-primary">{icon}</div>
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        <div className="flex justify-between items-end">
          <div className="text-2xl font-bold">
            {formatter(filteredValue !== undefined ? filteredValue : originalValue)}
          </div>
          {/* 移除了原始值显示部分 */}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>订单统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 第一行统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<ShoppingCart className="h-5 w-5" />}
            title="总订单数"
            originalValue={originalStats.total_orders}
            filteredValue={filteredStats?.total_orders}
          />
          
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="用户数"
            originalValue={originalStats.unique_users}
            filteredValue={filteredStats?.unique_users}
          />
          
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            title="总收入"
            originalValue={getTotalRevenue(originalStats)}
            filteredValue={filteredStats ? getTotalRevenue(filteredStats) : undefined}
            formatter={(val) => val.toFixed(2)}
          />
        </div>

        {/* 第二行统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            title="时间范围"
            originalValue={`${originalStats.date_range.start.split(' ')[0]} ~ ${originalStats.date_range.end.split(' ')[0]}`}
            filteredValue={filteredStats ? `${filteredStats.date_range.start.split(' ')[0]} ~ ${filteredStats.date_range.end.split(' ')[0]}` : undefined}
            formatter={(val) => val}
          />
          
          <StatCard
            icon={<Package className="h-5 w-5" />}
            title="产品类型"
            originalValue={Object.keys(originalStats.license_distribution).length}
            filteredValue={filteredStats ? Object.keys(filteredStats.license_distribution).length : undefined}
            formatter={(val) => `${val} 种License`}
          />
          
          <StatCard
            icon={<Filter className="h-5 w-5" />}
            title="币种分布"
            originalValue={formatRevenue(originalStats.total_revenue)}
            filteredValue={filteredStats ? formatRevenue(filteredStats.total_revenue) : undefined}
            formatter={(val) => val}
          />
        </div>
        
        {filteredStats && filteredStats.total_orders !== originalStats.total_orders && (
          <Alert variant="info">
            <AlertTitle className="flex items-center">
              筛选已应用
              <Badge variant="outline" className="ml-2">
                {percentageRetained}%
              </Badge>
            </AlertTitle>
            <AlertDescription>
              显示 {filteredStats.total_orders.toLocaleString()} 个订单，共 {originalStats.total_orders.toLocaleString()} 个
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}