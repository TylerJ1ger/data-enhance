import React, { useState } from 'react';
import { FiFileText, FiChevronDown, FiChevronUp, FiAlertCircle } from 'react-icons/fi';
import { ExtractedContent, SpellingError, GrammarError } from '../../types/seo';

interface ContentDisplayProps {
  content: ExtractedContent;
  isLoading?: boolean;
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, isLoading = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'errors'>('text');

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!content || !content.text) {
    return null;
  }

  // 高亮拼写和语法错误的内容显示
  const renderHighlightedContent = () => {
    // 合并所有错误，并按照位置排序
    const allErrors = [
      ...content.spelling_errors.map(err => ({ ...err, type: 'spelling' as const })),
      ...content.grammar_errors.map(err => ({ ...err, type: 'grammar' as const }))
    ].sort((a, b) => {
      // 首先按文本内容排序
      if (a.text !== b.text) return a.text.localeCompare(b.text);
      // 然后按偏移量排序
      return a.offset - b.offset;
    });

    if (allErrors.length === 0) {
      return <div className="whitespace-pre-line">{content.text}</div>;
    }

    // 按段落分割内容，便于显示
    const paragraphs = content.text.split(/\n+/);
    
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph, pIndex) => {
          // 找出当前段落中的错误
          const paragraphErrors = allErrors.filter(err => 
            paragraph.includes(err.text.substring(err.offset, err.offset + err.length))
          );
          
          if (paragraphErrors.length === 0) {
            return <p key={pIndex}>{paragraph}</p>;
          }
          
          // 为段落中的错误创建高亮标记
          let lastPos = 0;
          const parts = [];
          
          for (const error of paragraphErrors) {
            // 找到错误在当前段落中的位置
            const errorText = error.text.substring(error.offset, error.offset + error.length);
            const errorPos = paragraph.indexOf(errorText, lastPos);
            
            if (errorPos === -1) continue;
            
            // 添加错误前的文本
            if (errorPos > lastPos) {
              parts.push(<span key={`${pIndex}-${lastPos}`}>{paragraph.substring(lastPos, errorPos)}</span>);
            }
            
            // 添加带高亮的错误文本
            const className = error.type === 'spelling' 
              ? 'bg-red-100 text-red-800 px-1 rounded relative group cursor-help'
              : 'bg-yellow-100 text-yellow-800 px-1 rounded relative group cursor-help';
            
            parts.push(
              <span 
                key={`${pIndex}-${errorPos}`} 
                className={className}
                title={error.message}
              >
                {paragraph.substring(errorPos, errorPos + errorText.length)}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded w-64 z-10">
                  {error.message}
                  {error.replacements && error.replacements.length > 0 && (
                    <span className="block mt-1">
                      建议: {error.replacements.join(', ')}
                    </span>
                  )}
                </span>
              </span>
            );
            
            lastPos = errorPos + errorText.length;
          }
          
          // 添加段落剩余部分
          if (lastPos < paragraph.length) {
            parts.push(<span key={`${pIndex}-${lastPos}`}>{paragraph.substring(lastPos)}</span>);
          }
          
          return <p key={pIndex}>{parts}</p>;
        })}
      </div>
    );
  };

  // 渲染错误列表
  const renderErrorList = () => {
    const hasSpellingErrors = content.spelling_errors && content.spelling_errors.length > 0;
    const hasGrammarErrors = content.grammar_errors && content.grammar_errors.length > 0;
    
    if (!hasSpellingErrors && !hasGrammarErrors) {
      return (
        <div className="py-8 text-center text-gray-500">
          <FiAlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p>未发现语法或拼写错误</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* 拼写错误 */}
        {hasSpellingErrors && (
          <div>
            <h3 className="font-medium text-red-700 mb-2">拼写错误 ({content.spelling_errors.length})</h3>
            <div className="space-y-2">
              {content.spelling_errors.map((error, index) => (
                <div key={`spelling-${index}`} className="bg-red-50 rounded-md p-3 border border-red-200">
                  <div className="text-red-800 font-medium mb-1">
                    问题文本: <span className="font-normal">{error.text.substring(error.offset, error.offset + error.length)}</span>
                  </div>
                  <div className="text-sm text-red-700 mb-1">
                    {error.message}
                  </div>
                  {error.replacements && error.replacements.length > 0 && (
                    <div className="text-sm text-gray-600">
                      建议更正: {error.replacements.join(', ')}
                    </div>
                  )}
                  <div className="mt-2 text-xs bg-white p-2 rounded text-gray-700 whitespace-pre-wrap">
                    上下文: {error.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 语法错误 */}
        {hasGrammarErrors && (
          <div>
            <h3 className="font-medium text-yellow-700 mb-2">语法错误 ({content.grammar_errors.length})</h3>
            <div className="space-y-2">
              {content.grammar_errors.map((error, index) => (
                <div key={`grammar-${index}`} className="bg-yellow-50 rounded-md p-3 border border-yellow-200">
                  <div className="text-yellow-800 font-medium mb-1">
                    问题文本: <span className="font-normal">{error.text.substring(error.offset, error.offset + error.length)}</span>
                  </div>
                  <div className="text-sm text-yellow-700 mb-1">
                    {error.message}
                  </div>
                  {error.replacements && error.replacements.length > 0 && (
                    <div className="text-sm text-gray-600">
                      建议更正: {error.replacements.join(', ')}
                    </div>
                  )}
                  <div className="mt-2 text-xs bg-white p-2 rounded text-gray-700 whitespace-pre-wrap">
                    上下文: {error.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <FiFileText className="mr-2 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-800">提取的页面内容</h3>
          {(content.spelling_errors.length > 0 || content.grammar_errors.length > 0) && (
            <span className="ml-2 text-sm text-gray-500">
              (发现 {content.spelling_errors.length + content.grammar_errors.length} 个问题)
            </span>
          )}
        </div>
        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          {/* Tab切换 */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex space-x-8">
              <button
                className={`pb-2 px-1 text-sm font-medium ${
                  activeTab === 'text' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('text')}
              >
                内容预览
              </button>
              <button
                className={`pb-2 px-1 text-sm font-medium ${
                  activeTab === 'errors' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('errors')}
              >
                错误列表 ({content.spelling_errors.length + content.grammar_errors.length})
              </button>
            </div>
          </div>
          
          {/* 内容区域 */}
          <div className="p-4 bg-white rounded-md border border-gray-200 max-h-96 overflow-y-auto">
            {activeTab === 'text' ? renderHighlightedContent() : renderErrorList()}
          </div>
          
          {/* 文字统计 */}
          <div className="mt-2 text-xs text-gray-500 flex justify-between">
            <span>字符数: {content.text.length}</span>
            <span>字数: {content.text.split(/\s+/).filter(Boolean).length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDisplay;