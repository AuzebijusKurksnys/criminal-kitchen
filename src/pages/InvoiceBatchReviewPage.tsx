import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { listProducts, listSuppliers, createInvoice, createInvoiceLineItem, uploadInvoiceFile, updateInvoice, createSupplier, createProduct, createSupplierPrice, checkInvoiceExists } from '../data/store';
import type { InvoiceProcessingResult, Product, Supplier, InvoiceLineItem, Unit } from '../data/types';
import { generateId } from '../utils/id';

interface BatchReviewItem {
  file: File;
  result: InvoiceProcessingResult;
  invoiceIndex: number;
}

interface GroupedProduct {
  productName: string;
  normalizedName: string;
  unit: string;
  instances: {
    invoiceIndex: number;
    lineItemIndex: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate: number;
    originalData: Partial<InvoiceLineItem>;
  }[];
  suggestedProduct?: Product;
  selectedProductId?: string;
  action: 'match' | 'create' | 'skip';
  totalQuantity: number;
  avgPrice: number;
}

interface LocationState {
  batchResults: BatchReviewItem[];
}

export function InvoiceBatchReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { batchResults } = (location.state as LocationState) || {};

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'review' | 'processing' | 'complete'>('review');

  useEffect(() => {
    if (!batchResults || batchResults.length === 0) {
      navigate('/invoices/batch-upload');
      return;
    }

    loadData();
    groupProductsAcrossInvoices();
  }, [batchResults]);

  const loadData = async () => {
    try {
      const [productsData, suppliersData] = await Promise.all([
        listProducts(),
        listSuppliers()
      ]);
      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('error', 'Failed to load product and supplier data');
    }
  };

  const normalizeProductName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\b(kg|g|l|ml|pcs|piece|pc|vnt|pack|unit|units|mm|cm|m)\b/g, '')
      .replace(/\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const groupProductsAcrossInvoices = () => {
    const productGroups = new Map<string, GroupedProduct>();

    batchResults.forEach((batchItem, invoiceIndex) => {
      batchItem.result.lineItems.forEach((lineItem, lineItemIndex) => {
        if (!lineItem.productName) return;

        const normalizedName = normalizeProductName(lineItem.productName);
        const unit = lineItem.unit || 'pcs';
        const groupKey = `${normalizedName}_${unit.toLowerCase()}`;

        if (!productGroups.has(groupKey)) {
          // Find suggested product match
          const suggestedProduct = products.find(p => 
            normalizeProductName(p.name) === normalizedName ||
            p.name.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(p.name.toLowerCase())
          );

          productGroups.set(groupKey, {
            productName: lineItem.productName,
            normalizedName,
            unit,
            instances: [],
            suggestedProduct,
            selectedProductId: suggestedProduct?.id || '',
            action: suggestedProduct ? 'match' : 'create',
            totalQuantity: 0,
            avgPrice: 0
          });
        }

        const group = productGroups.get(groupKey)!;
        group.instances.push({
          invoiceIndex,
          lineItemIndex,
          quantity: lineItem.quantity || 0,
          unitPrice: lineItem.unitPrice || 0,
          totalPrice: lineItem.totalPrice || 0,
          vatRate: lineItem.vatRate || 21,
          originalData: lineItem
        });
      });
    });

    // Calculate totals and averages
    const grouped = Array.from(productGroups.values()).map(group => {
      const totalQuantity = group.instances.reduce((sum, inst) => sum + inst.quantity, 0);
      const totalValue = group.instances.reduce((sum, inst) => sum + (inst.unitPrice * inst.quantity), 0);
      const avgPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

      return {
        ...group,
        totalQuantity,
        avgPrice
      };
    });

    // Sort by total quantity (most used products first)
    grouped.sort((a, b) => b.totalQuantity - a.totalQuantity);
    setGroupedProducts(grouped);
  };

  const handleProductActionChange = (index: number, action: 'match' | 'create' | 'skip') => {
    setGroupedProducts(prev => prev.map((group, i) => 
      i === index ? { ...group, action } : group
    ));
  };

  const handleProductSelection = (index: number, productId: string) => {
    setGroupedProducts(prev => prev.map((group, i) => 
      i === index ? { ...group, selectedProductId: productId } : group
    ));
  };

  const handleBatchApproval = async () => {
    if (!selectedSupplierId) {
      showToast('error', 'Please select a supplier');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      let processedCount = 0;
      let errorCount = 0;

      // Process each invoice
      for (let i = 0; i < batchResults.length; i++) {
        const batchItem = batchResults[i];
        
        try {
          // Check if invoice already exists
          const existingInvoice = await checkInvoiceExists(selectedSupplierId, batchItem.result.invoice.invoiceNumber!);
          if (existingInvoice) {
            console.warn(`Invoice ${batchItem.result.invoice.invoiceNumber} already exists, skipping`);
            continue;
          }

          // Create invoice
          const invoiceId = generateId();
          const invoice = await createInvoice({
            ...batchItem.result.invoice,
            supplierId: selectedSupplierId,
            status: 'approved'
          } as any);

          // Upload file
          const filePath = await uploadInvoiceFile(batchItem.file, invoice.id);
          await updateInvoice(invoice.id, {
            filePath,
            fileName: batchItem.file.name,
            fileSize: batchItem.file.size,
            mimeType: batchItem.file.type
          });

          // Process line items using grouped product decisions
          for (let j = 0; j < batchItem.result.lineItems.length; j++) {
            const lineItem = batchItem.result.lineItems[j];
            if (!lineItem.productName) continue;

            const normalizedName = normalizeProductName(lineItem.productName);
            const unit = lineItem.unit || 'pcs';
            const matchingGroup = groupedProducts.find(group => 
              group.normalizedName === normalizedName && 
              group.unit.toLowerCase() === unit.toLowerCase()
            );

            if (!matchingGroup || matchingGroup.action === 'skip') continue;

            let productId = '';

            if (matchingGroup.action === 'match' && matchingGroup.selectedProductId) {
              productId = matchingGroup.selectedProductId;
            } else if (matchingGroup.action === 'create') {
              // Create new product (only once per group)
              if (!matchingGroup.selectedProductId) {
                const newProduct = await createProduct({
                  name: lineItem.productName,
                  sku: generateId(),
                  unit: unit as Unit,
                  category: 'Other',
                  notes: `Created from batch import - ${lineItem.productName}`,
                  quantity: 0
                });
                matchingGroup.selectedProductId = newProduct.id;
              }
              productId = matchingGroup.selectedProductId;
            }

            if (productId) {
              // Create invoice line item
              await createInvoiceLineItem({
                invoiceId: invoice.id,
                productId,
                productName: lineItem.productName,
                quantity: lineItem.quantity || 0,
                unit: unit,
                unitPrice: lineItem.unitPrice || 0,
                totalPrice: lineItem.totalPrice || 0,
                vatRate: lineItem.vatRate || 21,
                needsReview: false
              });

              // Create supplier price
              try {
                const unitPrice = lineItem.unitPrice || 0;
                const vatRate = lineItem.vatRate || 21;
                await createSupplierPrice({
                  productId,
                  supplierId: selectedSupplierId,
                  price: unitPrice,
                  priceExclVat: unitPrice,
                  priceInclVat: unitPrice * (1 + vatRate / 100),
                  vatRate,
                  currency: 'EUR',
                  invoiceId: invoice.id
                });
              } catch (error) {
                console.warn('Failed to create supplier price:', error);
              }
            }
          }

          processedCount++;
        } catch (error) {
          console.error(`Error processing invoice ${i + 1}:`, error);
          errorCount++;
        }
      }

      setCurrentStep('complete');
      
      if (processedCount > 0) {
        showToast('success', `Successfully processed ${processedCount} invoices${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setTimeout(() => navigate('/invoices'), 2000);
      } else {
        showToast('error', 'No invoices were processed successfully');
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      showToast('error', 'Failed to process batch invoices');
      setCurrentStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!batchResults || batchResults.length === 0) {
    return <div>Loading...</div>;
  }

  if (currentStep === 'complete') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Batch Processing Complete!</h1>
        <p className="text-lg text-gray-600 mb-8">All invoices have been processed and added to your system.</p>
        <button
          onClick={() => navigate('/invoices')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Batch Invoice Review</h1>
        <p className="mt-2 text-lg text-gray-600">
          Review and approve {batchResults.length} processed invoices with {groupedProducts.length} unique products
        </p>
      </div>

      {/* Supplier Selection */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select Supplier</h2>
        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose supplier for all invoices...</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grouped Products Review */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          Product Groups ({groupedProducts.length} unique products)
        </h2>
        
        <div className="space-y-6">
          {groupedProducts.map((group, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{group.productName}</h3>
                  <p className="text-sm text-gray-500">
                    Appears in {group.instances.length} invoice{group.instances.length !== 1 ? 's' : ''} • 
                    Total: {group.totalQuantity.toFixed(2)} {group.unit} • 
                    Avg Price: €{group.avgPrice.toFixed(2)}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <select
                    value={group.action}
                    onChange={(e) => handleProductActionChange(index, e.target.value as any)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="match">Match Existing</option>
                    <option value="create">Create New</option>
                    <option value="skip">Skip</option>
                  </select>
                </div>
              </div>

              {group.action === 'match' && (
                <div className="mb-4">
                  <select
                    value={group.selectedProductId}
                    onChange={(e) => handleProductSelection(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select existing product...</option>
                    {products
                      .filter(p => p.unit.toLowerCase() === group.unit.toLowerCase())
                      .map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                  </select>
                  {group.suggestedProduct && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Suggested: {group.suggestedProduct.name}
                    </p>
                  )}
                </div>
              )}

              {group.action === 'create' && (
                <div className="mb-4 p-3 bg-green-50 rounded">
                  <p className="text-sm text-green-800">
                    ➕ Will create new product: "{group.productName}" ({group.unit})
                  </p>
                </div>
              )}

              {group.action === 'skip' && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">
                    ⏭️ Will skip this product in all invoices
                  </p>
                </div>
              )}

              {/* Instance Details */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Instances:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {group.instances.map((instance, instIndex) => (
                    <div key={instIndex} className="text-xs bg-gray-50 p-2 rounded">
                      <span className="font-medium">Invoice {instance.invoiceIndex + 1}</span> • 
                      {instance.quantity} {group.unit} @ €{instance.unitPrice.toFixed(2)} = €{instance.totalPrice.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/invoices/batch-upload')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          ← Back to Upload
        </button>
        
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleBatchApproval}
            disabled={!selectedSupplierId || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin inline-block mr-2">⟳</span>
                Processing {batchResults.length} Invoices...
              </>
            ) : (
              `Approve All ${batchResults.length} Invoices`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
