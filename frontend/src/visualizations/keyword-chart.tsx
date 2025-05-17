//frontend-new/src/visualizations/keyword-chart.tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface KeywordChartProps {
  keywordCounts: Record<string, number>;
  limit?: number; // 保留参数但不使用它
}

export function KeywordChart({
  keywordCounts,
  limit = 15, // 保留默认值但不使用它
}: KeywordChartProps) {
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: [],
  });
  
  // 新增状态用于分页显示
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!keywordCounts || Object.keys(keywordCounts).length === 0) {
      return;
    }

    // 所有关键词按计数降序排序
    const sortedKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1]);
    
    // 计算总页数
    setTotalPages(Math.ceil(sortedKeywords.length / itemsPerPage));
    
    // 获取当前页的数据
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = sortedKeywords.slice(startIndex, endIndex);

    // 提取标签和值
    const labels = pageData.map(([keyword]) => keyword);
    const values = pageData.map(([, count]) => count);

    setChartData({
      labels,
      datasets: [
        {
          label: '关键词出现次数',
          data: values,
          backgroundColor: 'rgba(14, 165, 233, 0.7)',
          borderColor: 'rgba(14, 165, 233, 1)',
          borderWidth: 1,
        },
      ],
    });
  }, [keywordCounts, currentPage, itemsPerPage]);

  // 页码变化处理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 每页显示数量变化处理
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // 重置到第一页
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: '出现次数',
        },
      },
      y: {
        title: {
          display: true,
          text: '关键词',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `关键词频率分布 (第${currentPage}/${totalPages}页)`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `出现次数: ${context.raw}`;
          },
        },
      },
    },
  };

  if (!keywordCounts || Object.keys(keywordCounts).length === 0) {
    return (
      <Card className="flex items-center justify-center h-64 bg-muted/30">
        <p className="text-muted-foreground">
          暂无关键词数据。请上传文件以查看关键词统计信息。
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm">
          总共 <span className="font-bold">{Object.keys(keywordCounts).length}</span> 个关键词
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">每页显示:</span>
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue placeholder="15" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="h-[400px] w-full">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="px-2 py-1 text-sm">
              第 {currentPage} / {totalPages} 页
            </span>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}