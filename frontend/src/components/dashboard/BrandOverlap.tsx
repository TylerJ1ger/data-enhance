import React from 'react';
import { FiLink, FiCircle } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { BrandOverlapResponse } from '../../types';

// 动态导入ForceGraphChart组件，禁用SSR
const ForceGraphChart = dynamic(
  () => import('../visualizations/ForceGraphChart'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  )}
);

interface BrandOverlapProps {
  brandOverlapData: BrandOverlapResponse | null;
  isLoading?: boolean;
}

const BrandOverlap: React.FC<BrandOverlapProps> = ({
  brandOverlapData,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // 计算统计数据
  const getBrandSummary = () => {
    if (!brandOverlapData || Object.keys(brandOverlapData.brand_stats).length === 0) {
      return null;
    }

    const { brand_stats, overlap_matrix } = brandOverlapData;
    const brandCount = Object.keys(brand_stats).length;
    
    // 计算所有品牌的总关键词数
    const totalKeywords = Object.values(brand_stats).reduce(
      (sum, stats) => sum + stats.total_keywords, 
      0
    );
    
    // 计算品牌间的平均重叠
    let totalOverlap = 0;
    let overlapCount = 0;
    
    Object.keys(overlap_matrix).forEach(brand1 => {
      Object.keys(overlap_matrix[brand1]).forEach(brand2 => {
        if (brand1 !== brand2) {
          totalOverlap += overlap_matrix[brand1][brand2];
          overlapCount++;
        }
      });
    });
    
    const averageOverlap = overlapCount ? Math.round(totalOverlap / overlapCount) : 0;
    
    // 找出重叠最多的品牌对
    let maxOverlap = 0;
    let maxOverlapPair = ['', ''];
    
    Object.keys(overlap_matrix).forEach(brand1 => {
      Object.keys(overlap_matrix[brand1]).forEach(brand2 => {
        if (brand1 !== brand2 && overlap_matrix[brand1][brand2] > maxOverlap) {
          maxOverlap = overlap_matrix[brand1][brand2];
          maxOverlapPair = [brand1, brand2];
        }
      });
    });
    
    return {
      brandCount,
      totalKeywords,
      averageOverlap,
      maxOverlap,
      maxOverlapPair
    };
  };

  const summary = getBrandSummary();

  if (!summary) {
    return (
      <div className="card">
        <div className="text-center py-6 text-gray-500">
          <FiLink className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>上传包含品牌数据的文件以查看品牌重叠分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">品牌关键词重叠分析</h3>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="mr-2 text-primary-600"><FiCircle /></div>
            <h4 className="text-sm font-medium text-gray-700">品牌数量</h4>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.brandCount}</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="mr-2 text-primary-600"><FiCircle /></div>
            <h4 className="text-sm font-medium text-gray-700">关键词总数</h4>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalKeywords.toLocaleString()}</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="mr-2 text-primary-600"><FiLink /></div>
            <h4 className="text-sm font-medium text-gray-700">平均重叠关键词</h4>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.averageOverlap}</div>
        </div>
      </div>
      
      {/* 最高重叠统计信息 */}
      {summary.maxOverlap > 0 && (
        <div className="bg-white rounded-lg border border-primary-200 p-4 mb-6 text-sm">
          <div className="font-medium text-primary-800 mb-1">最高重叠品牌对</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-medium mr-1">{summary.maxOverlapPair[0]}</span>
              <FiLink className="mx-2 text-primary-500" />
              <span className="font-medium ml-1">{summary.maxOverlapPair[1]}</span>
            </div>
            <div className="bg-primary-100 text-primary-800 px-2 py-1 rounded">
              共享 <span className="font-bold">{summary.maxOverlap}</span> 个关键词
            </div>
          </div>
        </div>
      )}
      
      {/* 添加图例 */}
      <div className="mb-4 flex flex-wrap gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-700">图例:</div>
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 rounded-full bg-primary-500 mr-1"></div>
          <span>圆圈大小 = 关键词数量</span>
        </div>
        <div className="flex items-center text-sm">
          <div className="h-0.5 w-8 bg-gray-400 mr-1"></div>
          <span>连线粗细 = 共同关键词数量</span>
        </div>
      </div>
      
      {/* Force Graph 可视化 - 调整为更高的高度 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">品牌关键词重叠可视化</h4>
        <div className="w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
          <ForceGraphChart 
            brandOverlapData={brandOverlapData}
            height={550} // 增加高度，给图表更多空间
          />
        </div>
      </div>
      
      {/* 操作说明 */}
      <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
        <div className="font-medium">操作提示</div>
        <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
          <li>拖拽节点可调整布局</li>
          <li>鼠标悬停在节点或连线上可查看详细信息</li>
          <li>鼠标滚轮可缩放图表</li>
          <li>点击并拖拽空白区域可平移整个图表</li>
        </ul>
      </div>
    </div>
  );
};

export default BrandOverlap;