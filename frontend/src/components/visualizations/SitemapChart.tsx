import React, { useEffect, useRef, useState } from 'react';
import { TreeVisualizationData } from '../../types/sitemap';

interface SitemapChartProps {
  visualizationData: TreeVisualizationData | null;
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
      console.log('Updating chart with visualization type:', visualizationType);
      console.log('Visualization data:', visualizationData);
      
      let option;

      // 根据可视化类型选择不同的配置
      switch (visualizationType) {
        case 'tree':
          // 标准树形图
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
                data: Array.isArray(visualizationData) ? visualizationData : [visualizationData],
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
                    return params.data.name || 'Unnamed';
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
          break;

        case 'tree-radial':
          // 径向树形图
          option = {
            tooltip: {
              trigger: 'item',
              formatter: (params: any) => {
                const { name, path } = params.data;
                let tooltipContent = `<div class="font-bold">${name || 'Unnamed'}</div>`;
                if (path) {
                  tooltipContent += `<div class="text-sm">路径: ${path}</div>`;
                }
                return tooltipContent;
              }
            },
            series: [
              {
                type: 'tree',
                data: Array.isArray(visualizationData) ? visualizationData : [visualizationData],
                top: '5%',
                left: '0',
                bottom: '5%',
                right: '0',
                symbolSize: 7,
                initialTreeDepth: 3,
                layout: 'radial',
                orient: 'RL', // 从右到左布局
                label: {
                  position: 'right',
                  verticalAlign: 'middle',
                  align: 'left',
                  fontSize: 12,
                  rotate: 0,
                  formatter: (params: any) => {
                    return params.data.name || 'Unnamed';
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
                animationDurationUpdate: 750
              }
            ]
          };
          break;

        case 'graph-label-overlap':
          // 带标签的网络图
          const graphData = prepareGraphData(visualizationData);
          option = {
            tooltip: {
              trigger: 'item',
              formatter: (params: any) => {
                if (params.dataType === 'node') {
                  let content = `<div class="font-bold">${params.name || 'Unnamed'}</div>`;
                  if (params.data && params.data.path) {
                    content += `<div class="text-sm">路径: ${params.data.path}</div>`;
                  }
                  return content;
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
                data: graphData.nodes,
                links: graphData.links,
                categories: [
                  { name: '域名' },
                  { name: '路径' }
                ],
                roam: true,
                label: {
                  show: true,
                  position: 'right',
                  formatter: (params: any) => {
                    return params.name || 'Unnamed';
                  }
                },
                labelLayout: {
                  hideOverlap: true
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
                  edgeLength: 50,
                  gravity: 0.1,
                  layoutAnimation: true
                }
              }
            ]
          };
          break;

        case 'graph-circular-layout':
          // 环形布局图
          const circularData = prepareGraphData(visualizationData);
          option = {
            tooltip: {
              trigger: 'item',
              formatter: (params: any) => {
                if (params.dataType === 'node') {
                  let content = `<div class="font-bold">${params.name || 'Unnamed'}</div>`;
                  if (params.data && params.data.path) {
                    content += `<div class="text-sm">路径: ${params.data.path}</div>`;
                  }
                  return content;
                }
                return '';
              }
            },
            legend: {
              data: ['域名', '路径']
            },
            series: [
              {
                name: 'Sitemap结构',
                type: 'graph',
                layout: 'circular',
                circular: {
                  rotateLabel: true
                },
                data: circularData.nodes,
                links: circularData.links,
                categories: [
                  { name: '域名' },
                  { name: '路径' }
                ],
                roam: true,
                label: {
                  show: true,
                  position: 'right',
                  formatter: (params: any) => {
                    return params.name || 'Unnamed';
                  }
                },
                emphasis: {
                  focus: 'adjacency',
                  lineStyle: {
                    width: 3
                  }
                },
                // 确保环形布局更加均匀
                symbolSize: (value: any, params: any) => {
                  return params.data.symbolSize || 10;
                }
              }
            ]
          };
          break;

        case 'graph-webkit-dep':
          // WebKit依赖图
          const webkitData = prepareGraphData(visualizationData);
          option = {
            tooltip: {
              trigger: 'item',
              formatter: (params: any) => {
                if (params.dataType === 'node') {
                  let content = `<div class="font-bold">${params.name || 'Unnamed'}</div>`;
                  if (params.data && params.data.path) {
                    content += `<div class="text-sm">路径: ${params.data.path}</div>`;
                  }
                  return content;
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
                animation: true,
                draggable: true,
                data: webkitData.nodes,
                links: webkitData.links,
                categories: [
                  { name: '域名' },
                  { name: '路径' }
                ],
                roam: true,
                label: {
                  show: true,
                  position: 'right',
                  formatter: (params: any) => {
                    return params.name || 'Unnamed';
                  }
                },
                force: {
                  // 仿WebKit依赖图布局
                  repulsion: 200,
                  gravity: 0.2,
                  edgeLength: 30,
                  layoutAnimation: true,
                  friction: 0.1 // 增加阻力以稳定布局
                },
                lineStyle: {
                  opacity: 0.9,
                  width: 1,
                  curveness: 0
                }
              }
            ]
          };
          break;
          
        case 'graph-npm':
          // NPM依赖关系图
          const npmData = prepareGraphData(visualizationData);
          option = {
            tooltip: {
              trigger: 'item',
              formatter: (params: any) => {
                if (params.dataType === 'node') {
                  let content = `<div class="font-bold">${params.name || 'Unnamed'}</div>`;
                  if (params.data && params.data.path) {
                    content += `<div class="text-sm">路径: ${params.data.path}</div>`;
                  }
                  return content;
                } else if (params.dataType === 'edge') {
                  return `<div class="text-sm">从 ${params.data.source.name || 'Unnamed'} 到 ${params.data.target.name || 'Unnamed'}</div>`;
                }
                return '';
              }
            },
            series: [
              {
                name: 'NPM依赖关系图',
                type: 'graph',
                layout: 'force',
                data: npmData.nodes,
                links: npmData.links,
                categories: [
                  { name: '域名' },
                  { name: '路径' }
                ],
                roam: true,
                label: {
                  show: true,
                  formatter: (params: any) => {
                    return params.name || 'Unnamed';
                  }
                },
                force: {
                  repulsion: 150,
                  edgeLength: [50, 150],
                  gravity: 0.1,
                  layoutAnimation: true
                },
                edgeSymbol: ['none', 'arrow'],
                edgeSymbolSize: [0, 8],
                lineStyle: {
                  color: 'source',
                  width: 1.5
                },
                emphasis: {
                  focus: 'adjacency'
                }
              }
            ]
          };
          break;

        default:
          // 默认使用标准树形图处理
          console.warn('未知的可视化类型:', visualizationType, '使用默认树形图');
          option = {
            tooltip: {
              trigger: 'item',
              formatter: (params: any) => {
                const { name, path, value } = params.data;
                let tooltipContent = `<div class="font-bold">${name || 'Unnamed'}</div>`;
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
                data: Array.isArray(visualizationData) ? visualizationData : [visualizationData],
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
                    return params.data.name || 'Unnamed';
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
      }

      chart.setOption(option, true);
      chart.resize();
      
      // 数据加载成功后清除错误状态
      if (error) {
        setError(null);
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
      setError(`渲染图表时发生错误: ${error.message || '未知错误'}`);
    }
  }, [chart, visualizationData, visualizationType]);

  // 将树形结构数据转换为图结构数据
  const prepareGraphData = (data: any) => {
    console.log('Preparing graph data from:', data);
    
    const nodes: any[] = [];
    const links: any[] = [];
    let nodeId = 0;
    
    // 用于跟踪节点ID的映射
    const nodeMap = new Map();
    
    // 递归处理节点
    const processNode = (node: any, parentId: number | null = null, category: number = 0) => {
      if (!node || typeof node !== 'object') {
        console.error('Invalid node:', node);
        return;
      }
      
      const currentId = nodeId++;
      const nodeName = node.name || 'Unnamed';
      nodeMap.set(nodeName + (node.path || ''), currentId);
      
      // 添加节点
      nodes.push({
        id: currentId,
        name: nodeName,
        category: category,
        value: node.value,
        path: node.path, // 保留路径信息用于提示
        symbolSize: category === 0 ? 30 : 20, // 域名节点更大
        itemStyle: {
          color: category === 0 ? '#0ea5e9' : '#22c55e'
        }
      });
      
      // 如果有父节点，添加连接
      if (parentId !== null) {
        links.push({
          source: parentId,
          target: currentId
        });
      }
      
      // 处理子节点
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        node.children.forEach((child: any) => {
          processNode(child, currentId, 1); // 子节点属于路径类别
        });
      }
    };
    
    // 处理根节点 - 注意处理不同的数据结构
    if (data) {
      // 如果是数组并且只有一个元素，直接处理该元素
      if (Array.isArray(data) && data.length === 1) {
        processNode(data[0], null, 0);
      } 
      // 如果是单个对象，直接处理
      else if (!Array.isArray(data) && typeof data === 'object') {
        // 如果是包含children属性的对象
        if (data.children && Array.isArray(data.children)) {
          processNode(data, null, 0);
        } else {
          processNode(data, null, 0);
        }
      } 
      // 多个根节点的情况
      else if (Array.isArray(data) && data.length > 1) {
        // 创建一个虚拟根节点
        const rootId = nodeId++;
        nodes.push({
          id: rootId,
          name: "Root",
          category: 0,
          symbolSize: 30,
          itemStyle: {
            color: '#0ea5e9'
          }
        });
        
        // 将所有节点连接到虚拟根节点
        data.forEach(node => {
          processNode(node, rootId, 1);
        });
      }
    }
    
    console.log('Processed nodes:', nodes.length, 'links:', links.length);
    return { nodes, links };
  };

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
          {visualizationType.startsWith('tree') ? (
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