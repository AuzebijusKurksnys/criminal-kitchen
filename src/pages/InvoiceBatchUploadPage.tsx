import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload, MultipleFilePreview } from '../components/FileUpload';
import { showToast } from '../components/Toast';
import { extractInvoiceData, isOpenAIInitialized } from '../services/invoiceParser';
import type { InvoiceProcessingResult } from '../data/types';

interface BatchProcessingItem {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: InvoiceProcessingResult;
  error?: string;
  progress?: number;
}

export function InvoiceBatchUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingItems, setProcessingItems] = useState<BatchProcessingItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const navigate = useNavigate();

  const handleMultipleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setProcessingItems([]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllFiles = () => {
    setSelectedFiles([]);
    setProcessingItems([]);
  };

  const handleStartBatchProcessing = async () => {
    if (selectedFiles.length === 0) {
      showToast('error', 'Please select files first');
      return;
    }

    if (!isOpenAIInitialized()) {
      showToast('error', 'OpenAI API key not configured. Please check settings.');
      navigate('/settings');
      return;
    }

    setIsProcessing(true);
    setCurrentProcessingIndex(0);

    // Initialize processing items
    const items: BatchProcessingItem[] = selectedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));
    setProcessingItems(items);

    // Process files sequentially to avoid API rate limits
    for (let i = 0; i < items.length; i++) {
      setCurrentProcessingIndex(i);
      
      // Update status to processing
      setProcessingItems(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'processing', progress: 0 } : item
      ));

      try {
        // Simulate progress updates
        for (let progress = 10; progress <= 90; progress += 20) {
          setProcessingItems(prev => prev.map((item, index) => 
            index === i ? { ...item, progress } : item
          ));
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const result = await extractInvoiceData(items[i].file);
        
        // Update with success
        setProcessingItems(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'completed', 
            progress: 100, 
            result 
          } : item
        ));

      } catch (error) {
        console.error(`Error processing file ${items[i].file.name}:`, error);
        
        // Update with error
        setProcessingItems(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Processing failed'
          } : item
        ));
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);
    
    const completedCount = processingItems.filter(item => item.status === 'completed').length;
    const errorCount = processingItems.filter(item => item.status === 'error').length;
    
    if (completedCount > 0) {
      showToast('success', `Successfully processed ${completedCount} invoices${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    } else {
      showToast('error', 'No invoices were processed successfully');
    }
  };

  const handleReviewInvoice = (item: BatchProcessingItem) => {
    if (!item.result) return;
    
    navigate('/invoices/review', { 
      state: { 
        extractedData: item.result,
        file: item.file,
        fromBatch: true
      } 
    });
  };

  const handleBatchReview = () => {
    const completedItems = processingItems
      .filter(item => item.status === 'completed' && item.result)
      .map((item, index) => ({
        file: item.file,
        result: item.result!,
        invoiceIndex: index
      }));
    
    if (completedItems.length === 0) {
      showToast('error', 'No successfully processed invoices to review');
      return;
    }
    
    navigate('/invoices/batch-review', {
      state: {
        batchResults: completedItems
      }
    });
  };

  const getStatusIcon = (status: BatchProcessingItem['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: BatchProcessingItem['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Batch Invoice Processing</h1>
        <p className="mt-2 text-lg text-gray-600">
          Upload multiple invoices and process them automatically
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Select Invoice Files
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose multiple PDF documents or images of your invoices. PDF files are automatically converted to images for processing.
              </p>
            </div>

            <div className="p-6">
              {selectedFiles.length === 0 ? (
                <FileUpload
                  onMultipleFileSelect={handleMultipleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.heic"
                  maxSize={10 * 1024 * 1024} // 10MB
                  multiple={true}
                  maxFiles={20}
                />
              ) : (
                <div className="space-y-4">
                  <MultipleFilePreview
                    files={selectedFiles}
                    onRemove={handleRemoveFile}
                    onRemoveAll={handleRemoveAllFiles}
                  />
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Add More Files
                    </button>
                    
                    <button
                      onClick={handleStartBatchProcessing}
                      disabled={isProcessing || selectedFiles.length === 0}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                          Processing {currentProcessingIndex + 1} of {selectedFiles.length}...
                        </>
                      ) : (
                        <>🚀 Process All Invoices</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">
              💡 Batch Processing Tips
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Files are processed sequentially to ensure quality and avoid API limits</p>
              <p>• Each invoice is automatically extracted and matched to your products</p>
              <p>• Review each processed invoice individually before approval</p>
              <p>• Large batches may take several minutes to complete</p>
              <p>• For best results, ensure all files are clear and well-lit</p>
            </div>
          </div>
        </div>

        {/* Processing Status Section */}
        <div className="space-y-6">
          {processingItems.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Processing Status
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Track the progress of your batch processing
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {processingItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getStatusIcon(item.status)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.file.name}
                            </p>
                            <p className={`text-sm ${getStatusColor(item.status)}`}>
                              {item.status === 'processing' && `Processing... ${item.progress || 0}%`}
                              {item.status === 'completed' && 'Extraction completed'}
                              {item.status === 'error' && (item.error || 'Processing failed')}
                              {item.status === 'pending' && 'Waiting to process'}
                            </p>
                          </div>
                        </div>
                        
                        {item.status === 'completed' && item.result && (
                          <button
                            onClick={() => handleReviewInvoice(item)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                          >
                            Review
                          </button>
                        )}
                      </div>
                      
                      {item.status === 'processing' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {processingItems.length > 0 && !isProcessing && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Completed: {processingItems.filter(item => item.status === 'completed').length}</span>
                        <span>Failed: {processingItems.filter(item => item.status === 'error').length}</span>
                        <span>Total: {processingItems.length}</span>
                      </div>
                    </div>
                    
                    {processingItems.filter(item => item.status === 'completed').length > 0 && (
                      <div className="text-center">
                        <button
                          onClick={handleBatchReview}
                          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          📋 Review All {processingItems.filter(item => item.status === 'completed').length} Invoices
                        </button>
                        <p className="mt-2 text-sm text-gray-600">
                          Review and approve all processed invoices with grouped products for faster processing
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
