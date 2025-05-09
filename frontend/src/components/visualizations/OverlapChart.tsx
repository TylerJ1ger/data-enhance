import React, { useEffect, useRef, useState } from 'react';
import { BrandOverlapResponse } from '../../types';

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

const COLORS = [
  '#0ea5e9', // sky-500
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#10b981', // emerald-500
  '#22c55e', // green-500
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#d946ef', // fuchsia-500
  '#a855f7', // purple-500
  '#8b5cf6', // violet-500
  '#6366f1', // indigo-500
  '#3b82f6', // blue-500
];

const OverlapChart: React.FC<OverlapChartProps> = ({
  brandOverlapData,
  width = 600,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<BrandNode[]>([]);
  const [links, setLinks] = useState<LinkNode[]>([]);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  
  // Initialize chart data when brandOverlapData changes
  useEffect(() => {
    if (!brandOverlapData) return;
    
    const { overlap_matrix, brand_stats } = brandOverlapData;
    const brands = Object.keys(brand_stats);
    
    if (brands.length === 0) return;
    
    // Create nodes
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.15; // Maximum circle radius
    const minRadius = maxRadius * 0.5; // Minimum circle radius
    
    // Find max keyword count for scaling
    const maxKeywords = Math.max(...Object.values(brand_stats).map(stat => stat.total_keywords));
    
    // Create nodes in a circular layout
    const newNodes: BrandNode[] = brands.map((brand, index) => {
      const angle = (2 * Math.PI * index) / brands.length;
      const radius = Math.max(minRadius, (brand_stats[brand].total_keywords / maxKeywords) * maxRadius);
      
      // Calculate position in a circular layout
      // Use a smaller circle for positioning to prevent overlap
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
    
    // Create links
    const newLinks: LinkNode[] = [];
    brands.forEach((source, i) => {
      brands.forEach((target, j) => {
        if (i < j) { // Only create links once between two nodes
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
  
  // Draw the chart
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw links (overlap lines)
    ctx.lineWidth = 2;
    links.forEach(link => {
      const sourceNode = link.sourceNode;
      const targetNode = link.targetNode;
      
      // Calculate link width based on overlap value
      const sourceTotal = sourceNode.totalKeywords;
      const targetTotal = targetNode.totalKeywords;
      const maxPossibleOverlap = Math.min(sourceTotal, targetTotal);
      const overlapRatio = link.value / maxPossibleOverlap;
      
      // Draw line with opacity based on overlap ratio
      ctx.strokeStyle = `rgba(150, 150, 150, ${Math.max(0.1, overlapRatio)})`;
      ctx.lineWidth = Math.max(1, Math.min(8, overlapRatio * 10));
      
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();
      
      // Draw overlap value
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.value.toString(), midX, midY);
    });
    
    // Draw nodes (brand circles)
    nodes.forEach(node => {
      const isHovered = hoveredBrand === node.id;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? `${node.color}` : `${node.color}80`; // Add transparency when not hovered
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = isHovered ? '#000000' : node.color;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = isHovered ? '#000000' : '#333333';
      ctx.font = isHovered ? 'bold 14px Inter, sans-serif' : '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, node.x, node.y - node.radius - 10);
      
      // Draw keyword count if hovered
      if (isHovered) {
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`${node.totalKeywords} keywords`, node.x, node.y + node.radius + 15);
      }
    });
  }, [nodes, links, width, height, hoveredBrand]);
  
  // Handle mouse move for hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is over any node
    let hoveredNode = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= node.radius) {
        hoveredNode = node;
        break;
      }
    }
    
    setHoveredBrand(hoveredNode ? hoveredNode.id : null);
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredBrand(null);
  };
  
  if (!brandOverlapData || Object.keys(brandOverlapData.brand_stats).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">
          无可用品牌重叠数据。请确保上传的文件包含品牌信息。
        </p>
      </div>
    );
  }
  
  return (
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
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {nodes.map(node => (
          <div 
            key={node.id}
            className="flex items-center text-sm"
            onMouseEnter={() => setHoveredBrand(node.id)}
            onMouseLeave={() => setHoveredBrand(null)}
          >
            <div 
              className="w-4 h-4 rounded-full mr-1"
              style={{ backgroundColor: node.color }}
            />
            <span className="truncate max-w-[120px]">{node.name}</span>
            <span className="text-gray-500 ml-1">({node.totalKeywords})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverlapChart;