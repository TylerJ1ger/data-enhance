import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  
  // 新增：用于强制重新渲染的状态
  const [renderKey, setRenderKey] = useState(0);
  
  // 新增：记住上一次的visualization类型，以便检测变化
  const previousTypeRef = useRef<string>(visualizationType);
  
  // 新增：记录图表库是否已加载
  const echartsLoadedRef = useRef<boolean>(false);
  const echartsLibRef = useRef<any>(null);
  
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
    return () => {
      // 组件卸载时清理图表
      if (chart) {
        try {
          chart.dispose();
          console.log("图表实例已清理");
        } catch (e) {
          console.warn("清理图表实例时出错:", e);
        }
      }
    };
  }, []);

  // 识别哈希路径的函数
  const isHashLikePath = useCallback((name: string): boolean => {
    // 识别常见的哈希格式: 长度超过12且包含随机字符
    return typeof name === 'string' && 
           name.length >= 12 && 
           /^[a-zA-Z0-9_-]+$/.test(name) &&
           // 增加熵检测 - 如果有连续的字母和数字则更可能是哈希
           /[0-9]{2,}/.test(name) && 
           /[a-zA-Z]{2,}/.test(name);
  }, []);

  // 处理大量数据的函数 - 限制深度和处理哈希路径
  const processLargeDataset = useCallback((data: any, depth: number = 0, maxDepth: number = config.initialDepth): any => {
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
  }, [config.initialDepth, isHashLikePath]);

  // 统计节点总数的辅助函数
  const countNodes = useCallback((node: any): number => {
    if (!node) return 0;
    let count = 1; // 当前节点
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        count += countNodes(child);
      });
    }
    
    return count;
  }, []);

  // 预先加载ECharts库 - 只加载一次
  useEffect(() => {
    if (!isClient || echartsLoadedRef.current) return;

    const loadECharts = async () => {
      try {
        console.log("开始加载ECharts库");
        const echarts = await import('echarts');
        echartsLibRef.current = echarts;
        echartsLoadedRef.current = true;
        console.log("ECharts库加载成功");
        
        // 库加载成功后强制更新
        setRenderKey(prev => prev + 1);
      } catch (error) {
        console.error('加载ECharts库失败:', error);
        setError(`加载图表库失败: ${error.message || '未知错误'}`);
      }
    };

    loadECharts();
  }, [isClient]);

  // 初始化图表实例 - 当DOM准备好、库加载完毕或强制重新渲染时
  useEffect(() => {
    if (!isClient || !echartsLoadedRef.current || !echartsLibRef.current || !chartRef.current) return;
    
    // 清理之前的实例
    if (chart) {
      try {
        chart.dispose();
        console.log("清理旧图表实例");
      } catch (e) {
        console.warn("清理图表实例时出错:", e);
      }
    }
    
    console.log("初始化新图表实例");
    
    // 创建新实例 - 使用setTimeout确保DOM完全准备好
    setTimeout(() => {
      try {
        if (!chartRef.current) {
          console.error("图表容器DOM元素不存在");
          return;
        }
        
        const echarts = echartsLibRef.current;
        const newChart = echarts.init(chartRef.current, null, {
          renderer: 'canvas', // 明确使用canvas渲染器
          useDirtyRect: false // 禁用脏矩形优化
        });
        
        // 设置基本配置以确保容器可见
        newChart.setOption({
          backgroundColor: 'rgba(255,255,255,0.05)',
        }, true);
        
        setChart(newChart);
        setError(null);
        console.log("ECharts实例创建成功");
      } catch (error) {
        console.error('创建图表实例失败:', error);
        setError(`图表初始化失败: ${error.message || '未知错误'}`);
      }
    }, 50);
    
    // 注意：不要在此useEffect的依赖项中包含任何可能经常变化的值
    // 否则会频繁重建图表实例
  }, [isClient, renderKey, echartsLoadedRef.current, chartRef.current]);

  // 窗口大小变化时调整图表
  useEffect(() => {
    if (!chart) return;
    
    const handleResize = () => {
      try {
        chart.resize();
      } catch (e) {
        console.warn("调整图表大小时出错:", e);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 初始调整一次
    setTimeout(handleResize, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chart]);

  // 处理可视化类型变化 - 关键改进
  useEffect(() => {
    // 检测可视化类型是否变化
    if (visualizationType !== previousTypeRef.current) {
      console.log(`可视化类型从 ${previousTypeRef.current} 变为 ${visualizationType}`);
      previousTypeRef.current = visualizationType;
      
      // 强制重新渲染图表
      setRenderKey(prev => prev + 1);
    }
  }, [visualizationType]);

  // 生成树形图配置
  const getTreeOption = useCallback((data: any, isRadial: boolean) => {
    return {
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
          data: Array.isArray(data) ? data : [data],
          top: isRadial ? '5%' : '1%',
          left: isRadial ? '0' : '7%',
          bottom: isRadial ? '5%' : '1%',
          right: isRadial ? '0' : '20%',
          symbolSize: 7,
          label: {
            position: isRadial ? 'right' : 'left',
            verticalAlign: 'middle',
            align: isRadial ? 'left' : 'right',
            fontSize: 12,
            rotate: isRadial ? 0 : undefined,
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
          initialTreeDepth: config.initialDepth,
          layout: isRadial ? 'radial' : 'orthogonal',
          orient: isRadial ? 'RL' : 'LR'
        }
      ]
    };
  }, [config]);

  // 图形数据准备
  const prepareGraphData = useCallback((data: any) => {
    console.log('准备图形数据:', data);
    
    // 检测数据是否已经是图形结构
    if (data && data.nodes && data.links && Array.isArray(data.nodes) && Array.isArray(data.links)) {
      console.log('数据已是图形格式，直接返回');
      return data;
    }
    
    const nodes: any[] = [];
    const links: any[] = [];
    let nodeId = 0;
    
    // 用于跟踪节点ID的映射
    const nodeMap = new Map();
    
    // 如果数据为空，返回空结构
    if (!data) {
      console.warn('传入的数据为空');
      return { nodes, links };
    }
    
    // 递归处理节点的函数
    const processNode = (node: any, parentId: number | null = null, category: number = 0, depth: number = 0) => {
      // 数据有效性检查
      if (!node || typeof node !== 'object') {
        console.warn('无效节点:', node);
        return null;
      }
      
      // 深度限制检查 - 超过初始深度且不是强制显示节点，跳过
      if (depth > config.initialDepth && !node.forceDisplay) {
        return null;
      }
      
      // 获取节点名
      const nodeName = node.name || 'Unnamed';
      const nodePath = node.path || '';
      const nodeKey = `${nodeName}-${nodePath}-${depth}`;
      
      // 检查节点是否已存在
      if (nodeMap.has(nodeKey)) {
        // 已存在的节点，返回其ID
        const existingId = nodeMap.get(nodeKey);
        
        // 如果有父节点且还没有连接，创建连接
        if (parentId !== null) {
          // 检查是否已经存在相同的连接
          const linkExists = links.some(link => 
            (link.source === parentId && link.target === existingId) ||
            (link.source === existingId && link.target === parentId)
          );
          
          if (!linkExists) {
            links.push({
              source: parentId,
              target: existingId
            });
          }
        }
        
        return existingId;
      }
      
      // 创建新节点
      const currentId = nodeId++;
      nodeMap.set(nodeKey, currentId);
      
      // 确定节点大小
      let symbolSize;
      if (category === 0) {
        symbolSize = 30; // 域名节点
      } else if (node.isLeaf) {
        symbolSize = 15; // 叶子节点
      } else {
        symbolSize = 20; // 普通节点
      }
      
      // 添加节点
      nodes.push({
        id: currentId,
        name: nodeName,
        category: category,
        value: node.value,
        path: nodePath,
        symbolSize: symbolSize,
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
      
      // 处理子节点 (如果有)
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
      
      return currentId;
    };
    
    // 处理根节点
    try {
      // 处理不同的数据结构
      if (Array.isArray(data)) {
        // 如果是数组，对每个元素递归处理
        if (data.length === 1) {
          // 单元素数组，直接处理
          processNode(data[0], null, 0, 0);
        } else if (data.length > 1) {
          // 创建虚拟根节点连接多个元素
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
          
          // 将所有元素连接到根节点
          data.forEach(item => {
            processNode(item, rootId, 1, 0);
          });
        }
      } else if (typeof data === 'object') {
        // 处理单个对象
        processNode(data, null, 0, 0);
      } else {
        console.warn('不支持的数据类型:', typeof data);
      }
    } catch (error) {
      console.error('处理图形数据时出错:', error);
    }
    
    console.log(`处理完成: ${nodes.length} 个节点, ${links.length} 个连接`);
    return { nodes, links };
  }, [config.initialDepth, isHashLikePath]);

  // 图形图表配置生成
  const getGraphOption = useCallback((data: any, type: string) => {
    // 确保我们有正确的图形数据格式
    let graphData;
    
    // 检查数据格式 - 已经是nodes/links格式还是需要转换
    if (data && data.nodes && data.links && Array.isArray(data.nodes) && Array.isArray(data.links)) {
      graphData = data;
      console.log("使用已有图形数据格式:", graphData.nodes.length, "节点");
    } else {
      // 需要转换
      graphData = prepareGraphData(data);
      console.log("转换后的图形数据:", graphData.nodes.length, "节点");
    }
    
    // 如果转换后没有节点，使用简单的错误提示
    if (!graphData.nodes.length) {
      return {
        title: {
          text: '无法创建图形数据',
          subtext: '请尝试使用树形图查看',
          left: 'center'
        }
      };
    }
    
    // 配置基础选项
    const baseOption = {
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
        data: ['域名', '路径'],
        top: 10
      },
      series: [
        {
          name: 'Sitemap结构',
          type: 'graph',
          data: graphData.nodes,
          links: graphData.links,
          categories: [
            { name: '域名' },
            { name: '路径' }
          ],
          roam: true,
          draggable: true,
          label: {
            show: config.labelStrategy === 'always',
            position: 'right',
            formatter: (params: any) => {
              return params.name || 'Unnamed';
            }
          },
          emphasis: {
            focus: 'adjacency',
            label: {
              show: config.labelStrategy !== 'none'
            }
          },
          progressive: 300,
          progressiveThreshold: 500,
          animation: config.enableAnimation
        }
      ]
    };
    
    // 根据图表类型添加特定配置
    let specificOptions = {};
    
    switch (type) {
      case 'graph-circular-layout':
        specificOptions = {
          series: [{
            layout: 'circular',
            circular: {
              rotateLabel: true
            },
            lineStyle: {
              color: 'source',
              curveness: 0.1
            }
          }]
        };
        break;
        
      case 'graph-label-overlap':
        specificOptions = {
          series: [{
            layout: 'force',
            force: {
              repulsion: 100,
              edgeLength: 50,
              gravity: 0.1,
              layoutAnimation: config.enableAnimation
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3
            }
          }]
        };
        break;
        
      case 'graph-webkit-dep':
        specificOptions = {
          series: [{
            layout: 'force',
            force: {
              repulsion: 200,
              gravity: 0.2,
              edgeLength: 30,
              layoutAnimation: config.enableAnimation,
              friction: 0.1
            },
            lineStyle: {
              opacity: 0.9,
              width: 1,
              curveness: 0
            }
          }]
        };
        break;
        
      case 'graph-npm':
        specificOptions = {
          series: [{
            layout: 'force',
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 8],
            force: {
              repulsion: 150,
              edgeLength: [50, 150],
              gravity: 0.1,
              layoutAnimation: config.enableAnimation
            },
            lineStyle: {
              color: 'source',
              width: 1.5
            }
          }]
        };
        break;
    }
    
    // 深度合并选项
    return mergeOptions(baseOption, specificOptions);
  }, [config, prepareGraphData]);
  
  // 辅助函数 - 深度合并对象
  const mergeOptions = useCallback((target: any, source: any) => {
    const result = {...target};
    
    Object.keys(source).forEach(key => {
      if (Array.isArray(source[key])) {
        if (!result[key]) {
          result[key] = [];
        }
        
        // 合并数组中的对象
        source[key].forEach((item: any, index: number) => {
          if (typeof item === 'object' && item !== null) {
            if (result[key][index] && typeof result[key][index] === 'object') {
              result[key][index] = mergeOptions(result[key][index], item);
            } else {
              result[key][index] = {...item};
            }
          } else {
            if (!result[key][index]) {
              result[key][index] = item;
            }
          }
        });
      } else if (typeof source[key] === 'object' && source[key] !== null) {
        if (!result[key] || typeof result[key] !== 'object') {
          result[key] = {};
        }
        result[key] = mergeOptions(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }, []);

  // 更新图表 - 单独的useEffect，专注于渲染
  useEffect(() => {
    if (!chart || !visualizationData) return;

    // 添加延迟，确保图表实例已完全初始化
    const renderTimer = setTimeout(() => {
      try {
        console.log(`准备渲染图表，类型: ${visualizationType}`);
        
        // 检查数据量，设置性能警告
        if (visualizationData) {
          const nodeCount = countNodes(visualizationData);
          setShowPerformanceWarning(nodeCount > 500);
          console.log(`节点总数: ${nodeCount}`);
        }
        
        // 处理数据集
        const processedData = processLargeDataset(
          visualizationData, 
          0, 
          config.initialDepth
        );
        
        // 根据图表类型生成配置
        let option;
        switch (visualizationType) {
          case 'tree':
            option = getTreeOption(processedData, false);
            break;
          case 'tree-radial':
            option = getTreeOption(processedData, true);
            break;
          case 'graph-label-overlap':
          case 'graph-circular-layout':
          case 'graph-webkit-dep':
          case 'graph-npm':
            option = getGraphOption(processedData, visualizationType);
            break;
          default:
            option = getTreeOption(processedData, false);
        }
        
        // 大数据集优化
        if (showPerformanceWarning) {
          option.progressive = 200;
          option.progressiveThreshold = 500;
          
          if (!config.enableAnimation) {
            option.animation = false;
          }
        }

        // 关键: 先清除，再设置选项，最后强制渲染
        chart.clear();
        
        // 使用setTimeout提供额外的渲染帧，避免阻塞
        setTimeout(() => {
          try {
            // 使用notMerge模式设置选项
            chart.setOption(option, true);
            
            // 显式调用重绘和刷新大小
            chart.resize();
            
            console.log(`图表${visualizationType}渲染完成`);
            
            // 绑定事件处理
            chart.off('click');
            chart.on('click', (params: any) => {
              if (params.dataType === 'node' && params.data) {
                console.log('点击节点:', params.data);
              }
            });
            
            // 清除错误
            if (error) {
              setError(null);
            }
          } catch (innerError) {
            console.error('渲染图表时出错:', innerError);
            setError(`渲染失败: ${innerError.message || '未知错误'}`);
          }
        }, 50);
        
      } catch (error) {
        console.error('准备图表渲染时出错:', error);
        setError(`准备渲染失败: ${error.message || '未知错误'}`);
      }
    }, 200); // 给足够的时间让图表实例初始化
    
    return () => {
      clearTimeout(renderTimer);
    };
  }, [chart, visualizationData, visualizationType, config, processLargeDataset, getTreeOption, getGraphOption, countNodes, error]);

  // 重试处理
  const handleRetry = useCallback(() => {
    console.log("用户请求重试图表渲染");
    setError(null);
    setRenderKey(prev => prev + 1);
  }, []);

  // 渲染部分
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
        className="flex flex-col items-center justify-center bg-red-50 text-red-600 rounded-lg"
        style={{ width: '100%', height: 200 }}
      >
        <div className="text-center">
          <p className="font-medium">图表加载错误</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-3">请尝试切换可视化类型或刷新页面</p>
        </div>
        
        {/* 重试按钮 */}
        <button
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
          onClick={handleRetry}
        >
          重试加载图表
        </button>
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
      
      {/* 关键: 添加渲染键和内联样式确保容器存在并可见 */}
      <div
        key={`chart-container-${renderKey}`}
        ref={chartRef}
        className="w-full bg-white rounded-lg border border-gray-200"
        style={{ 
          height, 
          position: 'relative',
          visibility: 'visible', // 确保可见性
          opacity: 1,           // 确保不透明
          minHeight: '200px'    // 确保最小高度
        }}
        data-visualization-type={visualizationType} // 添加数据属性以便调试
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
      
      {/* 添加隐藏的触发区，用于紧急情况下手动刷新图表 */}
      <div 
        onClick={handleRetry}
        style={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 10, 
          width: 100, 
          height: 100, 
          cursor: 'pointer',
          opacity: 0
        }} 
        title="点击重新渲染图表"
      />
    </div>
  );
};

export default SitemapChart;