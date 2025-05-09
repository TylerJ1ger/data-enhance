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

const KeywordChart: React.FC<KeywordChartProps> = ({
  keywordCounts,
  limit = 15, // 保留默认值但不使用它
}) => {
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

    // Extract labels and values
    const labels = pageData.map(([keyword]) => keyword);
    const values = pageData.map(([, count]) => count);

    setChartData({
      labels,
      datasets: [
        {
          label: 'Keyword Count',
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
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
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
          text: 'Count',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Keyword',
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
            return `Count: ${context.raw}`;
          },
        },
      },
    },
  };

  if (!keywordCounts || Object.keys(keywordCounts).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">
          No keyword data available. Upload files to see keyword statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm">
          总共 <span className="font-bold">{Object.keys(keywordCounts).length}</span> 个关键词
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm">每页显示:</label>
          <select 
            value={itemsPerPage} 
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded-md text-sm p-1"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      
      <div style={{ height: '400px', width: '100%' }}>
        <Bar data={chartData} options={options} />
      </div>
      
      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              首页
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              上一页
            </button>
            
            <span className="px-2 py-1 text-sm">
              第 {currentPage} / {totalPages} 页
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              下一页
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded-md border text-sm disabled:opacity-50"
            >
              末页
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default KeywordChart;