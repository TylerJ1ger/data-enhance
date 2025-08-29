//frontend-new/src/visualizations/sitemap-chart.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TreeVisualizationData, TreeNode } from '@/types/sitemap';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw, Settings, AlertTriangle, Info, Maximize2, X } from 'lucide-react';

interface SitemapChartProps {
  visualizationData: TreeVisualizationData | null;
  visualizationType?: string;
  height?: number;
  isLoading?: boolean;
  chartConfig?: {
    maxNodes?: number;
    initialDepth?: number;
    enableAnimation?: boolean;
    labelStrategy?: 'always' | 'hover' | 'none';
  };
}

export function SitemapChart({
  visualizationData,
  visualizationType = 'tree',
  height = 600,
  isLoading = false,
  chartConfig = {},
}: SitemapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const fullscreenChartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);
  const [fullscreenChart, setFullscreenChart] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const previousTypeRef = useRef<string>(visualizationType);
  const echartsLoadedRef = useRef<boolean>(false);
  const echartsLibRef = useRef<any>(null);
  
  // 使用ref追踪图表实例及其状态
  const chartInstanceRef = useRef<{instance: any; isDisposed: boolean}>({
    instance: null,
    isDisposed: false
  });
  
  // 默认图表配置
  const defaultConfig = {
    maxNodes: 300,
    initialDepth: 3,
    maxNodesPerLevel: 8,
    enableAnimation: true,
    labelStrategy: 'hover' as 'always' | 'hover' | 'none'
  };
  
  // 合并用户配置与默认配置
  const config = { ...defaultConfig, ...chartConfig };
  
  // 本地配置状态
  const [localConfig, setLocalConfig] = useState(config);
  const [showConfig, setShowConfig] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 展开节点的状态管理
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 在客户端侧渲染
  useEffect(() => {
    setIsClient(true);
    return () => {
      // 组件卸载时清理图表
      if (chartInstanceRef.current.instance) {
        try {
          chartInstanceRef.current.instance.dispose();
          chartInstanceRef.current.isDisposed = true;
          console.log("组件卸载时清理图表实例");
        } catch (e) {
          console.warn("卸载时清理图表实例出错:", e);
        }
      }
      // 清理全屏图表
      if (fullscreenChart) {
        try {
          fullscreenChart.dispose();
          console.log("组件卸载时清理全屏图表实例");
        } catch (e) {
          console.warn("卸载时清理全屏图表实例出错:", e);
        }
      }
    };
  }, [fullscreenChart]);

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

  // 智能节点折叠函数 - 检测同一深度节点过多的情况并自动折叠
  const processNodeDensity = useCallback((data: any, maxNodesPerLevel: number = 8): any => {
    if (!data) return null;
    
    const result = { ...data };
    
    // 递归处理子节点
    if (result.children && Array.isArray(result.children) && result.children.length > 0) {
      // 如果当前层级的子节点数量超过阈值
      if (result.children.length > maxNodesPerLevel) {
        // 分离重要节点和普通节点
        const importantChildren = [];
        const regularChildren = [];
        
        for (const child of result.children) {
          // 判断节点重要性：有子节点的、非哈希路径的节点更重要
          const hasChildren = child.children && child.children.length > 0;
          const isImportant = hasChildren || !isHashLikePath(child.name);
          
          if (isImportant && importantChildren.length < Math.floor(maxNodesPerLevel * 0.6)) {
            importantChildren.push(child);
          } else {
            regularChildren.push(child);
          }
        }
        
        // 显示的节点数量
        const visibleRegularCount = maxNodesPerLevel - importantChildren.length;
        const visibleRegularChildren = regularChildren.slice(0, Math.max(0, visibleRegularCount));
        const hiddenCount = regularChildren.length - visibleRegularChildren.length;
        
        // 构建新的子节点数组
        const newChildren = [...importantChildren, ...visibleRegularChildren];
        
        // 如果有隐藏的节点，创建展开按钮节点
        if (hiddenCount > 0) {
          const expandNode = {
            name: `展开更多 (${hiddenCount} 个节点)`,
            path: result.path ? `${result.path}/__expand__` : '__expand__',
            children: null,
            isExpandButton: true,
            expandButtonData: {
              hiddenChildren: regularChildren.slice(visibleRegularCount),
              parentPath: result.path || '',
              isExpanded: false
            },
            itemStyle: {
              color: '#3b82f6',
              borderColor: '#1d4ed8',
              borderWidth: 1,
              borderType: 'dashed'
            },
            label: {
              color: '#1d4ed8',
              fontWeight: 'bold'
            },
            symbolSize: 12
          };
          
          newChildren.push(expandNode);
        }
        
        result.children = newChildren;
      }
      
      // 递归处理每个子节点
      result.children = result.children.map((child: TreeNode) => 
        child.isExpandButton ? child : processNodeDensity(child, maxNodesPerLevel)
      );
    }
    
    return result;
  }, [isHashLikePath]);

  // 处理节点展开状态的函数
  const processExpandedNodes = useCallback((data: any, expandedPaths: Set<string>): any => {
    if (!data) return null;
    
    const result = { ...data };
    
    if (result.children && Array.isArray(result.children)) {
      result.children = result.children.map((child: any) => {
        if (child.isExpandButton) {
          const expandKey = child.expandButtonData?.parentPath || '';
          const isExpanded = expandedPaths.has(expandKey);
          
          if (isExpanded) {
            // 如果已展开，返回所有隐藏的子节点，并添加折叠按钮
            const hiddenChildren = child.expandButtonData?.hiddenChildren || [];
            const processedHiddenChildren = hiddenChildren.map((hiddenChild: any) => 
              processExpandedNodes(hiddenChild, expandedPaths)
            );
            
            // 创建折叠按钮
            const collapseNode = {
              name: `收起 (${hiddenChildren.length} 个节点)`,
              path: child.path,
              children: null,
              isExpandButton: true,
              expandButtonData: {
                ...child.expandButtonData,
                isExpanded: true
              },
              itemStyle: {
                color: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1,
                borderType: 'dashed'
              },
              label: {
                color: '#dc2626',
                fontWeight: 'bold'
              },
              symbolSize: 12
            };
            
            return [collapseNode, ...processedHiddenChildren];
          }
        }
        
        return processExpandedNodes(child, expandedPaths);
      }).flat(); // 使用flat()来处理展开时返回的数组
    }
    
    return result;
  }, []);

  // 处理展开/折叠按钮点击
  const handleExpandToggle = useCallback((expandButtonData: any) => {
    const parentPath = expandButtonData.parentPath || '';
    const isExpanded = expandButtonData.isExpanded;
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        // 如果当前是展开状态，则收起
        newSet.delete(parentPath);
      } else {
        // 如果当前是折叠状态，则展开
        newSet.add(parentPath);
      }
      return newSet;
    });
  }, []);

  // 处理大量数据的函数 - 限制深度和处理哈希路径
  const processLargeDataset = useCallback((data: any, depth: number = 0, maxDepth: number = localConfig.initialDepth): any => {
    if (!data) return null;
    
    // 创建一个新对象而不是修改原始对象
    const result = { ...data };
    
    // 处理children
    if (result.children && Array.isArray(result.children)) {
      // 检查是否有许多哈希路径子节点
      const hashLikeChildren = result.children.filter((child: TreeNode) => 
        isHashLikePath(child.name)
      );
      
      // 如果哈希路径子节点超过5个，只保留前5个作为示例
      if (hashLikeChildren.length > 5) {
        // 先提取非哈希路径的节点
        const normalChildren = result.children.filter((child: TreeNode) => 
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
        result.children = result.children.map((child: TreeNode) => 
          processLargeDataset(child, depth + 1, maxDepth)
        );
      } else {
        // 超出初始显示深度，设置折叠标记
        result.children = result.children.map((child: TreeNode) => ({
          ...child,
          collapsed: true // 标记为折叠状态
        }));
      }
    }
    
    return result;
  }, [localConfig.initialDepth, isHashLikePath]);

  // 统计节点总数的辅助函数
  const countNodes = useCallback((node: any): number => {
    if (!node) return 0;
    let count = 1; // 当前节点
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: TreeNode) => {
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
      } catch (error: unknown) {
        console.error('加载ECharts库失败:', error);
        setError(`加载图表库失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };

    loadECharts();
  }, [isClient]);

  // 初始化图表实例 - 当DOM准备好、库加载完毕或强制重新渲染时
  useEffect(() => {
    if (!isClient || !echartsLoadedRef.current || !echartsLibRef.current || !chartRef.current) return;
    
    // 创建清理函数
    const cleanupFunction = () => {
      try {
        if (chartInstanceRef.current.instance) {
          chartInstanceRef.current.instance.dispose();
          chartInstanceRef.current.isDisposed = true;
          console.log("图表实例已清理");
        }
      } catch (e) {
        console.warn("清理图表实例时出错:", e);
      }
    };
    
    // 清理之前的实例
    cleanupFunction();
    console.log("清理旧图表实例");
    
    // 创建新实例 - 使用setTimeout确保DOM完全准备好
    const initTimer = setTimeout(() => {
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
        
        // 更新实例引用
        chartInstanceRef.current = {
          instance: newChart,
          isDisposed: false
        };
        setChart(newChart);
        setError(null);
        console.log("ECharts实例创建成功");
      } catch (error: unknown) {
        console.error('创建图表实例失败:', error);
        setError(`图表初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }, 100);
    
    return () => {
      clearTimeout(initTimer);
      cleanupFunction();
    };
  }, [isClient, renderKey]);

  // 窗口大小变化时调整图表
  useEffect(() => {
    if (!chart && !fullscreenChart) return;
    
    const handleResize = () => {
      try {
        // 检查普通图表是否已被销毁
        if (chart && !chartInstanceRef.current.isDisposed) {
          chart.resize();
        }
        // 调整全屏图表大小
        if (fullscreenChart && isFullscreen) {
          fullscreenChart.resize();
        }
      } catch (e) {
        console.warn("调整图表大小时出错:", e);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 初始调整一次，延长延迟以确保DOM完全准备好
    const resizeTimer = setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [chart, fullscreenChart, isFullscreen]);

  // 处理可视化类型变化
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
  const getTreeOption = useCallback((data: any, isRadial: boolean, isFullscreenMode = false) => {
    const baseOption = {
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
      // 全屏模式下启用工具栏
      ...(isFullscreenMode && {
        toolbox: {
          show: true,
          feature: {
            restore: {
              title: '还原视图'
            },
            saveAsImage: {
              title: '保存为图片',
              name: 'sitemap-visualization'
            }
          },
          right: 20,
          top: 20
        }
      }),
    };

    return {
      ...baseOption,
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
            show: localConfig.labelStrategy !== 'none',
            formatter: (params: any) => {
              return params.data.name || 'Unnamed';
            }
          },
          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left',
              show: localConfig.labelStrategy === 'always'
            }
          },
          emphasis: {
            focus: 'descendant',
            label: {
              show: localConfig.labelStrategy !== 'none'
            }
          },
          expandAndCollapse: true,
          animationDuration: localConfig.enableAnimation ? 550 : 0,
          animationDurationUpdate: localConfig.enableAnimation ? 750 : 0,
          initialTreeDepth: localConfig.initialDepth,
          layout: isRadial ? 'radial' : 'orthogonal',
          orient: isRadial ? 'RL' : 'LR',
          // 全屏模式下启用缩放和平移
          ...(isFullscreenMode && {
            roam: true, // 启用缩放和平移
            scaleLimit: {
              min: 0.1,
              max: 10
            }
          })
        }
      ]
    };
  }, [localConfig]);

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
      if (depth > localConfig.initialDepth && !node.forceDisplay) {
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
          color: category === 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'
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
              color: 'hsl(var(--primary))'
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
    } catch (error: unknown) {
      console.error('处理图形数据时出错:', error);
    }
    
    console.log(`处理完成: ${nodes.length} 个节点, ${links.length} 个连接`);
    return { nodes, links };
  }, [localConfig.initialDepth, isHashLikePath]);

  // 图形图表配置生成
  const getGraphOption = useCallback((data: any, type: string, isFullscreenMode = false) => {
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
      // 全屏模式下添加工具栏和缩放功能
      ...(isFullscreenMode && {
        toolbox: {
          show: true,
          feature: {
            restore: {
              title: '还原'
            },
            saveAsImage: {
              title: '保存为图片'
            }
          },
          right: 20,
          top: 20
        }
      }),
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
            show: localConfig.labelStrategy === 'always',
            position: 'right',
            formatter: (params: any) => {
              return params.name || 'Unnamed';
            }
          },
          emphasis: {
            focus: 'adjacency',
            label: {
              show: localConfig.labelStrategy !== 'none'
            }
          },
          progressive: 300,
          progressiveThreshold: 500,
          animation: localConfig.enableAnimation
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
              layoutAnimation: localConfig.enableAnimation
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
              layoutAnimation: localConfig.enableAnimation,
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
              layoutAnimation: localConfig.enableAnimation
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
  }, [localConfig, prepareGraphData]);
  
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

    // 添加更长的延迟，确保图表实例已完全初始化
    const renderTimer = setTimeout(() => {
      // 检查图表是否已被销毁
      if (chartInstanceRef.current.isDisposed) {
        console.log("图表已销毁，不执行渲染");
        return;
      }

      try {
        console.log(`准备渲染图表，类型: ${visualizationType}`);
        
        // 检查数据量，设置性能警告
        if (visualizationData) {
          const nodeCount = countNodes(visualizationData);
          setShowPerformanceWarning(nodeCount > 500);
          console.log(`节点总数: ${nodeCount}`);
        }
        
        // 处理数据集 - 先进行密度检测和折叠，再处理大数据集
        let processedData = processNodeDensity(visualizationData, localConfig.maxNodesPerLevel);
        processedData = processExpandedNodes(processedData, expandedNodes);
        processedData = processLargeDataset(
          processedData, 
          0, 
          localConfig.initialDepth
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
          
          if (!localConfig.enableAnimation) {
            option.animation = false;
          }
        }

        // 检查图表是否已被销毁
        if (!chartInstanceRef.current.isDisposed) {
          // 关键: 先清除，再设置选项，最后强制渲染
          chart.clear();
          
          // 使用setTimeout提供额外的渲染帧，避免阻塞
          setTimeout(() => {
            if (!chartInstanceRef.current.isDisposed) {
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
                    
                    // 处理展开/折叠按钮点击
                    if (params.data.isExpandButton && params.data.expandButtonData) {
                      handleExpandToggle(params.data.expandButtonData);
                      return;
                    }
                  }
                });
                
                // 清除错误
                if (error) {
                  setError(null);
                }
              } catch (innerError: unknown) {
                console.error('渲染图表时出错:', innerError);
                setError(`渲染失败: ${innerError instanceof Error ? innerError.message : '未知错误'}`);
              }
            } else {
              console.log("延迟渲染时发现图表已销毁，跳过渲染");
            }
          }, 50);
        } else {
          console.log("图表已销毁，跳过渲染");
        }
        
      } catch (error: unknown) {
        console.error('准备图表渲染时出错:', error);
        setError(`准备渲染失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }, 300); // 给足够的时间让图表实例初始化
    
    return () => {
      clearTimeout(renderTimer);
    };
  }, [chart, visualizationData, visualizationType, localConfig, processLargeDataset, processNodeDensity, processExpandedNodes, expandedNodes, handleExpandToggle, getTreeOption, getGraphOption, countNodes, error]);

  // 全屏图表渲染
  useEffect(() => {
    if (!fullscreenChart || !visualizationData || !isFullscreen) return;

    const renderFullscreenTimer = setTimeout(() => {
      try {
        console.log(`准备渲染全屏图表，类型: ${visualizationType}`);
        
        // 处理数据集 - 先进行密度检测和折叠，再处理大数据集
        let processedData = processNodeDensity(visualizationData, localConfig.maxNodesPerLevel + 2); // 全屏模式允许更多节点
        processedData = processExpandedNodes(processedData, expandedNodes);
        processedData = processLargeDataset(
          processedData, 
          0, 
          localConfig.initialDepth
        );
        
        // 根据图表类型生成配置 (全屏模式)
        let option;
        switch (visualizationType) {
          case 'tree':
            option = getTreeOption(processedData, false, true);
            break;
          case 'tree-radial':
            option = getTreeOption(processedData, true, true);
            break;
          case 'graph-label-overlap':
          case 'graph-circular-layout':
          case 'graph-webkit-dep':
          case 'graph-npm':
            option = getGraphOption(processedData, visualizationType, true);
            break;
          default:
            option = getTreeOption(processedData, false, true);
        }
        
        // 大数据集优化
        if (showPerformanceWarning) {
          option.progressive = 200;
          option.progressiveThreshold = 500;
          
          if (!localConfig.enableAnimation) {
            option.animation = false;
          }
        }

        // 清除并设置选项
        fullscreenChart.clear();
        
        setTimeout(() => {
          try {
            fullscreenChart.setOption(option, true);
            fullscreenChart.resize();
            console.log(`全屏图表${visualizationType}渲染完成`);
            
            // 绑定全屏图表事件处理
            fullscreenChart.off('click');
            fullscreenChart.on('click', (params: any) => {
              if (params.dataType === 'node' && params.data) {
                console.log('点击全屏节点:', params.data);
                
                // 处理展开/折叠按钮点击
                if (params.data.isExpandButton && params.data.expandButtonData) {
                  handleExpandToggle(params.data.expandButtonData);
                  return;
                }
              }
            });
          } catch (innerError: unknown) {
            console.error('渲染全屏图表时出错:', innerError);
          }
        }, 50);
        
      } catch (error: unknown) {
        console.error('准备全屏图表渲染时出错:', error);
      }
    }, 300);
    
    return () => {
      clearTimeout(renderFullscreenTimer);
    };
  }, [fullscreenChart, visualizationData, visualizationType, localConfig, processLargeDataset, processNodeDensity, processExpandedNodes, expandedNodes, handleExpandToggle, getTreeOption, getGraphOption, showPerformanceWarning, isFullscreen]);

  // 重试处理
  const handleRetry = useCallback(() => {
    console.log("用户请求重试图表渲染");
    setError(null);
    setRenderKey(prev => prev + 1);
  }, []);
  
  // 应用配置更改
  const applyConfigChanges = useCallback(() => {
    console.log("应用新配置:", localConfig);
    // 触发重新渲染图表
    setRenderKey(prev => prev + 1);
  }, [localConfig]);

  // 全屏模式切换
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    // 如果是进入全屏模式，需要初始化全屏图表
    if (!isFullscreen) {
      // 延迟初始化全屏图表，确保DOM更新完成
      setTimeout(() => {
        if (echartsLibRef.current && fullscreenChartRef.current && !fullscreenChart) {
          const echarts = echartsLibRef.current;
          const newFullscreenChart = echarts.init(fullscreenChartRef.current, null, {
            renderer: 'canvas',
            useDirtyRect: false
          });
          setFullscreenChart(newFullscreenChart);
        }
      }, 200);
    } else {
      // 退出全屏模式时清理全屏图表
      if (fullscreenChart) {
        try {
          fullscreenChart.dispose();
          setFullscreenChart(null);
        } catch (e) {
          console.warn("清理全屏图表时出错:", e);
        }
      }
    }
  }, [isFullscreen, fullscreenChart]);

  // 键盘事件处理 - ESC键退出全屏
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // 全屏模式下阻止页面滚动
  useEffect(() => {
    if (isFullscreen) {
      // 阻止body滚动
      document.body.style.overflow = 'hidden';
      
      // 阻止滚轮事件冒泡到页面
      const preventScroll = (e: WheelEvent) => {
        // 只有当事件目标不在图表容器内时才阻止
        const chartContainer = document.querySelector('[data-visualization-type*="fullscreen"]');
        if (chartContainer && !chartContainer.contains(e.target as Node)) {
          e.preventDefault();
        }
      };

      document.addEventListener('wheel', preventScroll, { passive: false });

      return () => {
        // 恢复body滚动
        document.body.style.overflow = '';
        document.removeEventListener('wheel', preventScroll);
      };
    }
  }, [isFullscreen]);

  // 渲染部分
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" /> 
            <Skeleton className="h-4 w-[250px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>图表加载错误</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <p className="mt-3">请尝试切换可视化类型或刷新页面</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry} 
            className="mt-4"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            重试加载图表
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!visualizationData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">
            请先上传Sitemap文件查看可视化结果
          </div>
        </CardContent>
      </Card>
    );
  }

  const getChartTypeLabel = () => {
    switch (visualizationType) {
      case 'tree': return '标准树形图';
      case 'tree-radial': return '径向树形图';
      case 'graph-label-overlap': return '标签网络图';
      case 'graph-circular-layout': return '环形布局图';
      case 'graph-webkit-dep': return '依赖关系图';
      case 'graph-npm': return '箭头流向图';
      default: return '未知图表类型';
    }
  };

  const getChartTypeDescription = () => {
    switch (visualizationType) {
      case 'tree': return '展示标准的网站层级结构，清晰直观';
      case 'tree-radial': return '以放射状展示树形结构，适合大型站点';
      case 'graph-label-overlap': return '显示节点之间的连接关系，自动避免标签重叠';
      case 'graph-circular-layout': return '将节点均匀分布在圆周上，突出整体结构';
      case 'graph-webkit-dep': return '复杂网站结构的依赖关系可视化';
      case 'graph-npm': return '带有方向指示的网络图，展示页面间导航关系';
      default: return '请选择图表类型';
    }
  };

  return (
    <div className="space-y-4">
      {showPerformanceWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>性能提示</AlertTitle>
          <AlertDescription>
            <p>当前数据包含大量URL节点，已优化显示。</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">提示</Badge>
                已将URL结构限制为初始显示{localConfig.initialDepth}层深度
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">提示</Badge>
                节点可点击展开/折叠查看更多内容
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">提示</Badge>
                已智能折叠同层过多节点，点击"展开更多"查看
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {showConfig ? "隐藏配置" : "显示配置选项"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {showConfig && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="text-base font-medium mb-4">图表配置</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">初始展开深度: {localConfig.initialDepth}</label>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[localConfig.initialDepth]}
                  onValueChange={(value) => setLocalConfig({...localConfig, initialDepth: value[0]})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>更少</span>
                  <span>更多</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">每层最大节点数: {localConfig.maxNodesPerLevel}</label>
                </div>
                <Slider
                  min={4}
                  max={16}
                  step={1}
                  value={[localConfig.maxNodesPerLevel]}
                  onValueChange={(value) => setLocalConfig({...localConfig, maxNodesPerLevel: value[0]})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>更少</span>
                  <span>更多</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium block">节点标签显示</label>
                <Tabs 
                  defaultValue={localConfig.labelStrategy} 
                  onValueChange={(value: any) => setLocalConfig({...localConfig, labelStrategy: value as 'always' | 'hover' | 'none'})}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="hover">悬停显示</TabsTrigger>
                    <TabsTrigger value="always">始终显示</TabsTrigger>
                    <TabsTrigger value="none">隐藏标签</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="animation-mode"
                  checked={localConfig.enableAnimation}
                  onCheckedChange={(checked) => setLocalConfig({...localConfig, enableAnimation: checked})}
                />
                <label 
                  htmlFor="animation-mode" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  启用动画效果
                </label>
              </div>
              
              <Button onClick={applyConfigChanges} className="w-full">
                应用配置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Sitemap可视化</h3>
              <p className="text-sm text-muted-foreground">
                {getChartTypeLabel()}: {getChartTypeDescription()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                title="全屏查看"
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                全屏查看
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {showConfig ? "隐藏配置" : "图表设置"}
              </Button>
            </div>
          </div>
          
          <div
            key={`chart-container-${renderKey}`}
            ref={chartRef}
            className="w-full bg-background/50 rounded-lg border"
            style={{ 
              height, 
              position: 'relative',
              visibility: 'visible',
              opacity: 1,
              minHeight: '400px'
            }}
            data-visualization-type={visualizationType}
          ></div>
          
          <Alert variant="default" className="bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertTitle>使用提示</AlertTitle>
            <AlertDescription>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {visualizationType.startsWith('tree') ? (
                  <>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      点击节点可以展开/折叠子节点
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      鼠标悬停在节点上可以查看详细信息
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      双击节点可以聚焦该节点
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      树形图初始展开到第{localConfig.initialDepth}层
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      拖动节点可以调整位置
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      滚轮可以缩放图表
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      点击节点可以查看详细信息
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      拖动空白处可以平移整个图
                    </div>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 全屏模态框 */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex flex-col">
          {/* 全屏模式头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">Sitemap可视化 - 全屏模式</h2>
              <p className="text-sm text-muted-foreground">
                {getChartTypeLabel()}: {getChartTypeDescription()}
              </p>
            </div>
            <div className="flex gap-2">
              {/* 配置按钮在全屏模式下 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {showConfig ? "隐藏配置" : "图表设置"}
              </Button>
              {/* 关闭全屏按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                title="退出全屏"
              >
                <X className="mr-2 h-4 w-4" />
                退出全屏
              </Button>
            </div>
          </div>

          {/* 全屏模式配置面板 */}
          {showConfig && (
            <div className="border-b bg-muted/30 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 深度控制 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">初始展开深度: {localConfig.initialDepth}</label>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[localConfig.initialDepth]}
                      onValueChange={(value) => setLocalConfig({...localConfig, initialDepth: value[0]})}
                      className="w-full"
                    />
                  </div>
                  
                  {/* 节点密度控制 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">每层节点数: {localConfig.maxNodesPerLevel}</label>
                    </div>
                    <Slider
                      min={4}
                      max={16}
                      step={1}
                      value={[localConfig.maxNodesPerLevel]}
                      onValueChange={(value) => setLocalConfig({...localConfig, maxNodesPerLevel: value[0]})}
                      className="w-full"
                    />
                  </div>
                  
                  {/* 标签显示 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">节点标签显示</label>
                    <Tabs 
                      defaultValue={localConfig.labelStrategy} 
                      onValueChange={(value: any) => setLocalConfig({...localConfig, labelStrategy: value as 'always' | 'hover' | 'none'})}
                      className="w-full"
                    >
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="hover">悬停显示</TabsTrigger>
                        <TabsTrigger value="always">始终显示</TabsTrigger>
                        <TabsTrigger value="none">隐藏标签</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {/* 动画和应用 */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <Switch 
                        id="animation-mode-fullscreen"
                        checked={localConfig.enableAnimation}
                        onCheckedChange={(checked) => setLocalConfig({...localConfig, enableAnimation: checked})}
                      />
                      <label 
                        htmlFor="animation-mode-fullscreen" 
                        className="text-sm font-medium leading-none"
                      >
                        启用动画效果
                      </label>
                    </div>
                    <Button onClick={applyConfigChanges} className="w-full" size="sm">
                      应用配置
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 全屏图表容器 */}
          <div className="flex-1 p-4">
            <div
              key={`fullscreen-chart-${renderKey}`}
              ref={fullscreenChartRef}
              className="w-full h-full bg-card rounded-lg border shadow-lg"
              style={{ 
                minHeight: '500px',
                visibility: 'visible',
                opacity: 1,
              }}
              data-visualization-type={`${visualizationType}-fullscreen`}
            />
          </div>

          {/* 全屏模式提示信息 */}
          <div className="border-t p-4 bg-muted/30">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                {visualizationType.startsWith('tree') ? (
                  <>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      点击节点可以展开/折叠子节点
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      鼠标悬停查看详细信息
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">缩放</Badge>
                      滚轮缩放，拖拽平移
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">工具</Badge>
                      使用右上角工具栏缩放和保存
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      拖动节点可以调整位置
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">缩放</Badge>
                      滚轮缩放，拖拽平移
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">提示</Badge>
                      点击节点查看详细信息
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">工具</Badge>
                      使用右上角工具栏还原和保存
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}