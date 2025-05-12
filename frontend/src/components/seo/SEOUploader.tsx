import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX, FiSettings } from 'react-icons/fi';
import Button from '../common/Button';
import { ContentExtractor } from '../../types/seo';

interface SEOUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  contentExtractor: ContentExtractor;
  setContentExtractor: (extractor: ContentExtractor) => void;
  enableAdvancedAnalysis: boolean;
  setEnableAdvancedAnalysis: (enable: boolean) => void;
}

const SEOUploader: React.FC<SEOUploaderProps> = ({
  onFileSelected,
  disabled = false,
  contentExtractor,
  setContentExtractor,
  enableAdvancedAnalysis,
  setEnableAdvancedAnalysis
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // 处理被拒绝的文件
      if (rejectedFiles.length > 0) {
        const errorMessages = rejectedFiles.map((file) => {
          const errors = file.errors.map((e: any) => e.message).join(', ');
          return `${file.file.name}: ${errors}`;
        });
        setError(errorMessages.join('\n'));
        return;
      }

      setError(null);
      
      // 只取第一个文件
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
    },
    multiple: false,
    disabled,
  });

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <FiUpload className="w-10 h-10 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragActive
              ? '将文件拖放到此处...'
              : '拖放HTML文件至此，或点击选择文件'}
          </p>
          <p className="text-xs text-gray-500">
            支持HTML文件格式
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {file && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            已选文件:
          </h4>
          <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md text-sm">
            <div className="flex items-center space-x-2">
              <FiFile className="text-gray-400" />
              <span className="truncate max-w-xs">{file.name}</span>
              <span className="text-gray-500 text-xs">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-gray-500 hover:text-red-500"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}

      {/* 高级选项按钮 */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center text-sm text-gray-600 hover:text-primary-600"
        >
          <FiSettings className="mr-1" />
          {showAdvancedOptions ? '隐藏高级选项' : '显示高级选项'}
        </button>
      </div>

      {/* 高级选项面板 */}
      {showAdvancedOptions && (
        <div className="mt-2 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-3">高级分析选项</h4>
          
          {/* 内容提取引擎选择 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              内容提取引擎
            </label>
            <select
              value={contentExtractor}
              onChange={(e) => setContentExtractor(e.target.value as ContentExtractor)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              disabled={disabled}
            >
              <option value="auto">自动选择最佳引擎</option>
              <option value="trafilatura">Trafilatura (推荐)</option>
              <option value="newspaper">Newspaper3k</option>
              <option value="readability">Readability</option>
              <option value="goose3">Goose3</option>
              <option value="custom">自定义算法</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              不同的提取引擎适用于不同类型的页面，自动模式会尝试所有引擎并选择最佳结果
            </p>
          </div>
          
          {/* 高级内容分析开关 */}
          <div>
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={enableAdvancedAnalysis}
                onChange={(e) => setEnableAdvancedAnalysis(e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>启用高级内容分析 (语法和拼写检查)</span>
            </label>
            <p className="mt-1 ml-5 text-xs text-gray-500">
              使用 language-tool-python 和 textstat 进行语法、拼写和可读性分析，可能会增加分析时间
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEOUploader;