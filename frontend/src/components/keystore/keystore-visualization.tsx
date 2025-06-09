// src/components/keystore/keystore-visualization.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, ZoomIn, ZoomOut, Download, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface KeystoreVisualizationProps {
  visualizationData: any;
  isLoading?: boolean;
  height?: number;
  showToolbar?: boolean;
}

export function KeystoreVisualization({
  visualizationData,
  isLoading = false,
  height = 500,
  showToolbar = true
}: KeystoreVisualizationProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 客户端渲染标记
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 动态加载ECharts库
  useEffect(() => {
    if (!isClient) return;

    const loadECharts = async () => {
      try {
        const echarts = await import('echarts');
        
        if (chartRef.current) {
          const chartInstance = echarts.init(chartRef.current);
          setChart(chartInstance);
          
          // 监听窗口大小变化
          const handleResize = () => {
            chartInstance.resize();
          };
          
          window.addEventListener('resize', handleResize);
          
          return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.dispose();
          };
        }
      } catch (error) {
        console.error('加载ECharts库失败:', error);
        setError('无法加载图表库');
      }
    };

    loadECharts();
  }, [isClient]);

  // 更新图表数据
  useEffect(() => {
    if (!chart || !visualizationData) return;

    const option = {
      title: {
        text: '关键词组关系图',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const data = params.data;
            let content = `<div class="font-bold">${data.name}</div>`;
            if (data.value) {
              content += `<div class="text-sm">关键词数量: ${data.value}</div>`;
            }
            return content;
          } else if (params.dataType === 'edge') {
            const source = params.data.source;
            const target = params.data.target;
            if (source.includes('keyword_')) {
              return `<div>重复关键词连接</div><div class="text-sm">关键词: ${source.replace('keyword_', '')}</div>`;
            }
            return `<div>关系连接</div>`;
          }
          return '';
        }
      },
      legend: {
        top: 30,
        data: visualizationData.categories?.map((cat: any) => cat.name) || []
      },
      series: [
        {
          name: '关键词组关系',
          type: 'graph',
          layout: 'force',
          data: visualizationData.nodes || [],
          links: visualizationData.links || [],
          categories: visualizationData.categories || [],
          roam: true,
          focusNodeAdjacency: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}',
            fontSize: 10
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3,
            opacity: 0.7
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          },
          force: {
            repulsion: 200,
            gravity: 0.1,
            edgeLength: 80,
            layoutAnimation: true
          }
        }
      ]
    };

    chart.setOption(option, true);
  }, [chart, visualizationData]);

  const handleZoomIn = () => {
    if (chart) {
      chart.dispatchAction({
        type: 'restore'
      });
    }
  };

  const handleZoomOut = () => {
    if (chart) {
      chart.dispatchAction({
        type: 'dataZoom',
        start: 10,
        end: 90
      });
    }
  };

  const handleRefresh = () => {
    if (chart) {
      chart.clear();
      // 重新渲染图表逻辑
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词组关系图</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[400px] rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词组关系图</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {error}. 请刷新页面重试。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!visualizationData || !visualizationData.nodes || visualizationData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>关键词组关系图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Info className="h-10 w-10 mb-2" />
            <p>暂无可视化数据</p>
            <p className="text-sm">上传关键词库文件以查看组关系图</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>关键词组关系图</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                {visualizationData.nodes?.length || 0} 个节点
              </Badge>
              <Badge variant="outline">
                {visualizationData.links?.length || 0} 个连接
              </Badge>
            </div>
          </div>
          
          {showToolbar && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                title="放大"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                title="缩小"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                title="刷新"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={chartRef} 
          style={{ width: '100%', height: `${height}px` }}
          className="bg-background rounded border"
        />
        
        {showToolbar && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>• 拖拽节点可以调整位置</div>
                <div>• 滚轮可以缩放图表</div>
                <div>• 点击节点查看详细信息</div>
                <div>• 蓝色节点代表关键词组，绿色节点代表关键词族，黄色节点代表重复关键词</div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}