//frontend-new/src/visualizations/domain-chart.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DomainChartProps {
  domainCounts: Record<string, number>;
  limit?: number;
}

export function DomainChart({
  domainCounts,
  limit = 15,
}: DomainChartProps) {
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: [],
  });
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // 处理所有数据
  const sortedDomains = useMemo(() => {
    if (!domainCounts || Object.keys(domainCounts).length === 0) {
      return [];
    }
    return Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  }, [domainCounts]);

  // 当依赖项变化时更新图表数据
  useEffect(() => {
    if (sortedDomains.length === 0) return;
    
    // 计算总页数
    setTotalPages(Math.ceil(sortedDomains.length / itemsPerPage));
    
    // 获取当前页的数据
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedDomains.length);
    const pageData = sortedDomains.slice(startIndex, endIndex);

    // 提取标签和值
    const labels = pageData.map(([domain]) => domain);
    const values = pageData.map(([, count]) => count);

    setChartData({
      labels,
      datasets: [
        {
          label: '域名数量',
          data: values,
          backgroundColor: 'rgba(14, 165, 233, 0.7)',
          borderColor: 'rgba(14, 165, 233, 1)',
          borderWidth: 1,
        },
      ],
    });
  }, [sortedDomains, currentPage, itemsPerPage]);

  // 页码变化处理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
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
          text: '数量',
          font: {
            size: 12,
          },
        },
      },
      y: {
        title: {
          display: true,
          text: '域名',
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `域名频率分布 (第${currentPage}/${totalPages}页)`,
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
        color: '#334155',
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#334155',
        bodyColor: '#334155',
        borderColor: 'rgba(14, 165, 233, 0.2)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 6,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `数量: ${context.raw}`;
          },
        },
      },
    },
  };

  if (!domainCounts || Object.keys(domainCounts).length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 bg-muted/20">
          <p className="text-muted-foreground">
            没有域名数据可用。上传文件以查看域名统计信息。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">域名分布</CardTitle>
          <Badge variant="outline">
            总共 <span className="font-bold ml-1">{Object.keys(domainCounts).length}</span> 个域名
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-sm text-muted-foreground">
            显示第 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedDomains.length)} 项
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每页显示:</span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-20 h-8">
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
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                aria-label="首页"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="上一页"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="px-4 py-2 text-sm text-muted-foreground">
                第 {currentPage} / {totalPages} 页
              </span>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="下一页"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="末页"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}