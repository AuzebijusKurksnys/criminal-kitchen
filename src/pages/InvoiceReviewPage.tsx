import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { Select } from '../components/Select';
import { 
  createInvoice, 
  createInvoiceLineItem, 
  uploadInvoiceFile,
  updateInvoice,
  listSuppliers,
  createSupplier,
  createProduct,
  updateProduct,
  createSupplierPrice,
  listProducts,
  getProduct,
  checkInvoiceExists
} from '../data/store';
import { findProductMatches } from '../services/invoiceParser';
import type { 
  InvoiceProcessingResult, 
  Supplier, 
  Product, 
  ProductMatch
} from '../data/types';
import { generateId, generateTimestamp } from '../utils/id';

interface LocationState {
  extractedData: InvoiceProcessingResult;
  file: File;
}

export function InvoiceReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const [extractedData, setExtractedData] = useState<InvoiceProcessingResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [productMatches, setProductMatches] = useState<{ [lineItemIndex: number]: ProductMatch[] }>({});
  const [selectedMatches, setSelectedMatches] = useState<{ [lineItemIndex: number]: string }>({});
  const [editingItems, setEditingItems] = useState<{ [lineItemIndex: number]: boolean }>({});
  const [editedData, setEditedData] = useState<InvoiceProcessingResult | null>(null);

  useEffect(() => {
    if (!state?.extractedData || !state?.file) {
      navigate('/invoices/upload');
      return;
    }

    setExtractedData(state.extractedData);
    setEditedData(state.extractedData); // Initialize edited data
    setFile(state.file);
    loadData();
  }, [state, navigate]);

  const loadData = async () => {
    try {
      const [suppliersData, productsData] = await Promise.all([
        listSuppliers(),
        listProducts()
      ]);

      setSuppliers(suppliersData);
      setProducts(productsData);

      // Find product matches
      if (state?.extractedData?.lineItems) {
        const matches = await findProductMatches(state.extractedData.lineItems);
        setProductMatches(matches);
      }

      // Auto-select supplier if name matches
      if (state?.extractedData?.supplierInfo?.name) {
        const matchingSupplier = suppliersData.find(s => 
          s.name.toLowerCase().includes(state.extractedData.supplierInfo!.name.toLowerCase()) ||
          state.extractedData.supplierInfo!.name.toLowerCase().includes(s.name.toLowerCase())
        );
        if (matchingSupplier) {
          setSelectedSupplierId(matchingSupplier.id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('error', 'Failed to load suppliers and products');
    }
  };

  // Manual correction functions
  const toggleEditing = (index: number) => {
    setEditingItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    if (!editedData) return;
    
    const updatedLineItems = [...editedData.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value
    };
    
    setEditedData({
      ...editedData,
      lineItems: updatedLineItems
    });
  };

  const handleInvoiceDataChange = (field: string, value: any) => {
    if (!extractedData) return;
    
    setExtractedData({
      ...extractedData,
      invoice: {
        ...extractedData.invoice,
        [field]: value
      }
    });
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    
    const updatedLineItems = [...extractedData.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value
    };
    
    setExtractedData({
      ...extractedData,
      lineItems: updatedLineItems
    });
  };

  const handleProductMatch = (lineItemIndex: number, productId: string) => {
    setSelectedMatches({
      ...selectedMatches,
      [lineItemIndex]: productId
    });
  };

  const handleCreateNewSupplier = async () => {
    if (!extractedData?.supplierInfo?.name) return;

    try {
      const newSupplier = await createSupplier({
        name: extractedData.supplierInfo.name,
        email: extractedData.supplierInfo.email || undefined,
        phone: extractedData.supplierInfo.phone || undefined
      });

      setSuppliers([...suppliers, newSupplier]);
      setSelectedSupplierId(newSupplier.id);
      showToast('success', 'New supplier created');
    } catch (error) {
      console.error('Error creating supplier:', error);
      showToast('error', 'Failed to create supplier');
    }
  };

  const handleApproveInvoice = async () => {
    if (!extractedData || !file || !selectedSupplierId) {
      showToast('error', 'Please select a supplier');
      return;
    }

    setIsProcessing(true);

    try {
      // Check if invoice already exists for this supplier
      console.log('Checking for existing invoice...', { 
        supplierId: selectedSupplierId, 
        invoiceNumber: extractedData.invoice.invoiceNumber 
      });
      
      const existingInvoice = await checkInvoiceExists(selectedSupplierId!, extractedData.invoice.invoiceNumber!);
      if (existingInvoice) {
        showToast('error', `Invoice ${extractedData.invoice.invoiceNumber} already exists for this supplier`);
        setIsProcessing(false);
        return;
      }

      // First create the invoice record
      console.log('Creating invoice...', { extractedData: extractedData.invoice, selectedSupplierId });
      const invoiceId = generateId();
      const invoice = await createInvoice({
        ...extractedData.invoice,
        supplierId: selectedSupplierId,
        status: 'approved'
      } as any);
      console.log('Invoice created:', invoice);

      // Upload the file
      console.log('Uploading file...');
      const filePath = await uploadInvoiceFile(file, invoice.id);
      console.log('File uploaded:', filePath);
      
      // Update invoice with file path
      console.log('Updating invoice with file path...');
      await updateInvoice(invoice.id, {
        filePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });
      console.log('Invoice updated with file path');

      // Process line items
      console.log('Processing line items...', extractedData.lineItems.length);
      for (let i = 0; i < extractedData.lineItems.length; i++) {
        const lineItem = extractedData.lineItems[i];
        const selectedProductId = selectedMatches[i];
        console.log(`Processing line item ${i + 1}:`, lineItem);
        
        let productId = selectedProductId;
        let canonicalProductName: string | undefined = undefined;

        // If no explicit selection, auto-link to top high-confidence match
        if (!productId && productMatches[i] && productMatches[i][0] && productMatches[i][0].confidence >= 0.85) {
          productId = productMatches[i][0].productId;
        }

        // If we have a productId, prefer the exact inventory product name to keep names consistent
        if (productId) {
          try {
            const matched = await getProduct(productId);
            if (matched) {
              canonicalProductName = matched.name;
            }
          } catch (e) {
            console.warn('Could not load matched product for canonical name', e);
          }
        }
        
        // Create new product only if explicitly chosen (no auto-pop up)
        if (!productId && lineItem.productName) {
          const shouldCreate = selectedMatches[i] === undefined || selectedMatches[i] === '';
          if (!shouldCreate) {
            // User selected a match; skip creation
          } else {
            const confirmed = window.confirm(
              `No match selected for "${lineItem.productName}". Create new product?`
            );
            if (!confirmed) {
              // Mark as needs review and continue without creating
              continue;
            }
            console.log('Creating new product...');
            
            // Normalize unit to valid values
            const validUnits = ['pcs', 'kg', 'g', 'l', 'ml'];
            let normalizedUnit = 'pcs'; // default
            
            if (lineItem.unit) {
              const unitLower = lineItem.unit.toLowerCase();
              if (validUnits.includes(unitLower)) {
                normalizedUnit = unitLower;
              } else if (unitLower.includes('kg')) {
                normalizedUnit = 'kg';
              } else if (unitLower.includes('gram') || unitLower.includes('g')) {
                normalizedUnit = 'g';
              } else if (unitLower.includes('liter') || unitLower.includes('l')) {
                normalizedUnit = 'l';
              } else if (unitLower.includes('ml') || unitLower.includes('milliliter')) {
                normalizedUnit = 'ml';
              }
            }
            
            console.log(`Normalizing unit from "${lineItem.unit}" to "${normalizedUnit}"`);
            console.log('About to create product with data:', {
              sku: `AUTO-${Date.now()}-${i}`,
              name: lineItem.productName,
              unit: normalizedUnit,
              quantity: lineItem.quantity || 0,
              category: 'Auto-imported'
            });
            
            const newProduct = await createProduct({
              sku: `AUTO-${Date.now()}-${i}`,
              name: lineItem.productName,
              unit: normalizedUnit as any,
              quantity: lineItem.quantity || 0,
              category: 'Auto-imported'
            });
            productId = newProduct.id;
            console.log('New product created:', newProduct);
          }
        }

        // Create line item
        console.log('Creating line item...', {
          invoiceId: invoice.id,
          productId,
          productName: canonicalProductName || lineItem.productName || 'Unknown Product',
          quantity: lineItem.quantity || 1,
          unit: lineItem.unit || 'pcs',
          unitPrice: lineItem.unitPrice || 0
        });
        // Normalize unit for line item too
        const validUnits = ['pcs', 'kg', 'g', 'l', 'ml'];
        let normalizedLineItemUnit = 'pcs'; // default
        
        if (lineItem.unit) {
          const unitLower = lineItem.unit.toLowerCase();
          if (validUnits.includes(unitLower)) {
            normalizedLineItemUnit = unitLower;
          } else if (unitLower.includes('kg')) {
            normalizedLineItemUnit = 'kg';
          } else if (unitLower.includes('gram') || unitLower.includes('g')) {
            normalizedLineItemUnit = 'g';
          } else if (unitLower.includes('liter') || unitLower.includes('l')) {
            normalizedLineItemUnit = 'l';
          } else if (unitLower.includes('ml') || unitLower.includes('milliliter')) {
            normalizedLineItemUnit = 'ml';
          }
        }

        // If we matched an existing product, force unit to that product's unit to keep consistency
        if (productId) {
          const existing = products.find(p => p.id === productId);
          if (existing) {
            normalizedLineItemUnit = existing.unit as any;
          }
        }

        await createInvoiceLineItem({
          invoiceId: invoice.id,
          productId,
          productName: canonicalProductName || lineItem.productName || 'Unknown Product',
          description: lineItem.description,
          quantity: lineItem.quantity || 1,
          unit: normalizedLineItemUnit,
          unitPrice: lineItem.unitPrice || 0,
          totalPrice: lineItem.totalPrice || 0,
          vatRate: lineItem.vatRate || 21,
          matchedProductId: productId,
          matchConfidence: productMatches[i]?.[0]?.confidence,
          needsReview: false
        } as any);
        console.log('Line item created');

        // Update inventory and supplier prices
        if (productId) {
          // For existing products (found in products array), add to existing quantity
          // For newly created products, the quantity was already set correctly during creation
          const existingProduct = products.find(p => p.id === productId);
          
          if (existingProduct) {
            // This is an existing product - add invoice quantity to current quantity
            console.log('Updating existing product quantity...', {
              productName: existingProduct.name,
              currentQuantity: existingProduct.quantity,
              addingQuantity: lineItem.quantity || 0,
              newTotal: existingProduct.quantity + (lineItem.quantity || 0)
            });
            await updateProduct({
              ...existingProduct,
              quantity: existingProduct.quantity + (lineItem.quantity || 0)
            });
            console.log('Existing product quantity updated');
          } else {
            // This is a newly created product - quantity was already set correctly during creation
            console.log('Newly created product quantity already set correctly during creation');
          }

          // Update supplier price
          try {
            console.log('Creating supplier price...');
            const unitPrice = lineItem.unitPrice || 0;
            const vatRate = lineItem.vatRate || 21;
            const priceExclVat = unitPrice;
            const priceInclVat = unitPrice * (1 + vatRate / 100);
            
            await createSupplierPrice({
              productId,
              supplierId: selectedSupplierId,
              price: unitPrice, // Legacy field
              priceExclVat,
              priceInclVat,
              vatRate,
              currency: 'EUR',
              invoiceId: invoice.id
            });
            console.log('Supplier price created');
          } catch (error) {
            console.warn('Failed to create supplier price:', error);
          }
        }
      }

      showToast('success', 'Invoice processed successfully');
      navigate('/invoices');
      
    } catch (error) {
      console.error('Error processing invoice:', error);
      
      // Provide more detailed error message
      let errorMessage = 'Failed to process invoice';
      if (error instanceof Error) {
        errorMessage = `Failed to process invoice: ${error.message}`;
        console.error('Detailed error:', error.stack);
      } else if (typeof error === 'string') {
        errorMessage = `Failed to process invoice: ${error}`;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Failed to process invoice: ${(error as any).message}`;
      }
      
      showToast('error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!extractedData || !file) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Review Invoice Data</h1>
        <p className="mt-2 text-gray-600">
          Review and confirm the extracted data before processing the invoice.
        </p>
        
        {/* OCR Warning */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-amber-500">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">OCR Extraction Notice</h3>
              <p className="mt-1 text-sm text-amber-700">
                The data below was automatically extracted using AI. <strong>Please verify all product names, quantities, and prices</strong> are correct. 
                Click the "✏️ Fix" button next to any item to manually correct OCR errors.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Invoice Details */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Invoice Details</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
              <input
                type="text"
                value={extractedData.invoice.invoiceNumber || ''}
                onChange={(e) => handleInvoiceDataChange('invoiceNumber', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
              <input
                type="date"
                value={extractedData.invoice.invoiceDate || ''}
                onChange={(e) => handleInvoiceDataChange('invoiceDate', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Excl. VAT</label>
                <input
                  type="number"
                  step="0.01"
                  value={extractedData.invoice.totalExclVat || 0}
                  onChange={(e) => handleInvoiceDataChange('totalExclVat', parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Incl. VAT</label>
                <input
                  type="number"
                  step="0.01"
                  value={extractedData.invoice.totalInclVat || 0}
                  onChange={(e) => handleInvoiceDataChange('totalInclVat', parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Supplier</label>
              <div className="mt-1 flex space-x-2">
                <Select
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                  placeholder="Select supplier..."
                  className="flex-1"
                />
                {extractedData.supplierInfo && !selectedSupplierId && (
                  <button
                    onClick={handleCreateNewSupplier}
                    className="px-3 py-2 border border-green-300 text-green-700 rounded-md text-sm hover:bg-green-50"
                  >
                    Create "{extractedData.supplierInfo.name}"
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* File Preview */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Uploaded File</h2>
          </div>
          
          <div className="p-6">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {file.type.includes('pdf') ? '📄' : '📷'}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mt-8 bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Invoice Line Items</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match Product
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {extractedData.lineItems.map((lineItem, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={lineItem.productName}
                          onChange={(e) => handleLineItemChange(index, 'productName', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md text-sm"
                          placeholder="Product name (edit if OCR is wrong)"
                        />
                        <button
                          onClick={() => toggleEditing(index)}
                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                          title="Manual OCR correction"
                        >
                          ✏️ Fix
                        </button>
                      </div>
                      {lineItem.description && (
                        <p className="text-xs text-gray-500 mt-1">{lineItem.description}</p>
                      )}
                      {editingItems[index] && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs text-yellow-700 mb-2">💡 <strong>Manual Correction Mode:</strong> Edit the product name above if OCR extracted it incorrectly.</p>
                          <button
                            onClick={() => toggleEditing(index)}
                            className="text-xs text-yellow-600 hover:text-yellow-800"
                          >
                            Done editing
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        step="0.01"
                        value={lineItem.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="w-16 border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="text"
                        value={lineItem.unit}
                        onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                        className="w-12 border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      value={lineItem.unitPrice}
                      onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                      className="w-20 border-gray-300 rounded-md text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    €{(lineItem.totalPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {productMatches[index] && productMatches[index].length > 0 ? (
                      <Select
                        value={selectedMatches[index] || ''}
                        onChange={(value) => handleProductMatch(index, value)}
                        options={[
                          { value: '', label: 'Create new product' },
                          ...productMatches[index].map(match => ({
                            value: match.productId,
                            label: `${match.product.name} (${Math.round(match.confidence * 100)}%)`
                          }))
                        ]}
                        className="w-48"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">No matches - will create new</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={() => navigate('/invoices/upload')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Upload
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleApproveInvoice}
            disabled={isProcessing || !selectedSupplierId}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin inline-block mr-2">⟳</span>
                Processing...
              </>
            ) : (
              'Approve & Process Invoice'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
