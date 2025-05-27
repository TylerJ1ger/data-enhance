//frontend/src/components/orders/order-charts.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderChartsResponse } from '@/types/index';
import { LICENSE_MAPPINGS } from '@/types/index';

interface OrderChartsProps {
  chartData: OrderChartsResponse | null;
  isLoading?: boolean;
}

// ECharts 实例管理
let echarts: any = null;

export function OrderCharts({
  chartData,
  isLoading = false,
}: OrderChartsProps) {
  // 图表容器引用
  const pieChart1Ref = useRef<HTMLDivElement>(null);
  const pieChart2Ref = useRef<HTMLDivElement>(null);
  const pieChart3Ref = useRef<HTMLDivElement>(null);
  const pieChart4Ref = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChart1Ref = useRef<HTMLDivElement>(null);
  const barChart2Ref = useRef<HTMLDivElement>(null);
  const barChart3Ref = useRef<HTMLDivElement>(null);

  // 图表实例存储
  const chartInstancesRef = useRef<any[]>([]);

  // 动态加载 ECharts
  useEffect(() => {
    const loadECharts = async () => {
      if (!echarts) {
        try {
          echarts = await import('echarts');
        } catch (error) {
          console.error('Failed to load ECharts:', error);
        }
      }
    };
    loadECharts();
  }, []);

  // 渲染图表
  useEffect(() => {
    if (!echarts || !chartData || !chartData.charts || isLoading) return;

    const charts = chartData.charts;

    // 清理旧的图表实例
    chartInstancesRef.current.forEach(instance => {
      if (instance) {
        echarts.dispose(instance.getDom());
      }
    });
    chartInstancesRef.current = [];

    const chartRefs = [
      pieChart1Ref, pieChart2Ref, pieChart3Ref, pieChart4Ref,
      lineChartRef, barChart1Ref, barChart2Ref, barChart3Ref
    ];
    
    chartRefs.forEach(ref => {
      if (ref.current) {
        echarts.dispose(ref.current);
      }
    });

    // 通用的图表配置
    const commonConfig = {
      textStyle: {
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      backgroundColor: 'transparent',
    };

    // 1. 订单类型分布（饼图）
    if (pieChart1Ref.current && charts.order_type_distribution) {
      const chart = echarts.init(pieChart1Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = Object.entries(charts.order_type_distribution.data).map(([name, value]) => ({
        name,
        value
      }));
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.order_type_distribution.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        legend: {
          bottom: '10%',
          left: 'center',
          textStyle: {
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        series: [{
          name: '订单类型',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          labelLine: {
            show: false
          },
          data: data,
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        }]
      });
    }

    // 2. 每日订单量趋势（折线图）
    if (lineChartRef.current && charts.daily_orders_trend) {
      const chart = echarts.init(lineChartRef.current);
      chartInstancesRef.current.push(chart);
      
      const data = charts.daily_orders_trend.data as any[];
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.daily_orders_trend.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item.日期),
          axisLabel: {
            rotate: 45,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 11
          },
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '订单数量',
          nameTextStyle: {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          axisLabel: {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f3f4f6'
            }
          }
        },
        series: [{
          name: '订单数量',
          type: 'line',
          smooth: true,
          data: data.map(item => item.订单数量),
          lineStyle: {
            width: 3,
            color: '#3b82f6'
          },
          areaStyle: {
            opacity: 0.1,
            color: '#3b82f6'
          },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#3b82f6'
          }
        }]
      });
    }

    // 3. License类型销售分布（柱状图）
    if (barChart1Ref.current && charts.license_sales_distribution) {
      const chart = echarts.init(barChart1Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = charts.license_sales_distribution.data as any[];
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.license_sales_distribution.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        legend: {
          bottom: '10%',
          textStyle: {
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '20%',
          top: '15%',
          containLabel: true
        },
        xAxis: [
          {
            type: 'category',
            data: data.map(item => {
              const license = LICENSE_MAPPINGS[item.LicenseID as keyof typeof LICENSE_MAPPINGS];
              return license ? license.name : `License ${item.LicenseID}`;
            }),
            axisPointer: {
              type: 'shadow'
            },
            axisLabel: {
              rotate: 45,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 11
            },
            axisLine: {
              lineStyle: {
                color: '#e5e7eb'
              }
            }
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: '订单数量',
            position: 'left',
            nameTextStyle: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLabel: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLine: {
              lineStyle: {
                color: '#e5e7eb'
              }
            },
            splitLine: {
              lineStyle: {
                color: '#f3f4f6'
              }
            }
          },
          {
            type: 'value',
            name: '销售总额',
            position: 'right',
            nameTextStyle: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLabel: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLine: {
              lineStyle: {
                color: '#e5e7eb'
              }
            }
          }
        ],
        series: [
          {
            name: '订单数量',
            type: 'bar',
            data: data.map(item => item.订单数量),
            itemStyle: {
              color: '#3b82f6',
              borderRadius: [4, 4, 0, 0]
            }
          },
          {
            name: '销售总额',
            type: 'bar',
            yAxisIndex: 1,
            data: data.map(item => item.销售总额),
            itemStyle: {
              color: '#10b981',
              borderRadius: [4, 4, 0, 0]
            }
          }
        ]
      });
    }

    // 4. 币种收入分布（饼图）
    if (pieChart2Ref.current && charts.currency_revenue_distribution) {
      const chart = echarts.init(pieChart2Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = Object.entries(charts.currency_revenue_distribution.data).map(([name, value]) => ({
        name: name.toUpperCase(),
        value
      }));
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.currency_revenue_distribution.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        legend: {
          bottom: '10%',
          left: 'center',
          textStyle: {
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        series: [{
          name: '币种收入',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          data: data,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          color: ['#f59e0b', '#ef4444', '#8b5cf6']
        }]
      });
    }

    // 5. 支付平台统计（柱状图）
    if (barChart2Ref.current && charts.payment_platform_stats) {
      const chart = echarts.init(barChart2Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = charts.payment_platform_stats.data as any[];
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.payment_platform_stats.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        legend: {
          bottom: '10%',
          textStyle: {
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '20%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item.支付平台.charAt(0).toUpperCase() + item.支付平台.slice(1)),
          axisLabel: {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '订单数量',
            position: 'left',
            nameTextStyle: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLabel: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLine: {
              lineStyle: {
                color: '#e5e7eb'
              }
            },
            splitLine: {
              lineStyle: {
                color: '#f3f4f6'
              }
            }
          },
          {
            type: 'value',
            name: '销售总额',
            position: 'right',
            nameTextStyle: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLabel: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            axisLine: {
              lineStyle: {
                color: '#e5e7eb'
              }
            }
          }
        ],
        series: [
          {
            name: '订单数量',
            type: 'bar',
            data: data.map(item => item.订单数量),
            itemStyle: {
              color: '#dc2626',
              borderRadius: [4, 4, 0, 0]
            }
          },
          {
            name: '销售总额',
            type: 'bar',
            yAxisIndex: 1,
            data: data.map(item => item.销售总额),
            itemStyle: {
              color: '#0ea5e9',
              borderRadius: [4, 4, 0, 0]
            }
          }
        ]
      });
    }

    // 6. 订单状态分布（饼图）
    if (pieChart3Ref.current && charts.order_status_distribution) {
      const chart = echarts.init(pieChart3Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = Object.entries(charts.order_status_distribution.data).map(([name, value]) => ({
        name,
        value
      }));
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.order_status_distribution.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        legend: {
          bottom: '10%',
          left: 'center',
          textStyle: {
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        series: [{
          name: '订单状态',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          data: data,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          color: ['#10b981', '#ef4444', '#f59e0b', '#6b7280']
        }]
      });
    }

    // 7. 优惠券使用情况（柱状图）
    if (barChart3Ref.current && charts.coupon_usage) {
      const chart = echarts.init(barChart3Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = charts.coupon_usage.data as any[];
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.coupon_usage.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item.category),
          axisLabel: {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '订单数量',
          nameTextStyle: {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          axisLabel: {
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f3f4f6'
            }
          }
        },
        series: [{
          name: '订单数量',
          type: 'bar',
          data: data.map(item => item.count),
          itemStyle: {
            color: '#f97316',
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '50%'
        }]
      });
    }

    // 8. AB测试参与情况（饼图）
    if (pieChart4Ref.current && charts.ab_test_participation) {
      const chart = echarts.init(pieChart4Ref.current);
      chartInstancesRef.current.push(chart);
      
      const data = Object.entries(charts.ab_test_participation.data).map(([name, value]) => ({
        name,
        value
      }));
      
      chart.setOption({
        ...commonConfig,
        title: {
          text: charts.ab_test_participation.title,
          left: 'center',
          top: 20,
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e1e5e9',
          borderWidth: 1,
          textStyle: {
            color: '#374151'
          }
        },
        legend: {
          bottom: '10%',
          left: 'center',
          textStyle: {
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        series: [{
          name: 'AB测试',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          data: data,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          color: ['#8b5cf6', '#6b7280']
        }]
      });
    }

    // 清理函数
    return () => {
      chartInstancesRef.current.forEach(instance => {
        if (instance) {
          echarts.dispose(instance.getDom());
        }
      });
      chartInstancesRef.current = [];
    };
  }, [chartData, isLoading, echarts]);

  // 窗口大小变化时重新调整图表大小
  useEffect(() => {
    const handleResize = () => {
      chartInstancesRef.current.forEach(instance => {
        if (instance) {
          instance.resize();
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-1 mb-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || !chartData.charts) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">生成虚拟数据后查看图表分析</p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{chartData.error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          订单数据可视化分析
          <Badge variant="outline">实时图表</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览图表</TabsTrigger>
            <TabsTrigger value="sales">销售分析</TabsTrigger>
            <TabsTrigger value="behavior">用户行为</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={pieChart1Ref} className="h-80 w-full border rounded-lg" />
              <div ref={lineChartRef} className="h-80 w-full border rounded-lg" />
              <div ref={barChart1Ref} className="h-80 w-full border rounded-lg" />
              <div ref={pieChart2Ref} className="h-80 w-full border rounded-lg" />
            </div>
          </TabsContent>
          
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={barChart2Ref} className="h-80 w-full border rounded-lg" />
              <div ref={pieChart3Ref} className="h-80 w-full border rounded-lg" />
            </div>
          </TabsContent>
          
          <TabsContent value="behavior" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={barChart3Ref} className="h-80 w-full border rounded-lg" />
              <div ref={pieChart4Ref} className="h-80 w-full border rounded-lg" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}