import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import Button from '../common/Button';

interface SitemapUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const SitemapUploader: React.FC<SitemapUploaderProps> = ({
  onFilesSelected,
  disabled = false,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      
      // 更新文件状态
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
      
      // 调用父组件处理器
      onFilesSelected([...files, ...acceptedFiles]);
    },
    [files, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: true,
    disabled,
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFilesSelected(newFiles);
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
              : '拖放文件至此，或点击选择文件'}
          </p>
          <p className="text-xs text-gray-500">
            支持XML、CSV和XLSX文件格式
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            已选文件 ({files.length}):
          </h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-gray-50 p-2 rounded-md text-sm"
              >
                <div className="flex items-center space-x-2">
                  <FiFile className="text-gray-400" />
                  <span className="truncate max-w-xs">{file.name}</span>
                  <span className="text-gray-500 text-xs">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <FiX />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFiles([]);
              onFilesSelected([]);
            }}
          >
            清除全部
          </Button>
        </div>
      )}
    </div>
  );
};

export default SitemapUploader;