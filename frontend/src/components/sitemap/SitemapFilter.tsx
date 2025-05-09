import React, { useState } from 'react';
import { FiFilter, FiChevronDown, FiChevronUp, FiPlus, FiX } from 'react-icons/fi';
import Button from '../common/Button';
import { SitemapFilterRequest } from '../../types/sitemap';

interface SitemapFilterProps {
  onApplyFilter: (filters: SitemapFilterRequest) => void;
  domains: string[];
  isLoading?: boolean;
  disabled?: boolean;
}

const SitemapFilter: React.FC<SitemapFilterProps> = ({
  onApplyFilter,
  domains,
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [domain, setDomain] = useState<string>('');
  const [paths, setPaths] = useState<string[]>(['']); // 初始提供一个空路径输入框
  const [pathFilterType, setPathFilterType] = useState<string>('contains');
  const [depth, setDepth] = useState<string>('');

  const handleAddPath = () => {
    setPaths([...paths, '']);
  };

  const handleRemovePath = (index: number) => {
    const newPaths = [...paths];
    newPaths.splice(index, 1);
    setPaths(newPaths);
  };

  const handlePathChange = (index: number, value: string) => {
    const newPaths = [...paths];
    newPaths[index] = value;
    setPaths(newPaths);
  };

  const handleApplyFilter = () => {
    // 过滤掉空路径
    const filteredPaths = paths.filter(path => path.trim() !== '');
    
    onApplyFilter({
      domain: domain || undefined,
      paths: filteredPaths.length > 0 ? filteredPaths : undefined,
      path_filter_type: pathFilterType,
      depth: depth ? parseInt(depth, 10) : undefined,
    });
  };

  const handleReset = () => {
    setDomain('');
    setPaths(['']);
    setPathFilterType('contains');
    setDepth('');
  };

  return (
    <div className="card mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <FiFilter className="mr-2 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-800">URL筛选</h3>
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
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
          
          {/* 路径筛选 - 支持多路径 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                路径筛选（支持多个）
              </label>
              <button 
                type="button"
                onClick={handleAddPath}
                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                disabled={disabled || isLoading}
              >
                <FiPlus size={14} className="mr-1" />
                添加路径
              </button>
            </div>
            
            {paths.map((path, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => handlePathChange(index, e.target.value)}
                  placeholder="/blog, /products, 等"
                  className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={disabled || isLoading}
                />
                {paths.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePath(index)}
                    className="ml-2 text-gray-500 hover:text-red-600"
                    disabled={disabled || isLoading}
                  >
                    <FiX />
                  </button>
                )}
              </div>
            ))}
            
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                路径筛选类型
              </label>
              <select
                value={pathFilterType}
                onChange={(e) => setPathFilterType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={disabled || isLoading}
              >
                <option value="contains">包含路径</option>
                <option value="not_contains">不包含路径</option>
              </select>
            </div>
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
              placeholder="例如：2代表二级目录"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              disabled={disabled || isLoading}
            />
          </div>
          
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