import React from 'react';
import { FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { SEOCategory } from '../../types/seo';

interface SEOFilterProps {
  categories: SEOCategory[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const SEOFilter: React.FC<SEOFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="card mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <FiFilter className="mr-2 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-800">SEO问题筛选</h3>
        </div>
        <div>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      
      {isOpen && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              按类别筛选
            </label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => onCategoryChange(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={disabled || isLoading}
            >
              <option value="">所有类别</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-500">
              {selectedCategory ? 
                `当前筛选: ${selectedCategory}` : 
                "选择一个类别来筛选SEO问题"
              }
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
            <h4 className="font-medium mb-1">优先级说明</h4>
            <ul className="list-disc list-inside">
              <li>高优先级: 严重影响网站SEO表现，建议立即修复</li>
              <li>中优先级: 对SEO有一定影响，建议尽快处理</li>
              <li>低优先级: 可能影响SEO效果，可以在有时间时处理</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
            <h4 className="font-medium mb-1">问题类型说明</h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span><strong>问题</strong>: 确定存在的SEO错误，需要修复</span>
              </li>
              <li className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                <span><strong>警告</strong>: 需要检查但不一定是问题的项目</span>
              </li>
              <li className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                <span><strong>机会</strong>: 可以优化改进的部分</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEOFilter;