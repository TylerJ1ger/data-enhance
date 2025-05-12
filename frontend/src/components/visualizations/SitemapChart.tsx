import React, { useEffect, useRef, useState } from 'react';
import { TreeVisualizationData } from '../../types/sitemap';

interface SitemapChartProps {
  visualizationData: TreeVisualizationData | null;
  visualizationType?: string;
  width?: number;
  height?: number;
  isLoading?: boolean;
  chartConfig?: {
    maxNodes?: number;
    initialDepth?: number;
    enableAnimation?: boolean;
    labelStrategy?: 'always' | 'hover' | 'none';
  };
}

const SitemapChart: React.FC<SitemapChartProps> = ({
  visualizationData,
  visualizationType = 'tree',
  width = 800,
  height = 600,
  isLoading = false,
  chartConfig = {},
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
  
  // 默认图表配置
  const defaultConfig = {
    maxNodes: 300,
    initialDepth: 3,
    enableAnimation: true,
    labelStrategy: 'hover' as 'always' | 'hover' | 'none'
  };
  
  // 合并用户配置与默认配置
  const config = { ...defaultConfig, ...chartConfig };

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

  // 识别哈希路径的函数
  const isHashLikePath = (name: string): boolean => {
    // 识别常见的哈希格式: 长度超过12且包含随机字符
    return typeof name === 'string' && 
           name.length >= 12 && 
           /^[a-zA-Z0-9_-]+$/.test(name) &&
           // 增加熵检测 - 如果有连续的字母和数字则更可能是哈希
           /[0-9]{2,}/.test(name) && 
           /[a-zA-Z]{2,}/.test(name);
  };

  // 处理大量数据的函数 - 限制深度和处理哈希路径
  const processLargeDataset = (data: any, depth: number = 0, maxDepth: number = config.initialDepth): any => {
    if (!data) return null;
    
    // 创建一个新对象而不是修改原始对象
    const result = { ...data };
    
    // 处理children
    if (result.children && Array.isArray(result.children)) {
      // 检查是否有许多哈希路径子节点
      const hashLikeChildren = result.children.filter(child => 
        isHashLikePath(child.name)
      );
      
      // 如果哈希路径子节点超过5个，只保留前5个作为示例
      if (hashLikeChildren.length > 5) {
        // 先提取非哈希路径的节点
        const normalChildren = result.children.filter(child => 
          !isHashLikePath(child.name)
        );
        
        // 选择5个哈希路径节点作为示例
        const exampleHashChildren = hashLikeChildren.slice(0, 5);
        
        // 创建一个"更多..."节点来表示其余的哈希节点
        const remainingCount = hashLikeChildren.length - 5;
        if (remainingCount > 0) {
          const moreNode = {
            name: `更多 (${remainingCount} 个)`,
            path: result.path ? `${result.path}/more` : 'more',
            children: [],
            collapsed: true, // 标记为默认收起
            itemStyle: {
              color: '#cccccc'
            }
          };
          
          // 设置处理后的children
          result.children = [...normalChildren, ...exampleHashChildren, moreNode];
        } else {
          result.children = [...normalChildren, ...exampleHashChildren];
        }
      }
      
      // 根据深度决定是否继续处理下级节点
      if (depth < maxDepth) {
        // 递归处理每个子节点
        result.children = result.children.map(child => 
          processLargeDataset(child, depth + 1, maxDepth)
        );
      } else {
        // 超出初始显示深度，设置折叠标记
        result.children = result.children.map(child => ({
          ...child,
          collapsed: true // 标记为折叠状态
        }));
      }
    }
    
    return result;
  };

  // 统计节点总数的辅助函数
  const countNodes = (node: any): number => {
    if (!node) return 0;
    let count = 1; // 当前节点
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        count += countNodes(child);
      });
    }
    
    return count;
  };

  // 更新图表
  useEffect(() => {
    if (!chart || !visualizationData) return;

    try {
      console.log('Updating chart with visualization type:', visualizationType);
      
      // 检查数据量，设置性能警告
      if (visualizationData) {
        const nodeCount = countNodes(visualizationData);
        setShowPerformanceWarning(nodeCount > 500);
        console.log(`Total node count: ${nodeCount}`);
      }
      
      // 处理数据集 - 应用深度限制和哈希路径处理
      const processedData = processLargeDataset(
        visualizationData, 
        0, 
        config.initialDepth
      );
      
      // 准备图表选项
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
                data: Array.isArray(processedData) ? processedData : [processedData],
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
                  show: config.labelStrategy !== 'none',
                  formatter: (params: any) => {
                    return params.data.name || 'Unnamed';
                  }
                },
                leaves: {
                  label: {
                    position: 'right',
                    verticalAlign: 'middle',
                    align: 'left',
                    show: config.labelStrategy === 'always'
                  }
                },
                emphasis: {
                  focus: 'descendant',
                  label: {
                    show: config.labelStrategy !== 'none'
                  }
                },
                expandAndCollapse: true,
                animationDuration: config.enableAnimation ? 550 : 0,
                animationDurationUpdate: config.enableAnimation ? 750 : 0,
                initialTreeDepth: config.initialDepth
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
                data: Array.isArray(processedData) ? processedData : [processedData],
                top: '5%',
                left: '0',
                bottom: '5%',
                right: '0',
                symbolSize: 7,
                initialTreeDepth: config.initialDepth,
                layout: 'radial',
                orient: 'RL', // 从右到左布局
                label: {
                  position: 'right',
                  verticalAlign: 'middle',
                  align: 'left',
                  fontSize: 12,
                  rotate: 0,
                  show: config.labelStrategy !== 'none',
                  formatter: (params: any) => {
                    return params.data.name || 'Unnamed';
                  }
                },
                leaves: {
                  label: {
                    position: 'right',
                    verticalAlign: 'middle',
                    align: 'left',
                    show: config.labelStrategy === 'always'
                  }
                },
                emphasis: {
                  focus: 'descendant',
                  label: {
                    show: config.labelStrategy !== 'none'
                  }
                },
                expandAndCollapse: true,
                animationDuration: config.enableAnimation ? 550 : 0,
                animationDurationUpdate: config.enableAnimation ? 750 : 0
              }
            ]
          };
          break;

        case 'graph-label-overlap':
          // 带标签的网络图
          const graphData = prepareGraphData(processedData);
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
                  show: config.labelStrategy === 'always',
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
                  },
                  label: {
                    show: config.labelStrategy !== 'none'
                  }
                },
                force: {
                  repulsion: 100,
                  edgeLength: 50,
                  gravity: 0.1,
                  layoutAnimation: config.enableAnimation
                },
                // 性能优化选项
                progressive: 300,
                progressiveThreshold: 500,
                animation: config.enableAnimation
              }
            ]
          };
          break;

        case 'graph-circular-layout':
          // 环形布局图
          const circularData = prepareGraphData(processedData);
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
                  show: config.labelStrategy === 'always',
                  position: 'right',
                  formatter: (params: any) => {
                    return params.name || 'Unnamed';
                  }
                },
                emphasis: {
                  focus: 'adjacency',
                  lineStyle: {
                    width: 3
                  },
                  label: {
                    show: config.labelStrategy !== 'none'
                  }
                },
                // 性能优化选项
                progressive: 300,
                progressiveThreshold: 500,
                animation: config.enableAnimation,
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
          const webkitData = prepareGraphData(processedData);
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
                animation: config.enableAnimation,
                draggable: true,
                data: webkitData.nodes,
                links: webkitData.links,
                categories: [
                  { name: '域名' },
                  { name: '路径' }
                ],
                roam: true,
                label: {
                  show: config.labelStrategy === 'always',
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
                  layoutAnimation: config.enableAnimation,
                  friction: 0.1 // 增加阻力以稳定布局
                },
                lineStyle: {
                  opacity: 0.9,
                  width: 1,
                  curveness: 0
                },
                emphasis: {
                  label: {
                    show: config.labelStrategy !== 'none'
                  }
                },
                // 性能优化选项
                progressive: 300,
                progressiveThreshold: 500
              }
            ]
          };
          break;

        case 'graph-npm':
          // NPM依赖关系图
          const npmData = prepareGraphData(processedData);
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
                  show: config.labelStrategy === 'always',
                  formatter: (params: any) => {
                    return params.name || 'Unnamed';
                  }
                },
                force: {
                  repulsion: 150,
                  edgeLength: [50, 150],
                  gravity: 0.1,
                  layoutAnimation: config.enableAnimation
                },
                edgeSymbol: ['none', 'arrow'],
                edgeSymbolSize: [0, 8],
                lineStyle: {
                  color: 'source',
                  width: 1.5
                },
                emphasis: {
                  focus: 'adjacency',
                  label: {
                    show: config.labelStrategy !== 'none'
                  }
                },
                // 性能优化选项
                progressive: 300,
                progressiveThreshold: 500,
                animation: config.enableAnimation
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
                data: Array.isArray(processedData) ? processedData : [processedData],
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
                animationDuration: config.enableAnimation ? 550 : 0,
                animationDurationUpdate: config.enableAnimation ? 750 : 0,
                initialTreeDepth: config.initialDepth
              }
            ]
          };
      }

      // 为大数据集设置额外的优化选项
      if (showPerformanceWarning) {
        // 设置渐进渲染
        option.progressive = 200;
        option.progressiveThreshold = 500;
        
        // 控制动画
        if (!config.enableAnimation) {
          option.animation = false;
        }
        
        // 控制标签显示
        if (config.labelStrategy === 'hover' && option.series && option.series[0]) {
          option.series[0].label.show = false;
          option.series[0].emphasis = option.series[0].emphasis || {};
          option.series[0].emphasis.label = { 
            show: true,
            fontSize: 12
          };
        }
      }

      chart.setOption(option, true);
      chart.resize();

      // 添加节点点击事件处理
      chart.off('click');
      chart.on('click', (params: any) => {
        if (params.dataType === 'node' && params.data) {
          // 如果是"更多..."节点，可以提供特殊处理
          if (params.data.name && params.data.name.startsWith('更多 (')) {
            console.log('点击了"更多"节点:', params.data);
            // 这里可以添加自定义处理，例如展开更多节点
          }
        }
      });

      // 数据加载成功后清除错误状态
      if (error) {
        setError(null);
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
      setError(`渲染图表时发生错误: ${error.message || '未知错误'}`);
    }
  }, [chart, visualizationData, visualizationType, config]);

  // 修改 SitemapChart.tsx 中的 prepareGraphData 函数
  const prepareGraphData = (data: any) => {
    console.log('Preparing graph data from:', data);

    // 检测数据是否已经是图形结构
    if (data && data.nodes && data.links && Array.isArray(data.nodes) && Array.isArray(data.links)) {
      console.log('Data is already in graph format, returning as is');
      return data; // 数据已经是图结构，直接返回
    }

    const nodes: any[] = [];
    const links: any[] = [];
    let nodeId = 0;

    // 用于跟踪节点ID的映射
    const nodeMap = new Map();

    // 递归处理节点
    const processNode = (node: any, parentId: number | null = null, category: number = 0, depth: number = 0) => {
      if (!node || typeof node !== 'object') {
        console.error('Invalid node:', node);
        return;
      }

      // 如果深度超过初始显示深度且不是强制显示的节点，跳过
      if (depth > config.initialDepth && !node.forceDisplay) {
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
        itemStyle: node.itemStyle || {
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
        // 检查是否有哈希路径子节点
        const hashLikeChildren = node.children.filter((child: any) => 
          isHashLikePath(child.name)
        );
        
        let childrenToProcess = node.children;
        
        // 如果哈希路径子节点太多，只处理部分
        if (hashLikeChildren.length > 5) {
          const normalChildren = node.children.filter((child: any) => 
            !isHashLikePath(child.name)
          );
          
          // 选择5个哈希路径节点作为示例
          const exampleHashChildren = hashLikeChildren.slice(0, 5);
          
          // 创建一个"更多..."节点来表示其余的哈希节点
          if (hashLikeChildren.length > 5) {
            const moreNode = {
              name: `更多 (${hashLikeChildren.length - 5} 个)`,
              path: node.path ? `${node.path}/more` : 'more',
              children: [],
              itemStyle: {
                color: '#cccccc'
              }
            };
            
            childrenToProcess = [...normalChildren, ...exampleHashChildren, moreNode];
          } else {
            childrenToProcess = [...normalChildren, ...exampleHashChildren];
          }
        }
        
        childrenToProcess.forEach((child: any) => {
          processNode(child, currentId, 1, depth + 1);
        });
      }
    };

    // 处理根节点 - 注意处理不同的数据结构
    if (data) {
      // 如果是数组并且只有一个元素，直接处理该元素
      if (Array.isArray(data) && data.length === 1) {
        processNode(data[0], null, 0, 0);
      }
      // 如果是单个对象，直接处理
      else if (!Array.isArray(data) && typeof data === 'object') {
        // 如果是包含children属性的对象
        if (data.children && Array.isArray(data.children)) {
          processNode(data, null, 0, 0);
        } else {
          processNode(data, null, 0, 0);
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
          processNode(node, rootId, 1, 0);
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
      {showPerformanceWarning && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
          <div className="font-medium">性能提示</div>
          <p>当前数据包含大量URL节点，已优化显示。请注意:</p>
          <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
            <li>已将URL结构限制为初始显示{config.initialDepth}层深度</li>
            <li>节点可点击展开/折叠查看更多内容</li>
            <li>已对重复性哈希路径进行了智能合并</li>
            <li>过大的数据集可能会影响浏览器性能</li>
          </ul>
        </div>
      )}
      
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
              <li>树形图初始展开到第{config.initialDepth}层</li>
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