import React from 'react';
import { FiFileText, FiBarChart2, FiFilter } from 'react-icons/fi';
import { DataStats } from '../../types';

interface KeywordStatsProps {
  originalStats: DataStats | null;
  filteredStats: DataStats | null;
  isLoading?: boolean;
}

const KeywordStats: React.FC<KeywordStatsProps> = ({
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
          <p>Upload files to see keyword statistics</p>
        </div>
      </div>
    );
  }

  // Calculate percentage of keywords retained after filtering
  const percentageRetained = filteredStats
    ? Math.round((filteredStats.keyword_count / originalStats.keyword_count) * 100)
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
            <span className="text-gray-500">Original: </span>
            <span className="font-medium">{formatter(originalValue)}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">Keyword Statistics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<FiFileText />}
          title="Total Rows"
          originalValue={originalStats.total_rows}
          filteredValue={filteredStats?.total_rows}
        />
        
        <StatCard
          icon={<FiBarChart2 />}
          title="Total Keywords"
          originalValue={originalStats.keyword_count}
          filteredValue={filteredStats?.keyword_count}
        />
        
        <StatCard
          icon={<FiFilter />}
          title="Unique Keywords"
          originalValue={originalStats.unique_keywords}
          filteredValue={filteredStats?.unique_keywords}
        />
      </div>
      
      {filteredStats && filteredStats.keyword_count !== originalStats.keyword_count && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
          <div className="font-medium">Filter Applied</div>
          <div className="mt-1">
            Showing {filteredStats.keyword_count.toLocaleString()} out of {originalStats.keyword_count.toLocaleString()} keywords ({percentageRetained}%)
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordStats;