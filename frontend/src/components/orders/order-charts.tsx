//frontend/src/components/orders/order-charts.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  // 受控Tab状态
  const [activeTab, setActiveTab] = useState<string>("overview");

  // 图表容器引用
  const pieChart1Ref = useRef<HTMLDivElement>(null);
  const pieChart2Ref = useRef<HTMLDivElement>(null);
  const pieChart3Ref = useRef<HTMLDivElement>(null);
  const pieChart4Ref = useRef<HTMLDivElement>(null);
  const pieChartCartRef = useRef<HTMLDivElement>(null); // 新增：购物车来源图表
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChart1Ref = useRef<HTMLDivElement>(null);
  const barChart2Ref = useRef<HTMLDivElement>(null);
  const barChart3Ref = useRef<HTMLDivElement>(null);

  // 🔧 修复：使用ref管理图表实例和初始化状态
  const chartInstancesRef = useRef<Map<string, any>>(new Map());
  const chartsInitializedRef = useRef<Record<string, boolean>>({});
  const lastChartDataRef = useRef<OrderChartsResponse | null>(null);
  // 🔧 新增：跟踪数据版本，用于判断是否需要重新初始化所有图表
  const dataVersionRef = useRef<string>('');

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

  // 🔧 修复：只清理所有图表实例（仅在数据变化时调用）
  const cleanupAllCharts = useCallback(() => {
    chartInstancesRef.current.forEach((instance, key) => {
      try {
        if (instance && typeof instance.dispose === 'function') {
          const dom = instance.getDom();
          if (dom && dom.parentNode) {
            instance.dispose();
          } else {
            echarts?.dispose(instance);
          }
        }
      } catch (error) {
        console.warn(`Error disposing chart ${key}:`, error);
        try {
          if (echarts && instance) {
            echarts.dispose(instance);
          }
        } catch (e) {
          // 静默处理内部清理错误
        }
      }
    });
    
    chartInstancesRef.current.clear();
    chartsInitializedRef.current = {};
  }, []);

  // 🔧 修复：安全的图表初始化函数，支持重新初始化检查
  const safeInitChart = useCallback((container: HTMLDivElement | null, chartId: string, forceReinit: boolean = false) => {
    if (!container || !echarts) return null;

    try {
      // 如果不是强制重新初始化且图表已存在，直接返回现有实例
      if (!forceReinit && chartInstancesRef.current.has(chartId)) {
        const existingInstance = chartInstancesRef.current.get(chartId);
        // 验证现有实例是否仍然有效
        try {
          const dom = existingInstance.getDom();
          if (dom && dom.parentNode) {
            return existingInstance;
          }
        } catch (e) {
          // 如果实例无效，继续创建新实例
        }
      }

      // 清理可能存在的旧实例
      const existingInstance = chartInstancesRef.current.get(chartId);
      if (existingInstance) {
        try {
          existingInstance.dispose();
        } catch (e) {
          console.warn(`Error disposing existing chart ${chartId}:`, e);
        }
        chartInstancesRef.current.delete(chartId);
      }

      // 检查DOM元素上是否已经有ECharts实例
      const domInstance = echarts.getInstanceByDom(container);
      if (domInstance) {
        try {
          domInstance.dispose();
        } catch (e) {
          console.warn(`Error disposing DOM chart instance for ${chartId}:`, e);
        }
      }

      // 创建新的图表实例
      const instance = echarts.init(container);
      chartInstancesRef.current.set(chartId, instance);
      
      return instance;
    } catch (error) {
      console.error(`Error initializing chart ${chartId}:`, error);
      return null;
    }
  }, []);

  // 🔧 通用图表配置
  const getCommonConfig = () => ({
    textStyle: {
      fontFamily: 'Inter, system-ui, sans-serif'
    },
    backgroundColor: 'transparent',
  });

  // 🔧 修复：概览图表初始化函数 - 重新布局
  const initializeOverviewCharts = useCallback((forceReinit: boolean = false) => {
    if (!echarts || !chartData || !chartData.charts || isLoading) return;

    const charts = chartData.charts;
    const commonConfig = getCommonConfig();

    // 1. 每日订单量趋势（折线图）- 全宽显示
    if (lineChartRef.current && charts.daily_orders_trend && (forceReinit || !chartsInitializedRef.current['lineChart'])) {
      const chart = safeInitChart(lineChartRef.current, 'lineChart', forceReinit);
      if (chart) {
        const data = charts.daily_orders_trend.data as any[];
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.daily_orders_trend.title,
            left: 'center',
            top: 15, // 调整标题位置
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

        chartsInitializedRef.current['lineChart'] = true;
      }
    }

    // 2. License类型销售分布（柱状图）
    if (barChart1Ref.current && charts.license_sales_distribution && (forceReinit || !chartsInitializedRef.current['barChart1'])) {
      const chart = safeInitChart(barChart1Ref.current, 'barChart1', forceReinit);
      if (chart) {
        const data = charts.license_sales_distribution.data as any[];
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.license_sales_distribution.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
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

        chartsInitializedRef.current['barChart1'] = true;
      }
    }

    // 3. 购物车来源分布（饼图）- 新增
    if (pieChartCartRef.current && charts.cart_source_distribution && (forceReinit || !chartsInitializedRef.current['pieChartCart'])) {
      const chart = safeInitChart(pieChartCartRef.current, 'pieChartCart', forceReinit);
      if (chart) {
        const data = Object.entries(charts.cart_source_distribution.data).map(([name, value]) => ({
          name,
          value
        }));
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.cart_source_distribution.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
            left: 'center',
            textStyle: {
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          },
          series: [{
            name: '购物车来源',
            type: 'pie',
            radius: ['25%', '55%'], // 缩小饼图尺寸
            center: ['50%', '50%'], // 调整中心位置
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
            color: ['#06b6d4', '#84cc16'] // 为两个来源设置不同颜色
          }]
        });

        chartsInitializedRef.current['pieChartCart'] = true;
      }
    }
  }, [safeInitChart, chartData, isLoading]);

  // 修改销售分析图表初始化函数
  const initializeSalesCharts = useCallback((forceReinit: boolean = false) => {
    if (!echarts || !chartData || !chartData.charts || isLoading) return;

    const charts = chartData.charts;
    const commonConfig = getCommonConfig();

    // 1. 订单类型分布（饼图）- 从概览移过来
    if (pieChart1Ref.current && charts.order_type_distribution && (forceReinit || !chartsInitializedRef.current['pieChart1'])) {
      const chart = safeInitChart(pieChart1Ref.current, 'pieChart1', forceReinit);
      if (chart) {
        const data = Object.entries(charts.order_type_distribution.data).map(([name, value]) => ({
          name,
          value
        }));
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.order_type_distribution.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
            left: 'center',
            textStyle: {
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          },
          series: [{
            name: '订单类型',
            type: 'pie',
            radius: ['25%', '55%'], // 缩小饼图尺寸
            center: ['50%', '50%'], // 调整中心位置
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

        chartsInitializedRef.current['pieChart1'] = true;
      }
    }

    // 2. 币种收入分布（饼图）- 从概览移过来
    if (pieChart2Ref.current && charts.currency_revenue_distribution && (forceReinit || !chartsInitializedRef.current['pieChart2'])) {
      const chart = safeInitChart(pieChart2Ref.current, 'pieChart2', forceReinit);
      if (chart) {
        const data = Object.entries(charts.currency_revenue_distribution.data).map(([name, value]) => ({
          name: name.toUpperCase(),
          value
        }));
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.currency_revenue_distribution.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
            left: 'center',
            textStyle: {
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          },
          series: [{
            name: '币种收入',
            type: 'pie',
            radius: ['25%', '55%'], // 缩小饼图尺寸
            center: ['50%', '50%'], // 调整中心位置
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

        chartsInitializedRef.current['pieChart2'] = true;
      }
    }

    // 3. 支付平台统计（柱状图）
    if (barChart2Ref.current && charts.payment_platform_stats && (forceReinit || !chartsInitializedRef.current['barChart2'])) {
      const chart = safeInitChart(barChart2Ref.current, 'barChart2', forceReinit);
      if (chart) {
        const data = charts.payment_platform_stats.data as any[];
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.payment_platform_stats.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
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

        chartsInitializedRef.current['barChart2'] = true;
      }
    }

    // 4. 订单状态分布（饼图）
    if (pieChart3Ref.current && charts.order_status_distribution && (forceReinit || !chartsInitializedRef.current['pieChart3'])) {
      const chart = safeInitChart(pieChart3Ref.current, 'pieChart3', forceReinit);
      if (chart) {
        const data = Object.entries(charts.order_status_distribution.data).map(([name, value]) => ({
          name,
          value
        }));
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.order_status_distribution.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
            left: 'center',
            textStyle: {
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          },
          series: [{
            name: '订单状态',
            type: 'pie',
            radius: ['25%', '55%'], // 缩小饼图尺寸
            center: ['50%', '50%'], // 调整中心位置
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

        chartsInitializedRef.current['pieChart3'] = true;
      }
    }
  }, [safeInitChart, chartData, isLoading]);

  const initializeBehaviorCharts = useCallback((forceReinit: boolean = false) => {
    if (!echarts || !chartData || !chartData.charts || isLoading) return;

    const charts = chartData.charts;
    const commonConfig = getCommonConfig();

    // 7. 优惠券使用情况（柱状图）
    if (barChart3Ref.current && charts.coupon_usage && (forceReinit || !chartsInitializedRef.current['barChart3'])) {
      const chart = safeInitChart(barChart3Ref.current, 'barChart3', forceReinit);
      if (chart) {
        const data = charts.coupon_usage.data as any[];
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.coupon_usage.title,
            left: 'center',
            top: 15, // 调整标题位置
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

        chartsInitializedRef.current['barChart3'] = true;
      }
    }

    // 8. AB测试参与情况（饼图）
    if (pieChart4Ref.current && charts.ab_test_participation && (forceReinit || !chartsInitializedRef.current['pieChart4'])) {
      const chart = safeInitChart(pieChart4Ref.current, 'pieChart4', forceReinit);
      if (chart) {
        const data = Object.entries(charts.ab_test_participation.data).map(([name, value]) => ({
          name,
          value
        }));
        
        chart.setOption({
          ...commonConfig,
          title: {
            text: charts.ab_test_participation.title,
            left: 'center',
            top: 15, // 调整标题位置
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
            bottom: '5%', // 调整图例位置
            left: 'center',
            textStyle: {
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          },
          series: [{
            name: 'AB测试',
            type: 'pie',
            radius: ['25%', '55%'], // 缩小饼图尺寸
            center: ['50%', '50%'], // 调整中心位置
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

        chartsInitializedRef.current['pieChart4'] = true;
      }
    }
  }, [safeInitChart, chartData, isLoading]);

  // 🔧 修复：Tab切换处理函数，不清理现有图表
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    
    // 🔧 延迟初始化对应Tab的图表，但不清理其他Tab的图表
    setTimeout(() => {
      switch (value) {
        case 'overview':
          initializeOverviewCharts();
          break;
        case 'sales':
          initializeSalesCharts();
          break;
        case 'behavior':
          initializeBehaviorCharts();
          break;
      }
    }, 150);
  }, [initializeOverviewCharts, initializeSalesCharts, initializeBehaviorCharts]);

  // 🔧 修复：主要的图表渲染效果，只在数据真正变化时清理
  useEffect(() => {
    if (!echarts || !chartData || !chartData.charts || isLoading) {
      return;
    }

    // 🔧 生成数据版本标识用于比较
    const newDataVersion = JSON.stringify({
      chartsKeys: Object.keys(chartData.charts),
      dataLength: JSON.stringify(chartData).length,
      timestamp: Date.now(),
      // 使用图表数据的内容哈希来检测变化
      dataHash: JSON.stringify(chartData.charts).slice(0, 100)
    });

    // 🔧 只有在数据真正变化时才清理并重新初始化所有图表
    const isDataChanged = dataVersionRef.current !== newDataVersion;
    
    if (isDataChanged) {
      console.log('Chart data changed, reinitializing all charts');
      dataVersionRef.current = newDataVersion;
      lastChartDataRef.current = chartData;
      
      // 清理所有旧图表
      cleanupAllCharts();
      
      // 延迟初始化当前Tab的图表
      const timer = setTimeout(() => {
        const forceReinit = true;
        switch (activeTab) {
          case 'overview':
            initializeOverviewCharts(forceReinit);
            break;
          case 'sales':
            initializeSalesCharts(forceReinit);
            break;
          case 'behavior':
            initializeBehaviorCharts(forceReinit);
            break;
        }
      }, 200);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // 🔧 数据没有变化，只确保当前Tab的图表已初始化
      const timer = setTimeout(() => {
        switch (activeTab) {
          case 'overview':
            initializeOverviewCharts();
            break;
          case 'sales':
            initializeSalesCharts();
            break;
          case 'behavior':
            initializeBehaviorCharts();
            break;
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [chartData, isLoading, activeTab, cleanupAllCharts, initializeOverviewCharts, initializeSalesCharts, initializeBehaviorCharts]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      cleanupAllCharts();
    };
  }, [cleanupAllCharts]);

  // 窗口大小变化时重新调整图表大小
  useEffect(() => {
    const handleResize = () => {
      chartInstancesRef.current.forEach((instance) => {
        if (instance && typeof instance.resize === 'function') {
          try {
            const dom = instance.getDom();
            if (dom && dom.parentNode) {
              instance.resize();
            }
          } catch (e) {
            console.warn('Error resizing chart:', e);
          }
        }
      });
    };

    const debouncedResize = debounce(handleResize, 300);
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);

  // 防抖函数
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览图表</TabsTrigger>
            <TabsTrigger value="sales">销售分析</TabsTrigger>
            <TabsTrigger value="behavior">用户行为</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* 每日订单趋势占整行 */}
            <div className="w-full">
              <div ref={lineChartRef} className="h-80 w-full border rounded-lg" />
            </div>
            {/* License销售分布和购物车来源分布并排 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={barChart1Ref} className="h-80 w-full border rounded-lg" />
              <div ref={pieChartCartRef} className="h-80 w-full border rounded-lg" />
            </div>
          </TabsContent>
          
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={pieChart1Ref} className="h-80 w-full border rounded-lg" />
              <div ref={pieChart2Ref} className="h-80 w-full border rounded-lg" />
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