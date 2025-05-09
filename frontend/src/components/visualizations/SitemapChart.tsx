import React, { useEffect, useRef, useState } from 'react';
import { TreeVisualizationData, GraphVisualizationData } from '../../types/sitemap';

interface SitemapChartProps {
  visualizationData: TreeVisualizationData | GraphVisualizationData | null;
  visualizationType?: string;
  width?: number;
  height?: number;
  isLoading?: boolean;
}

const SitemapChart: React.FC<SitemapChartProps> = ({
  visualizationData,
  visualizationType = 'tree',
  width = 800,
  height = 600,
  isLoading = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const newChart = echarts.init(chartRef.current);
          setChart(newChart);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load ECharts:', error);
        setError('加载图表库失败');
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
      let option;

      // 根据可视化类型选择不同的配置
      if (visualizationType === 'tree') {
        // 处理树形图
        option = {
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
                fontSize: 12,
                formatter: (params: any) => {
                  return params.data.name;
                }
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
      } else if (visualizationType === 'graph') {
        // 处理关系图
        const graphData = visualizationData as GraphVisualizationData;
        
        // 确保节点和连接有效
        if (!graphData.nodes || !graphData.links || graphData.nodes.length === 0) {
          setError('关系图数据无效');
          return;
        }
        
        option = {
          tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
              if (params.dataType === 'node') {
                return `<div class="font-bold">${params.data.name}</div>`;
              }
              return '';
            }
          },
          legend: {
            data: ['域名', '路径']
          },
          series: [
            {
              type: 'graph',
              layout: 'force',
              data: graphData.nodes.map(node => ({
                ...node,
                name: node.name || '未命名',
                itemStyle: {
                  color: node.category === 0 ? '#0ea5e9' : '#22c55e'
                }
              })),
              links: graphData.links,
              categories: [
                { name: '域名' },
                { name: '路径' }
              ],
              roam: true,
              label: {
                show: true,
                position: 'right',
                formatter: '{b}'
              },
              lineStyle: {
                color: 'source',
                curveness: 0.3
              },
              emphasis: {
                focus: 'adjacency',
                lineStyle: {
                  width: 3
                }
              },
              force: {
                repulsion: 100,
                edgeLength: 50
              }
            }
          ]
        };
      } else {
        setError('不支持的可视化类型');
        return;
      }

      chart.setOption(option, true);
      chart.resize();
    } catch (error) {
      console.error('Error rendering chart:', error);
      setError('渲染图表时发生错误');
    }
  }, [chart, visualizationData, visualizationType]);

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

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 text-red-600 rounded-lg"
        style={{ width: '100%', height: 200 }}
      >
        <div className="text-center">
          <p className="font-medium">图表加载错误</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-3">请尝试切换可视化类型或刷新页面</p>
        </div>
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
          {visualizationType === 'tree' ? (
            <>
              <li>点击节点可以展开/折叠子节点</li>
              <li>鼠标悬停在节点上可以查看详细信息</li>
              <li>双击节点可以聚焦该节点</li>
              <li>树形图初始展开到第3层</li>
            </>
          ) : (
            <>
              <li>拖动节点可以调整位置</li>
              <li>滚轮可以缩放图表</li>
              <li>点击节点可以查看详细信息</li>
              <li>拖动空白处可以平移整个图</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SitemapChart;