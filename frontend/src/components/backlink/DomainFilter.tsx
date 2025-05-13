// frontend/src/components/backlink/DomainFilter.tsx
import React, { useState } from 'react';
import { FiSearch, FiLoader } from 'react-icons/fi';
import Button from '../common/Button';
import { DomainFilterResponse } from '../../types';

interface DomainFilterProps {
  onFilter: (domain: string) => void;
  results: DomainFilterResponse | null;
  isLoading: boolean;
  disabled?: boolean;
}

const DomainFilter: React.FC<DomainFilterProps> = ({
  onFilter,
  results,
  isLoading,
  disabled = false,
}) => {
  const [domain, setDomain] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      onFilter(domain.trim());
    }
  };
  
  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">域名筛选</h3>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex space-x-2">
          <div className="flex-grow">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="输入域名..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={disabled || isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={disabled || isLoading || !domain.trim()}
            icon={isLoading ? <FiLoader className="animate-spin" /> : <FiSearch />}
          >
            搜索
          </Button>
        </div>
      </form>
      
      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      )}
      
      {!isLoading && results && (
        <div>
          {results.results.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              未找到匹配的域名数据
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-2">
                共找到 {results.results.length} 条"{domain}"域名数据
              </div>
              
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品牌</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">域名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">域名权重</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">外链数</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">国家</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">首次发现</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后发现</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.results.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.brand}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">
                          <a 
                            href={item.domain.startsWith('http') ? item.domain : `https://${item.domain}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {item.domain}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.domain_ascore !== undefined && item.domain_ascore !== null 
                            ? item.domain_ascore 
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.backlinks !== undefined && item.backlinks !== null 
                            ? item.backlinks.toLocaleString() 
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.ip_address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.country || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.first_seen || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.last_seen || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DomainFilter;