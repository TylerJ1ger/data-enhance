import React, { useCallback, useState, useRef, useEffect } from 'react';
import { BrandOverlapResponse, BrandDomainOverlapResponse, BrandStats, BrandDomainStats } from '../../types';

// 类型定义
interface ForceGraphChartProps {
  brandOverlapData: BrandOverlapResponse | BrandDomainOverlapResponse | null;
  height?: number;
  dataType?: 'keyword' | 'domain';  // 新增参数，用于区分关键词和域名数据
}

interface GraphNode {
  id: string;
  name: string;
  val: number; // 节点大小
  color: string;
  totalItems: number;
  uniqueItems: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

// 颜色数组
const COLORS = [
  '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'
];

const ForceGraphChart: React.FC<ForceGraphChartProps> = ({
  brandOverlapData,
  height = 450,
  dataType = 'keyword' // 默认为关键词类型
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [graphWidth, setGraphWidth] = useState(600); // 设置一个默认宽度
  const [ForceGraph2D, setForceGraph2D] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 处理数据转换成图谱格式
  const graphData = React.useMemo(() => {
    if (!brandOverlapData) return { nodes: [], links: [] };
    
    const { overlap_matrix, brand_stats } = brandOverlapData;
    const brands = Object.keys(brand_stats);
    
    if (brands.length === 0) return { nodes: [], links: [] };
    
    // 根据数据类型获取相应的统计数据
    const getCount = (brand: string) => {
      if (dataType === 'domain' && 'total_domains' in brand_stats[brand]) {
        return (brand_stats[brand] as BrandDomainStats).total_domains;
      } else if ('total_keywords' in brand_stats[brand]) {
        return (brand_stats[brand] as BrandStats).total_keywords;
      }
      return 0;
    };
    
    // 获取唯一数量
    const getUniqueCount = (brand: string) => {
      if (dataType === 'domain' && 'unique_domains' in brand_stats[brand]) {
        return (brand_stats[brand] as BrandDomainStats).unique_domains;
      } else if ('unique_keywords' in brand_stats[brand]) {
        return (brand_stats[brand] as BrandStats).unique_keywords;
      }
      return 0;
    };
    
    // 找出最大关键词数量，用于缩放节点大小
    const maxItems = Math.max(...Object.values(brands).map(brand => getCount(brand)));
    
    // 准备节点，调整大小计算
    const nodes: GraphNode[] = brands.map((brand, index) => ({
      id: brand,
      name: brand,
      // 根据数量调整节点大小，使用开平方根缩放并限制最大/最小值
      val: Math.max(3, Math.min(10, 3 + Math.sqrt(getCount(brand) / maxItems) * 10)),
      color: COLORS[index % COLORS.length],
      totalItems: getCount(brand),
      uniqueItems: getUniqueCount(brand)
    }));
    
    // 准备连接
    const links: GraphLink[] = [];
    brands.forEach((source, i) => {
      brands.forEach((target, j) => {
        if (i < j) { // 避免重复连接
          const value = overlap_matrix[source][target];
          if (value > 0) {
            links.push({
              source,
              target,
              value
            });
          }
        }
      });
    });
    
    return { nodes, links };
  }, [brandOverlapData, dataType]);

  // 标记组件挂载状态
  useEffect(() => {
    setIsMounted(true);
    setIsClient(true);
    
    return () => {
      setIsMounted(false);
    };
  }, []);

  // 在客户端动态导入库 - 独立的effect，不依赖其他状态
  useEffect(() => {
    if (!isClient) return;
    
    let isCancelled = false;
    
    const loadForceGraph = async () => {
      try {
        console.log('开始加载 react-force-graph-2d 库');
        const module = await import('react-force-graph-2d');
        
        if (!isCancelled) {
          console.log('react-force-graph-2d 库加载成功');
          setForceGraph2D(() => module.default);
          setLoading(false);
        }
      } catch (error) {
        console.error('加载 react-force-graph-2d 库失败:', error);
        if (!isCancelled) {
          setError(`无法加载图表库: ${error.message}`);
          setLoading(false);
        }
      }
    };
    
    loadForceGraph();
    
    return () => {
      isCancelled = true;
    };
  }, [isClient]);

  // 监听容器大小 - 等待组件挂载后再监听
  useEffect(() => {
    if (!isMounted) return;
    
    // 使用requestAnimationFrame确保DOM已更新
    const frameId = requestAnimationFrame(() => {
      if (containerRef.current) {
        setGraphWidth(containerRef.current.offsetWidth);
        
        // 监听容器尺寸变化
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            setGraphWidth(entry.contentRect.width);
          }
        });
        
        resizeObserver.observe(containerRef.current);
        
        return () => {
          resizeObserver.disconnect();
        };
      }
    });
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isMounted]);

  // 节点悬停处理
  const handleNodeHover = useCallback((node: any) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  }, []);

  // 生成节点标签内容
  const getNodeLabel = (node: any) => {
    if (dataType === 'domain') {
      return `${node.name}: ${node.totalItems} 个域名`;
    }
    return `${node.name}: ${node.totalItems} 关键词`;
  };

  // 生成连接标签内容
  const getLinkLabel = (link: any) => {
    if (dataType === 'domain') {
      return `共同域名: ${link.value}`;
    }
    return `共同关键词: ${link.value}`;
  };

  // 错误处理渲染
  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
        <div className="font-medium">图表加载错误</div>
        <div className="text-sm">{error}</div>
        <div className="mt-4 text-sm">
          正在显示备用表格视图...
        </div>
        {/* 备用表格视图 */}
        {brandOverlapData && (
          <div className="mt-4 overflow-auto max-h-[400px] bg-white rounded border">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">品牌</th>
                  <th className="px-4 py-2 text-right">
                    {dataType === 'domain' ? '域名数量' : '关键词数量'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(brandOverlapData.brand_stats).map(([brand, stats]) => (
                  <tr key={brand} className="border-t">
                    <td className="px-4 py-2">{brand}</td>
                    <td className="px-4 py-2 text-right">
                      {dataType === 'domain' && 'total_domains' in stats
                        ? (stats as BrandDomainStats).total_domains
                        : 'total_keywords' in stats
                          ? (stats as BrandStats).total_keywords
                          : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 无数据展示
  if (!brandOverlapData || Object.keys(brandOverlapData.brand_stats).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">
          {dataType === 'domain' 
            ? '无可用品牌域名重叠数据。请确保上传的文件包含品牌信息。'
            : '无可用品牌重叠数据。请确保上传的文件包含品牌信息。'
          }
        </p>
      </div>
    );
  }

  // 加载中状态
  if (loading || !ForceGraph2D) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // 渲染备用表格视图
  const renderTableView = () => (
    <div className="mt-6 bg-white border rounded-lg p-4">
      <h4 className="text-sm font-medium mb-2">
        {dataType === 'domain' ? '品牌域名重叠数据' : '品牌关键词重叠数据'}
      </h4>
      <div className="overflow-auto max-h-[400px]">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">品牌</th>
              <th className="px-4 py-2 text-right">
                {dataType === 'domain' ? '域名数量' : '关键词数量'}
              </th>
              <th className="px-4 py-2 text-left">重叠信息</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(brandOverlapData.brand_stats).map(([brand, stats]) => (
              <tr key={brand} className="border-t">
                <td className="px-4 py-2">{brand}</td>
                <td className="px-4 py-2 text-right">
                  {dataType === 'domain' && 'total_domains' in stats
                    ? (stats as BrandDomainStats).total_domains
                    : 'total_keywords' in stats
                      ? (stats as BrandStats).total_keywords
                      : 0}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(brandOverlapData.overlap_matrix[brand])
                      .filter(([otherBrand, count]) => brand !== otherBrand && count > 0)
                      .map(([otherBrand, count]) => (
                        <span key={otherBrand} className="inline-flex text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          与 {otherBrand}: {count}
                        </span>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 返回 Force Graph 组件
  return (
    <div className="relative" ref={containerRef}>
      <div className="w-full" style={{ height: `${height}px` }}>
        {ForceGraph2D && (
          <ForceGraph2D
            graphData={graphData}
            width={graphWidth}
            height={height}
            nodeVal={node => node.val}
            nodeRelSize={4}
            nodeLabel={node => getNodeLabel(node)}
            linkLabel={link => getLinkLabel(link)}
            nodeColor={node => node.color}
            linkWidth={link => Math.min(5, Math.sqrt(link.value) / 2)}
            linkColor={() => "#88888866"}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={2}
            onNodeHover={handleNodeHover}
            cooldownTicks={100}
            d3VelocityDecay={0.3}
            d3AlphaDecay={0.02}
            d3AlphaMin={0.001}
          />
        )}
      </div>
      
      {/* 如果图表组件加载了但可能仍有问题，添加备用表格视图 */}
      {ForceGraph2D && renderTableView()}
    </div>
  );
};

export default ForceGraphChart;