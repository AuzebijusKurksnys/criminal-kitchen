import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload, FilePreview } from '../components/FileUpload';
import { showToast } from '../components/Toast';
import { extractInvoiceData, isOpenAIInitialized } from '../services/invoiceParser';


export function InvoiceUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleBatchUpload = () => {
    navigate('/invoices/batch-upload');
  };

  const handleProcessInvoice = async () => {
    if (!selectedFile) {
      showToast('error', 'Please select a file first');
      return;
    }

    if (!isOpenAIInitialized()) {
      showToast('error', 'OpenAI API key not configured. Please check settings.');
      navigate('/settings');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await extractInvoiceData(selectedFile);
      
      // Navigate to review page with a cache-buster so stale state is never reused
      navigate('/invoices/review', { 
        state: { 
          extractedData: result,
          file: selectedFile,
          cacheKey: Date.now() 
        } 
      });
      
      showToast('success', 'Invoice data extracted successfully');
    } catch (error) {
      console.error('Error processing invoice:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to process invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">Upload Invoice</h1>
        <p className="mt-2 text-gray-600">
          Upload your supplier invoice to automatically extract product information and update inventory.
        </p>
        
        {/* Upload Mode Selector */}
        <div className="mt-6 flex justify-center">
          <div className="bg-gray-900 rounded-lg p-1 border border-gray-800 inline-flex">
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">
              Single Invoice
            </button>
            <button 
              onClick={handleBatchUpload}
              className="px-4 py-2 text-sm font-medium text-gray-200 hover:text-gray-100 hover:bg-gray-800 rounded-md"
            >
              Batch Upload
            </button>
          </div>
        </div>
      </div>

      {!isOpenAIInitialized() && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                OpenAI API Key Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to configure your OpenAI API key to use automatic invoice processing.{' '}
                  <button
                    onClick={() => navigate('/settings')}
                    className="font-medium underline hover:text-yellow-600"
                  >
                    Go to Settings
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-medium text-gray-100">
            Step 1: Select Invoice File
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Upload an image or PDF of your invoice (JPG, PNG, GIF, WebP, or PDF format)
          </p>
        </div>

        <div className="p-6">
          {!selectedFile ? (
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              maxSize={10 * 1024 * 1024} // 10MB
            />
          ) : (
            <div className="space-y-4">
              <FilePreview
                file={selectedFile}
                onRemove={handleRemoveFile}
              />
              
              <div className="flex justify-between items-center">
                <button
                  onClick={handleRemoveFile}
                  className="text-sm text-gray-400 hover:text-gray-200"
                >
                  Choose different file
                </button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate('/invoices')}
                    className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleProcessInvoice}
                    disabled={isProcessing || !isOpenAIInitialized()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin inline-block mr-2">⟳</span>
                        Processing...
                      </>
                    ) : (
                      'Process Invoice'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">
          💡 How Invoice Processing Works
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">1. Automatic Extraction</h4>
            <p>AI reads your invoice and extracts:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Supplier information</li>
              <li>Invoice number and date</li>
              <li>Product names and quantities</li>
              <li>Prices and VAT amounts</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. Smart Matching</h4>
            <p>System automatically:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Matches products to your inventory</li>
              <li>Suggests new products to create</li>
              <li>Updates supplier prices</li>
              <li>Calculates inventory changes</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-500/20 rounded">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> For best results, ensure your invoice is clearly visible and well-lit if taking a photo.
            PDF files are automatically converted to images for processing. The system works with both Lithuanian and English invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
