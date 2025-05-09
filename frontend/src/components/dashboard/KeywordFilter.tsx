import React, { useState } from 'react';
import { FiSearch, FiLoader } from 'react-icons/fi';
import Button from '../common/Button';
import { KeywordFilterResponse } from '../../types';

interface KeywordFilterProps {
  onFilter: (keyword: string) => void;
  results: KeywordFilterResponse | null;
  isLoading: boolean;
  disabled?: boolean;
}

const KeywordFilter: React.FC<KeywordFilterProps> = ({
  onFilter,
  results,
  isLoading,
  disabled = false,
}) => {
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onFilter(keyword.trim());
    }
  };

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">关键词筛选</h3>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex space-x-2">
          <div className="flex-grow">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入关键词..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={disabled || isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={disabled || isLoading || !keyword.trim()}
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
              未找到匹配的关键词数据
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-2">
                共找到 {results.results.length} 个品牌下的"{keyword}"关键词数据
              </div>
              
              {results.results.map((brandData) => (
                <div key={brandData.brand} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b font-medium">
                    品牌: {brandData.brand}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关键词</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名位置</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">流量</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {brandData.data.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.keyword}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.position !== undefined && item.position !== null 
                                ? item.position 
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.url ? (
                                <a 
                                  href={item.url.startsWith('http') ? item.url : `https://${item.url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:underline truncate block max-w-xs"
                                >
                                  {item.url}
                                </a>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.traffic !== undefined && item.traffic !== null 
                                ? item.traffic.toLocaleString() 
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordFilter;