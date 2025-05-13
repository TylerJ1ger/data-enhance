// frontend/src/components/backlink/BacklinkStats.tsx
import React from 'react';
import { FiFileText, FiBarChart2, FiFilter } from 'react-icons/fi';
import { BacklinkDataStats } from '../../types';

interface BacklinkStatsProps {
  originalStats: BacklinkDataStats | null;
  filteredStats: BacklinkDataStats | null;
  isLoading?: boolean;
}

const BacklinkStats: React.FC<BacklinkStatsProps> = ({
  originalStats,
  filteredStats,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!originalStats) {
    return (
      <div className="card">
        <div className="text-center py-6 text-gray-500">
          <FiFileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>上传文件以查看外链统计信息</p>
        </div>
      </div>
    );
  }

  // Calculate percentage of domains retained after filtering
  const percentageRetained = filteredStats
    ? Math.round((filteredStats.domain_count / originalStats.domain_count) * 100)
    : 100;

  // Stats card component
  const StatCard = ({
    icon,
    title,
    originalValue,
    filteredValue,
    formatter = (val: number) => val.toLocaleString(),
  }: {
    icon: React.ReactNode;
    title: string;
    originalValue: number;
    filteredValue?: number;
    formatter?: (val: number) => string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center mb-2">
        <div className="mr-2 text-primary-600">{icon}</div>
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>
      <div className="flex justify-between items-end">
        <div className="text-2xl font-bold text-gray-900">
          {formatter(filteredValue !== undefined ? filteredValue : originalValue)}
        </div>
        {filteredValue !== undefined && filteredValue !== originalValue && (
          <div className="text-sm">
            <span className="text-gray-500">原始: </span>
            <span className="font-medium">{formatter(originalValue)}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">外链统计信息</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<FiFileText />}
          title="总行数"
          originalValue={originalStats.total_rows}
          filteredValue={filteredStats?.total_rows}
        />
        
        <StatCard
          icon={<FiBarChart2 />}
          title="总域名数"
          originalValue={originalStats.domain_count}
          filteredValue={filteredStats?.domain_count}
        />
        
        <StatCard
          icon={<FiFilter />}
          title="唯一域名数"
          originalValue={originalStats.unique_domains}
          filteredValue={filteredStats?.unique_domains}
        />
      </div>
      
      {filteredStats && filteredStats.domain_count !== originalStats.domain_count && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
          <div className="font-medium">筛选已应用</div>
          <div className="mt-1">
            显示 {filteredStats.domain_count.toLocaleString()} 个域名，共 {originalStats.domain_count.toLocaleString()} 个域名 ({percentageRetained}%)
          </div>
        </div>
      )}
    </div>
  );
};

export default BacklinkStats;