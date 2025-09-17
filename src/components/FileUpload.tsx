import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onFileSelect?: (file: File) => void;
  onMultipleFileSelect?: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export function FileUpload({ 
  onFileSelect, 
  onMultipleFileSelect,
  accept = '.jpg,.jpeg,.png,.gif,.webp', 
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '',
  multiple = false,
  maxFiles = 10
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeTypeAllowed = allowedTypes.some(type => 
      type.startsWith('.') ? type === fileExtension : file.type.includes(type.replace('*', ''))
    );

    if (!mimeTypeAllowed) {
      setError(`File type not supported. Allowed: ${accept}`);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  const handleMultipleFiles = (files: File[]) => {
    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed. Selected ${files.length} files.`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: Invalid file`);
      }
    }

    if (errors.length > 0) {
      setError(`Some files were rejected: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` and ${errors.length - 3} more` : ''}`);
    }

    if (validFiles.length > 0 && onMultipleFileSelect) {
      onMultipleFileSelect(validFiles);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (multiple && files.length > 1) {
        handleMultipleFiles(files);
      } else {
        handleFile(files[0]);
      }
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (multiple && files.length > 1) {
        handleMultipleFiles(Array.from(files));
      } else {
        handleFile(files[0]);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCameraDialog = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="space-y-4">
          <div className="text-4xl text-gray-400">
            📄
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {multiple ? 'Drop invoices here or click to upload' : 'Drop your invoice here or click to upload'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF, JPG, PNG, HEIC up to {Math.round(maxSize / 1024 / 1024)}MB
              {multiple ? ` • Max ${maxFiles} files` : ''}
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              📁 Browse Files
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCameraDialog();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              📷 Take Photo
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}

// Multiple File preview component
interface MultipleFilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onRemoveAll: () => void;
}

export function MultipleFilePreview({ files, onRemove, onRemoveAll }: MultipleFilePreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Selected Files ({files.length})
        </h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Total: {formatFileSize(totalSize)}
          </span>
          <button
            onClick={onRemoveAll}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove All
          </button>
        </div>
      </div>
      
      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {files.map((file, index) => (
          <FilePreview
            key={`${file.name}-${index}`}
            file={file}
            onRemove={() => onRemove(index)}
            showIndex={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

// File preview component
interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  showIndex?: number;
}

export function FilePreview({ file, onRemove, showIndex }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);

  useState(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-start space-x-4">
        {showIndex && (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">{showIndex}</span>
          </div>
        )}
        
        {preview ? (
          <img 
            src={preview} 
            alt="Preview" 
            className="w-20 h-20 object-cover rounded"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-2xl">
              {file.type.includes('pdf') ? '📄' : '📁'}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </p>
          <p className="text-sm text-gray-500">
            {formatFileSize(file.size)}
          </p>
          <p className="text-xs text-gray-400">
            {file.type}
          </p>
        </div>
        
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 p-1"
          title="Remove file"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
