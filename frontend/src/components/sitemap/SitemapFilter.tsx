import React, { useState } from 'react';
import { FiFilter, FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
  domains = [],
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [domain, setDomain] = useState<string>('');
  const [path, setPath] = useState<string>('');
  const [depth, setDepth] = useState<string>('');

  const handleApplyFilter = () => {
    const filters: SitemapFilterRequest = {};
    
    if (domain) {
      filters.domain = domain;
    }
    
    if (path) {
      filters.path = path;
    }
    
    if (depth && !isNaN(parseInt(depth))) {
      filters.depth = parseInt(depth);
    }
    
    onApplyFilter(filters);
  };

  const handleResetFilters = () => {
    setDomain('');
    setPath('');
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
          <h3 className="text-lg font-medium text-gray-800">筛选Sitemap</h3>
        </div>
        <div>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      
      {isOpen && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              域名
            </label>
            {domains.length > 0 ? (
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={disabled || isLoading}
              >
                <option value="">-- 选择域名 --</option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="输入域名..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={disabled || isLoading}
              />
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              路径包含
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="输入路径..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={disabled || isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL深度
            </label>
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              placeholder="输入深度值..."
              min="0"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={disabled || isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              URL深度是指URL路径中斜杠分隔的层级数量
            </p>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <Button
              variant="primary"
              onClick={handleApplyFilter}
              disabled={isLoading || disabled}
              fullWidth
              icon={<FiSearch />}
            >
              应用筛选
            </Button>
            <Button
              variant="secondary"
              onClick={handleResetFilters}
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