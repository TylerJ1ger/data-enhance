import React, { useState } from 'react';
import { FiAlertTriangle, FiAlertCircle, FiSearch, FiExternalLink, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { SEOIssue, SEOUploadResponse } from '../../types/seo';
import ContentDisplay from './ContentDisplay';

interface SEOResultsProps {
  results: SEOUploadResponse | null;
  isLoading?: boolean;
}

const SEOResults: React.FC<SEOResultsProps> = ({
  results,
  isLoading = false,
}) => {
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card">
        <div className="text-center py-6 text-gray-500">
          <FiSearch className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p>上传HTML文件以查看SEO分析结果</p>
        </div>
      </div>
    );
  }

  const toggleIssue = (issueKey: string) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueKey]: !prev[issueKey]
    }));
  };

  const renderIssueItem = (issue: SEOIssue, index: number, type: string) => {
    const issueKey = `${type}-${index}`;
    const isExpanded = expandedIssues[issueKey] || false;
    
    // 不同类型对应不同的图标和颜色
    const getIconAndColor = () => {
      switch (type) {
        case 'issue':
          return { 
            icon: <FiAlertCircle className="text-red-500" />, 
            bgColor: 'bg-red-50', 
            textColor: 'text-red-700',
            borderColor: 'border-red-200'
          };
        case 'warning':
          return { 
            icon: <FiAlertTriangle className="text-yellow-500" />, 
            bgColor: 'bg-yellow-50', 
            textColor: 'text-yellow-700',
            borderColor: 'border-yellow-200'
          };
        case 'opportunity':
          return { 
            icon: <FiSearch className="text-blue-500" />, 
            bgColor: 'bg-blue-50', 
            textColor: 'text-blue-700',
            borderColor: 'border-blue-200'
          };
        default:
          return { 
            icon: <FiAlertCircle className="text-gray-500" />, 
            bgColor: 'bg-gray-50', 
            textColor: 'text-gray-700',
            borderColor: 'border-gray-200'
          };
      }
    };

    // 优先级标记
    const getPriorityBadge = () => {
      switch (issue.priority) {
        case 'high':
          return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">高优先级</span>;
        case 'medium':
          return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">中优先级</span>;
        case 'low':
          return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">低优先级</span>;
        default:
          return null;
      }
    };

    const { icon, bgColor, textColor, borderColor } = getIconAndColor();

    return (
      <div 
        key={issueKey} 
        className={`mb-4 rounded-lg border ${borderColor} overflow-hidden`}
      >
        <div 
          className={`p-4 ${bgColor} ${textColor} flex items-center justify-between cursor-pointer`}
          onClick={() => toggleIssue(issueKey)}
        >
          <div className="flex items-center">
            <div className="mr-3">{icon}</div>
            <div>
              <div className="font-medium">{issue.issue}</div>
              <div className="text-sm">[{issue.category}]</div>
            </div>
          </div>
          <div className="flex items-center">
            {getPriorityBadge()}
            <div className="ml-3">
              {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 bg-white">
            <p className="mb-3">{issue.description}</p>
            
            {issue.affected_element && (
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-1">受影响的元素:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                  {issue.affected_element}
                </pre>
              </div>
            )}
            
            {issue.affected_resources && issue.affected_resources.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-1">受影响的资源:</h4>
                <ul className="bg-gray-100 p-2 rounded text-xs">
                  {issue.affected_resources.map((resource, i) => (
                    <li key={i} className="mb-1 break-all">{resource}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面信息 */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-800 mb-4">页面信息</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium w-24">文件名:</span>
            <span>{results.file_name}</span>
          </div>
          {results.page_url && (
            <div className="flex items-center">
              <span className="font-medium w-24">页面URL:</span>
              <a 
                href={results.page_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline flex items-center"
              >
                {results.page_url} <FiExternalLink className="ml-1" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 内容展示组件 - 新增 */}
      {results.extracted_content && (
        <ContentDisplay 
          content={results.extracted_content} 
          isLoading={isLoading}
        />
      )}

      {/* 统计摘要 */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-800 mb-4">SEO问题概览</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
            <FiAlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <div className="text-xl font-bold text-red-700">{results.issues_count.issues}</div>
            <div className="text-sm text-red-700">需要修复的问题</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
            <FiAlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-xl font-bold text-yellow-700">{results.issues_count.warnings}</div>
            <div className="text-sm text-yellow-700">需要检查的警告</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
            <FiSearch className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-xl font-bold text-blue-700">{results.issues_count.opportunities}</div>
            <div className="text-sm text-blue-700">可改进的机会</div>
          </div>
        </div>
      </div>

      {/* 问题列表 */}
      {results.issues_count.issues > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-800 mb-4">需要修复的问题</h3>
          {results.issues.issues.map((issue, index) => renderIssueItem(issue, index, 'issue'))}
        </div>
      )}

      {/* 警告列表 */}
      {results.issues_count.warnings > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-800 mb-4">需要检查的警告</h3>
          {results.issues.warnings.map((issue, index) => renderIssueItem(issue, index, 'warning'))}
        </div>
      )}

      {/* 机会列表 */}
      {results.issues_count.opportunities > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-800 mb-4">可改进的机会</h3>
          {results.issues.opportunities.map((issue, index) => renderIssueItem(issue, index, 'opportunity'))}
        </div>
      )}
    </div>
  );
};

export default SEOResults;