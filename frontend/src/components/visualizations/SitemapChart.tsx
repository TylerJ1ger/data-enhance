import React, { useEffect, useRef, useState } from 'react';
import { TreeVisualizationData } from '../../types/sitemap';

interface SitemapChartProps {
  visualizationData: TreeVisualizationData | null;
  width?: number;
  height?: number;
  isLoading?: boolean;
}

const SitemapChart: React.FC<SitemapChartProps> = ({
  visualizationData,
  width = 800,
  height = 600,
  isLoading = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // 在客户端侧渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 动态导入ECharts
  useEffect(() => {
    if (!isClient) return;

    const loadECharts = async () => {
      try {
        const echarts = await import('echarts');
        if (chartRef.current) {
          setChart(echarts.init(chartRef.current));
        }
      } catch (error) {
        console.error('Failed to load ECharts:', error);
      }
    };

    loadECharts();

    return () => {
      if (chart) {
        chart.dispose();
      }
    };
  }, [isClient]);

  // 更新图表
  useEffect(() => {
    if (!chart || !visualizationData) return;

    try {
      // 准备配置项
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const { name, path, value } = params.data;
            let tooltipContent = `<div class="font-bold">${name}</div>`;
            if (path) {
              tooltipContent += `<div class="text-sm">路径: ${path}</div>`;
            }
            if (value) {
              tooltipContent += `<div class="text-xs">值: ${value}</div>`;
            }
            return tooltipContent;
          }
        },
        series: [
          {
            type: 'tree',
            data: [visualizationData],
            top: '1%',
            left: '7%',
            bottom: '1%',
            right: '20%',
            symbolSize: 7,
            label: {
              position: 'left',
              verticalAlign: 'middle',
              align: 'right',
              fontSize: 12
            },
            leaves: {
              label: {
                position: 'right',
                verticalAlign: 'middle',
                align: 'left'
              }
            },
            emphasis: {
              focus: 'descendant'
            },
            expandAndCollapse: true,
            animationDuration: 550,
            animationDurationUpdate: 750,
            initialTreeDepth: 3
          }
        ]
      };

      chart.setOption(option);
      chart.resize();
    } catch (error) {
      console.error('Error rendering chart:', error);
    }
  }, [chart, visualizationData]);

  // 窗口大小变化时调整图表
  useEffect(() => {
    if (!chart) return;

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chart]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50"
        style={{ width: '100%', height }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!visualizationData) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 text-gray-500"
        style={{ width: '100%', height }}
      >
        请先上传Sitemap文件查看可视化结果
      </div>
    );
  }

  return (
    <div>
      <div
        ref={chartRef}
        className="w-full bg-white rounded-lg border border-gray-200"
        style={{ height }}
      ></div>
      
      <div className="mt-4 px-4 py-3 bg-blue-50 text-blue-800 rounded-md text-sm">
        <div className="font-medium">使用提示</div>
        <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
          <li>点击节点可以展开/折叠子节点</li>
          <li>鼠标悬停在节点上可以查看详细信息</li>
          <li>双击节点可以聚焦该节点</li>
          <li>树形图初始展开到第3层</li>
        </ul>
      </div>
    </div>
  );
};

export default SitemapChart;