//frontend-new/src/visualizations/overlap-chart.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BrandOverlapResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OverlapChartProps {
  brandOverlapData: BrandOverlapResponse | null;
  width?: number;
  height?: number;
}

interface BrandNode {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  totalKeywords: number;
  uniqueKeywords: number;
  color: string;
}

interface LinkNode {
  source: string;
  target: string;
  value: number;
  sourceNode: BrandNode;
  targetNode: BrandNode;
}

// 品牌节点颜色数组
const COLORS = [
  'hsl(var(--primary-500))', // primary color
  'hsl(var(--primary-600))',
  'hsl(var(--primary-700))',
  'hsl(200 98% 39%)',
  'hsl(153 47% 49%)',
  'hsl(120 68% 42%)',
  'hsl(48 96% 53%)',
  'hsl(31 91% 58%)',
  'hsl(14 100% 57%)',
  'hsl(0 91% 71%)',
  'hsl(332 79% 58%)',
  'hsl(283 74% 58%)',
  'hsl(261 84% 61%)',
  'hsl(243 75% 59%)',
  'hsl(226 71% 40%)',
];

export function OverlapChart({
  brandOverlapData,
  width = 600,
  height = 400,
}: OverlapChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<BrandNode[]>([]);
  const [links, setLinks] = useState<LinkNode[]>([]);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<{x: number, y: number, content: React.ReactNode} | null>(null);
  
  // 初始化图表数据
  useEffect(() => {
    if (!brandOverlapData) return;
    
    const { overlap_matrix, brand_stats } = brandOverlapData;
    const brands = Object.keys(brand_stats);
    
    if (brands.length === 0) return;
    
    // 创建节点
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.15; // 最大圆半径
    const minRadius = maxRadius * 0.5; // 最小圆半径
    
    // 找出最大关键词数量，用于缩放
    const maxKeywords = Math.max(...Object.values(brand_stats).map(stat => stat.total_keywords));
    
    // 在圆形布局中创建节点
    const newNodes: BrandNode[] = brands.map((brand, index) => {
      const angle = (2 * Math.PI * index) / brands.length;
      const radius = Math.max(minRadius, (brand_stats[brand].total_keywords / maxKeywords) * maxRadius);
      
      // 计算节点位置，使用较小的布局圆以防止重叠
      const layoutRadius = (width / 2) - (maxRadius * 1.5);
      const x = centerX + layoutRadius * Math.cos(angle);
      const y = centerY + layoutRadius * Math.sin(angle);
      
      return {
        id: brand,
        name: brand,
        x,
        y,
        radius,
        totalKeywords: brand_stats[brand].total_keywords,
        uniqueKeywords: brand_stats[brand].unique_keywords,
        color: COLORS[index % COLORS.length],
      };
    });
    
    // 创建连接
    const newLinks: LinkNode[] = [];
    brands.forEach((source, i) => {
      brands.forEach((target, j) => {
        if (i < j) { // 避免重复连接
          const value = overlap_matrix[source][target];
          if (value > 0) {
            newLinks.push({
              source,
              target,
              value,
              sourceNode: newNodes[i],
              targetNode: newNodes[j],
            });
          }
        }
      });
    });
    
    setNodes(newNodes);
    setLinks(newLinks);
  }, [brandOverlapData, width, height]);
  
  // 绘制图表
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置canvas大小
    canvas.width = width;
    canvas.height = height;
    
    // 清空canvas
    ctx.clearRect(0, 0, width, height);
    
    // 绘制连接线（重叠线）
    ctx.lineWidth = 2;
    links.forEach(link => {
      const sourceNode = link.sourceNode;
      const targetNode = link.targetNode;
      
      // 根据重叠值计算连接线宽度
      const sourceTotal = sourceNode.totalKeywords;
      const targetTotal = targetNode.totalKeywords;
      const maxPossibleOverlap = Math.min(sourceTotal, targetTotal);
      const overlapRatio = link.value / maxPossibleOverlap;
      
      // 根据重叠比例绘制不同透明度的线
      ctx.strokeStyle = `rgba(150, 150, 150, ${Math.max(0.1, overlapRatio)})`;
      ctx.lineWidth = Math.max(1, Math.min(8, overlapRatio * 10));
      
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();
      
      // 在线中间绘制重叠值
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '12px var(--font-sans)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.value.toString(), midX, midY);
    });
    
    // 绘制节点（品牌圆圈）
    nodes.forEach(node => {
      const isHovered = hoveredBrand === node.id;
      
      // 绘制圆圈
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? `${node.color}` : `${node.color}80`; // 非悬停时添加透明度
      ctx.fill();
      
      // 绘制边框
      ctx.strokeStyle = isHovered ? '#000000' : node.color;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();
      
      // 绘制标签
      ctx.fillStyle = isHovered ? '#000000' : '#333333';
      ctx.font = isHovered ? 'bold 14px var(--font-sans)' : '12px var(--font-sans)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, node.x, node.y - node.radius - 10);
      
      // 悬停时显示关键词数量
      if (isHovered) {
        ctx.font = '12px var(--font-sans)';
        ctx.fillText(`${node.totalKeywords} 关键词`, node.x, node.y + node.radius + 15);
      }
    });
  }, [nodes, links, width, height, hoveredBrand]);
  
  // 鼠标移动处理，用于悬停效果
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查鼠标是否悬停在任何节点上
    let hoveredNode = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= node.radius) {
        hoveredNode = node;
        setTooltipContent({
          x: e.clientX,
          y: e.clientY,
          content: (
            <div>
              <div className="font-bold">{node.name}</div>
              <div>总关键词: {node.totalKeywords}</div>
              <div>唯一关键词: {node.uniqueKeywords}</div>
            </div>
          )
        });
        break;
      }
    }
    
    setHoveredBrand(hoveredNode ? hoveredNode.id : null);
    
    if (!hoveredNode) {
      setTooltipContent(null);
    }
  };
  
  // 鼠标离开处理
  const handleMouseLeave = () => {
    setHoveredBrand(null);
    setTooltipContent(null);
  };
  
  if (!brandOverlapData || Object.keys(brandOverlapData.brand_stats).length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 p-6">
          <p className="text-muted-foreground">
            无可用品牌重叠数据。请确保上传的文件包含品牌信息。
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!nodes.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="w-full h-64" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full"
          style={{ maxHeight: height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* 图例 */}
        <div className="mt-4 flex flex-wrap gap-3">
          {nodes.map(node => (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <div 
                  className="flex items-center text-sm cursor-pointer"
                  onMouseEnter={() => setHoveredBrand(node.id)}
                  onMouseLeave={() => setHoveredBrand(null)}
                >
                  <div 
                    className="w-4 h-4 rounded-full mr-1"
                    style={{ backgroundColor: node.color }}
                  />
                  <span className="truncate max-w-[120px]">{node.name}</span>
                  <Badge variant="outline" className="ml-1 text-xs py-0 px-1">
                    {node.totalKeywords}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p><strong>{node.name}</strong></p>
                <p>总关键词: {node.totalKeywords}</p>
                <p>唯一关键词: {node.uniqueKeywords}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}