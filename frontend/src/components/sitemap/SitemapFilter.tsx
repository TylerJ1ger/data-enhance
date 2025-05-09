import React, { useState } from 'react';
import { FiFilter, FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import Button from '../common/Button';
import { SitemapFilterRequest } from '../../types/sitemap';

interface SitemapFilterProps {
  onApplyFilter: (filters: SitemapFilterRequest) => void;
  domains: string[];
  isLoading?: boolean;
  disabled?: boolean;
}

// 路径筛选类型枚举
enum PathFilterType {
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains'
}

const SitemapFilter: React.FC<SitemapFilterProps> = ({
  onApplyFilter,
  domains = [],
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [domain, setDomain] = useState<string>('');
  const [pathFilterType, setPathFilterType] = useState<PathFilterType>(PathFilterType.CONTAINS);
  const [path, setPath] = useState<string>('');
  const [depth, setDepth] = useState<string>('');

  const handleApplyFilter = () => {
    const filters: SitemapFilterRequest = {
      domain: domain || undefined,
      path: path || undefined,
      path_filter_type: pathFilterType, // 新增路径筛选类型
      depth: depth ? parseInt(depth, 10) : undefined,
    };
    
    onApplyFilter(filters);
  };

  const handleReset = () => {
    setDomain('');
    setPathFilterType(PathFilterType.CONTAINS);
    setPath('');
    setDepth('');
  };

  const handlePathTypeChange = (type: PathFilterType) => {
    setPathFilterType(type);
  };

  return (
    <div className="card mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <FiFilter className="mr-2 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-800">筛选选项</h3>
        </div>
        <div>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      
      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* 域名筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              域名
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={disabled || isLoading}
            >
              <option value="">所有域名</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          
          {/* 路径筛选类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              路径筛选类型
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-primary-600"
                  checked={pathFilterType === PathFilterType.CONTAINS}
                  onChange={() => handlePathTypeChange(PathFilterType.CONTAINS)}
                  disabled={disabled || isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">包含</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-primary-600"
                  checked={pathFilterType === PathFilterType.NOT_CONTAINS}
                  onChange={() => handlePathTypeChange(PathFilterType.NOT_CONTAINS)}
                  disabled={disabled || isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">不包含</span>
              </label>
            </div>
          </div>
          
          {/* 路径筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              路径{pathFilterType === PathFilterType.CONTAINS ? '包含' : '不包含'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={pathFilterType === PathFilterType.CONTAINS ? "输入路径匹配..." : "输入要排除的路径..."}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={disabled || isLoading}
              />
              {path && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setPath('')}
                  disabled={disabled || isLoading}
                >
                  <FiX />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {pathFilterType === PathFilterType.CONTAINS ? 
                "例如: product, blog/2023" : 
                "例如: admin, temp"}
            </p>
          </div>
          
          {/* 深度筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL深度
            </label>
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              placeholder="输入URL深度..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              disabled={disabled || isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              如: example.com/blog/post = 深度2
            </p>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex space-x-4 pt-4">
            <Button
              variant="primary"
              onClick={handleApplyFilter}
              disabled={isLoading || disabled}
              fullWidth
            >
              应用筛选
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={isLoading || disabled}
            >
              重置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitemapFilter;