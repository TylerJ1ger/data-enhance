"use client";

import React from 'react';

interface TrendChartProps {
  data: string; // 热度数据字符串，如 "[0,0,2,3,7,16,66,100,54,16,3,1]"
  timestamp?: string; // 时间戳，如 "2025-09-06"，用于计算月份
  width?: number;
  height?: number;
  className?: string;
}

export function TrendChart({ data, timestamp, width = 80, height = 24, className = "" }: TrendChartProps) {
  // 解析热度数据
  const parseData = (dataStr: string): number[] => {
    try {
      // 移除可能的前后空格并解析JSON
      const parsed = JSON.parse(dataStr.trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn('Failed to parse trend data:', dataStr);
      return [];
    }
  };

  const trendData = parseData(data);

  // 计算每个数据点对应的月份
  const calculateMonths = (timestamp?: string, dataLength: number = 12): string[] => {
    if (!timestamp) {
      return Array.from({ length: dataLength }, (_, i) => `${i + 1}月`);
    }

    try {
      const date = new Date(timestamp);
      const currentMonth = date.getMonth(); // 0-11
      const months = [];

      // 最后一个数据点是当前月份，往前推
      for (let i = 0; i < dataLength; i++) {
        const monthIndex = (currentMonth - dataLength + 1 + i + 12) % 12;
        months.push(`${monthIndex + 1}月`);
      }

      return months;
    } catch {
      return Array.from({ length: dataLength }, (_, i) => `${i + 1}月`);
    }
  };

  const months = calculateMonths(timestamp, trendData.length);

  // 找到最高热度对应的月份
  const getHighestMonth = (): string => {
    if (trendData.length === 0) return '';

    const maxValue = Math.max(...trendData);
    const maxIndex = trendData.findIndex(value => value === maxValue);

    return months[maxIndex] || '';
  };

  // 如果没有有效数据，显示占位符
  if (trendData.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center text-xs text-muted-foreground`} style={{ width, height }}>
        无数据
      </div>
    );
  }

  // 计算SVG路径点
  const maxValue = Math.max(...trendData, 1); // 避免除零
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = trendData.map((value, index) => {
    const x = trendData.length === 1
      ? padding + chartWidth / 2
      : padding + (index / (trendData.length - 1)) * chartWidth;
    const y = padding + chartHeight - (value / maxValue) * chartHeight;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // 创建填充区域路径
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const fillPath = `${pathData} L ${lastPoint.split(',')[0]},${height - padding} L ${firstPoint.split(',')[0]},${height - padding} Z`;

  return (
    <div className={`${className} relative`} style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {/* 填充区域 */}
        <path
          d={fillPath}
          fill="currentColor"
          opacity="0.1"
          className="text-primary"
        />
        {/* 折线 */}
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        {/* 最高点标记 */}
        {trendData.map((value, index) => {
          if (value === Math.max(...trendData) && Math.max(...trendData) > 0) {
            const x = trendData.length === 1
              ? padding + chartWidth / 2
              : padding + (index / (trendData.length - 1)) * chartWidth;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill="currentColor"
                className="text-primary"
              />
            );
          }
          return null;
        })}
      </svg>

      {/* 工具提示信息 */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-10">
        最高: {getHighestMonth()}
      </div>
    </div>
  );
}