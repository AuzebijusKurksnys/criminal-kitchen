import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload, FilePreview } from './FileUpload';
import { showToast } from './Toast';
import { extractInvoiceData, isOpenAIInitialized } from '../services/invoiceParser';

interface UnifiedInvoiceUploadProps {
  className?: string;
}

export function UnifiedInvoiceUpload({ className = '' }: UnifiedInvoiceUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
  }>({ current: 0, total: 0, currentFile: '' });
  const navigate = useNavigate();

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFiles(prev => {
      // Check if file already exists
      const exists = prev.some(f => f.name === file.name && f.size === file.size);
      if (exists) {
        showToast('warning', 'File already selected');
        return prev;
      }
      return [...prev, file];
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveAllFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const processInvoicesSequentially = async (files: File[]) => {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress({
        current: i + 1,
        total: files.length,
        currentFile: file.name
      });

      try {
        console.log(`🔄 Processing file ${i + 1}/${files.length}: ${file.name}`);
        const result = await extractInvoiceData(file);
        results.push({
          file,
          result,
          invoiceIndex: i
        });
        console.log(`✅ Successfully processed: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to process ${file.name}:`, error);
        showToast('error', `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue processing other files even if one fails
      }

      // Add a small delay between files to be gentle on Azure API
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  };

  const handleProcessInvoices = async () => {
    if (selectedFiles.length === 0) {
      showToast('error', 'Please select at least one file');
      return;
    }

    if (!isOpenAIInitialized()) {
      showToast('error', 'OpenAI API key not configured. Please check settings.');
      navigate('/settings');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: selectedFiles.length, currentFile: '' });

    try {
      const results = await processInvoicesSequentially(selectedFiles);
      
      if (results.length === 0) {
        showToast('error', 'No files were processed successfully');
        return;
      }

      if (results.length === 1) {
        // Single file - go to single invoice review
        navigate('/invoices/review', { 
          state: { 
            extractedData: results[0].result,
            file: results[0].file,
            cacheKey: Date.now() 
          } 
        });
      } else {
        // Multiple files - go to batch review
        navigate('/invoices/batch-review', { 
          state: { 
            batchResults: results,
            cacheKey: Date.now() 
          } 
        });
      }
      
      showToast('success', `Successfully processed ${results.length} invoice${results.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Error processing invoices:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to process invoices');
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, currentFile: '' });
    }
  };

  const isProcessingComplete = processingProgress.current > 0 && processingProgress.current === processingProgress.total;

  return (
    <div className={className}>
      <div className="bg-gray-900 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-medium text-gray-100">
            Upload Invoice{selectedFiles.length > 1 ? 's' : ''}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Upload one or more invoice files (JPG, PNG, GIF, WebP, or PDF format)
            {selectedFiles.length > 1 && ' - Files will be processed sequentially to avoid rate limits'}
          </p>
        </div>

        <div className="p-6">
          {selectedFiles.length === 0 ? (
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              maxSize={10 * 1024 * 1024} // 10MB
              multiple={true}
            />
          ) : (
            <div className="space-y-4">
              {/* File List */}
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <FilePreview
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-200">
                      Processing {processingProgress.current} of {processingProgress.total}
                    </span>
                    <span className="text-xs text-blue-300">
                      {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-900/30 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-300">
                    {processingProgress.currentFile && `Processing: ${processingProgress.currentFile}`}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={handleRemoveAllFiles}
                    disabled={isProcessing}
                    className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-50"
                  >
                    Clear all
                  </button>
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = '.jpg,.jpeg,.png,.gif,.webp,.pdf';
                        input.onchange = (e) => {
                          const files = Array.from((e.target as HTMLInputElement).files || []);
                          files.forEach(handleFileSelect);
                        };
                        input.click();
                      }}
                      disabled={isProcessing}
                      className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                      Add more files
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate('/invoices')}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleProcessInvoices}
                    disabled={isProcessing || !isOpenAIInitialized()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin inline-block mr-2">⟳</span>
                        Processing...
                      </>
                    ) : (
                      `Process ${selectedFiles.length} File${selectedFiles.length === 1 ? '' : 's'}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          💡 How It Works
        </h3>
        <div className="text-xs text-blue-800 space-y-1">
          <p><strong>Single file:</strong> Direct to review page with full editing capabilities</p>
          <p><strong>Multiple files:</strong> Batch processing with smart product grouping and supplier matching</p>
          <p><strong>Sequential processing:</strong> Files are processed one by one to prevent API rate limits</p>
        </div>
      </div>
    </div>
  );
}
