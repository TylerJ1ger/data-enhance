import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import Button from './Button';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept = {
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
  },
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errorMessages = rejectedFiles.map((file) => {
          const errors = file.errors.map((e: any) => e.message).join(', ');
          return `${file.file.name}: ${errors}`;
        });
        setError(errorMessages.join('\n'));
        return;
      }

      setError(null);
      
      // Update files state
      if (multiple) {
        setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
      } else {
        setFiles(acceptedFiles);
      }
      
      // Call parent handler
      if (multiple) {
        onFilesSelected([...files, ...acceptedFiles]);
      } else {
        onFilesSelected(acceptedFiles);
      }
    },
    [multiple, files, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize,
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
              ? 'Drop the files here...'
              : `Drag & drop ${multiple ? 'files' : 'a file'} here, or click to select`}
          </p>
          <p className="text-xs text-gray-500">
            {multiple ? 'CSV and XLSX files supported' : 'Only CSV and XLSX files are supported'}
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
            Selected Files ({files.length}):
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
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;