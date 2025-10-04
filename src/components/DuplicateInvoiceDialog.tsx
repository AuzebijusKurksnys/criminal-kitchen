import { useState } from 'react';
import { Invoice, InvoiceLineItem } from '../data/types';
import { DuplicateCheckResult, LineItemComparison, generateMergePreview } from '../utils/invoiceDuplicateHandler';

interface DuplicateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (options: {
    mergeLineItems: boolean;
    updateTotals: boolean;
    keepExistingFile: boolean;
  }) => void;
  onReplace: () => void;
  onCancel: () => void;
  duplicateInfo: DuplicateCheckResult;
  newInvoiceData: {
    invoice: Partial<Invoice>;
    lineItems: Partial<InvoiceLineItem>[];
  };
}

export function DuplicateInvoiceDialog({
  isOpen,
  onClose,
  onMerge,
  onReplace,
  onCancel,
  duplicateInfo,
  newInvoiceData
}: DuplicateInvoiceDialogProps) {
  const [mergeOptions, setMergeOptions] = useState({
    mergeLineItems: true,
    updateTotals: true,
    keepExistingFile: true
  });

  if (!isOpen || !duplicateInfo.isDuplicate) {
    return null;
  }

  const { existing, existingLineItems } = duplicateInfo;
  const preview = generateMergePreview(existing, existingLineItems, newInvoiceData.lineItems);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Duplicate Invoice Detected</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3">Existing Invoice</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Number:</span> <span className="text-white">{existing.invoiceNumber}</span></div>
                <div><span className="text-gray-400">Date:</span> <span className="text-white">{existing.invoiceDate}</span></div>
                <div><span className="text-gray-400">Supplier:</span> <span className="text-white">{existing.supplierName}</span></div>
                <div><span className="text-gray-400">Total:</span> <span className="text-white">€{existing.totalInclVat?.toFixed(2)}</span></div>
                <div><span className="text-gray-400">Status:</span> <span className="text-white">{existing.status}</span></div>
                <div><span className="text-gray-400">Line Items:</span> <span className="text-white">{existingLineItems.length}</span></div>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3">New Invoice</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Number:</span> <span className="text-white">{newInvoiceData.invoice.invoiceNumber || 'N/A'}</span></div>
                <div><span className="text-gray-400">Date:</span> <span className="text-white">{newInvoiceData.invoice.invoiceDate || 'N/A'}</span></div>
                <div><span className="text-gray-400">Supplier:</span> <span className="text-white">{newInvoiceData.invoice.supplierName || 'N/A'}</span></div>
                <div><span className="text-gray-400">Total:</span> <span className="text-white">€{newInvoiceData.invoice.totalInclVat?.toFixed(2) || '0.00'}</span></div>
                <div><span className="text-gray-400">Line Items:</span> <span className="text-white">{newInvoiceData.lineItems.length}</span></div>
              </div>
            </div>
          </div>

          {/* Merge Preview */}
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-400 mb-3">Merge Preview</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{preview.totalLineItems}</div>
                <div className="text-gray-400">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{preview.duplicateLineItems}</div>
                <div className="text-gray-400">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{preview.newLineItems}</div>
                <div className="text-gray-400">New Items</div>
              </div>
            </div>
          </div>

          {/* Duplicate Line Items */}
          {preview.comparisons.length > 0 && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3">Duplicate Line Items</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {preview.comparisons.map((comparison, index) => (
                  <div key={index} className="bg-gray-600 p-3 rounded">
                    <div className="text-white font-medium mb-2">{comparison.existing.productName}</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Existing:</span>
                        <div className="text-white">{comparison.existing.quantity} {comparison.existing.unit} @ €{comparison.existing.unitPrice}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">New:</span>
                        <div className="text-white">{comparison.new.quantity} {comparison.new.unit} @ €{comparison.new.unitPrice}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merge Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Merge Options</h3>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={mergeOptions.mergeLineItems}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, mergeLineItems: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-white">Merge line items (add quantities for duplicates)</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={mergeOptions.updateTotals}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, updateTotals: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-white">Update invoice totals</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={mergeOptions.keepExistingFile}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, keepExistingFile: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-white">Keep existing file (don't replace)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4 border-t border-gray-600">
            <button
              onClick={() => onMerge(mergeOptions)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Merge Invoice
            </button>
            <button
              onClick={onReplace}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Replace Existing
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
