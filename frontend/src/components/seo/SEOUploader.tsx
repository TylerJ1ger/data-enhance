import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import Button from '../common/Button';

interface SEOUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const SEOUploader: React.FC<SEOUploaderProps> = ({
  onFileSelected,
  disabled = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
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
    </div>
  );
};

export default SEOUploader;