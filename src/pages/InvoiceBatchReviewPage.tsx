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
  productName: string; // Best/cleanest name from the group
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
    originalName: string; // Original OCR text
    cleanedName: string; // Cleaned version
  }[];
  suggestedProduct?: Product;
  selectedProductId?: string;
  action: 'match' | 'create' | 'skip';
  totalQuantity: number;
  avgPrice: number;
  variationCount: number; // Number of different name variations
  allVariations: string[]; // All unique name variations
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

  const cleanProductName = (name: string): string => {
    // Basic cleanup while preserving meaningful content
    return name
      .trim()
      .replace(/[^\p{L}\p{N}\s\-&]/gu, ' ') // Keep letters, numbers, spaces, hyphens, ampersands
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizeProductName = (name: string): string => {
    const cleaned = cleanProductName(name);
    
    // More conservative normalization for grouping
    return cleaned
      .toLowerCase()
      .replace(/\b(kg|g|l|ml|pcs|piece|pc|vnt|pack|unit|units|pack|packet|box|bottle|can)\b/g, '') // Remove units
      .replace(/\b\d+\s*(kg|g|l|ml|pcs|piece|pc|vnt|pack|unit|units|pack|packet|box|bottle|can)\b/g, '') // Remove quantity+unit
      .replace(/\b\d+(\.\d+)?\s*%?\b/g, '') // Remove standalone numbers and percentages
      .replace(/\s+/g, ' ')
      .trim();
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const groupProductsAcrossInvoices = () => {
    // First pass: collect all line items with cleaned names
    const allItems: Array<{
      originalName: string;
      cleanedName: string;
      normalizedName: string;
      unit: string;
      invoiceIndex: number;
      lineItemIndex: number;
      lineItem: Partial<InvoiceLineItem>;
    }> = [];

    batchResults.forEach((batchItem, invoiceIndex) => {
      batchItem.result.lineItems.forEach((lineItem, lineItemIndex) => {
        if (!lineItem.productName) return;

        const cleanedName = cleanProductName(lineItem.productName);
        const normalizedName = normalizeProductName(lineItem.productName);
        const unit = (lineItem.unit || 'pcs').toLowerCase();

        allItems.push({
          originalName: lineItem.productName,
          cleanedName,
          normalizedName,
          unit,
          invoiceIndex,
          lineItemIndex,
          lineItem
        });
      });
    });

    // Second pass: smart grouping with similarity matching
    const productGroups = new Map<string, GroupedProduct>();
    const SIMILARITY_THRESHOLD = 0.7;

    allItems.forEach(item => {
      let bestGroupKey: string | null = null;
      let bestSimilarity = 0;

      // Try to find an existing group that's similar enough
      for (const [groupKey, group] of productGroups) {
        if (group.unit.toLowerCase() !== item.unit) continue;

        const similarity = calculateSimilarity(group.normalizedName, item.normalizedName);
        if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestGroupKey = groupKey;
        }
      }

      // Use existing group or create new one
      let groupKey = bestGroupKey;
      if (!groupKey) {
        groupKey = `${item.normalizedName}_${item.unit}_${productGroups.size}`;
        
        // Find suggested product match
        const suggestedProduct = products.find(p => {
          const productNormalized = normalizeProductName(p.name);
          const similarity = calculateSimilarity(productNormalized, item.normalizedName);
          return similarity >= 0.6 && p.unit.toLowerCase() === item.unit;
        });

        productGroups.set(groupKey, {
          productName: item.cleanedName, // Use cleaned name as display name
          normalizedName: item.normalizedName,
          unit: item.unit,
          instances: [],
          suggestedProduct,
          selectedProductId: suggestedProduct?.id || '',
          action: suggestedProduct ? 'match' : 'create',
          totalQuantity: 0,
          avgPrice: 0,
          variationCount: 0,
          allVariations: []
        });
      }

      const group = productGroups.get(groupKey)!;
      
      // Add to instances
      group.instances.push({
        invoiceIndex: item.invoiceIndex,
        lineItemIndex: item.lineItemIndex,
        quantity: item.lineItem.quantity || 0,
        unitPrice: item.lineItem.unitPrice || 0,
        totalPrice: item.lineItem.totalPrice || 0,
        vatRate: item.lineItem.vatRate || 21,
        originalData: item.lineItem,
        originalName: item.originalName,
        cleanedName: item.cleanedName
      });

      // Update best display name (shortest clean name usually best)
      if (item.cleanedName.length < group.productName.length && item.cleanedName.length > 2) {
        group.productName = item.cleanedName;
      }
    });

    // Third pass: calculate stats and clean up variations
    const grouped = Array.from(productGroups.values()).map(group => {
      const totalQuantity = group.instances.reduce((sum, inst) => sum + inst.quantity, 0);
      const totalValue = group.instances.reduce((sum, inst) => sum + (inst.unitPrice * inst.quantity), 0);
      const avgPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

      // Get unique variations
      const variations = [...new Set(group.instances.map(inst => inst.cleanedName))]
        .filter(name => name.length > 2)
        .sort((a, b) => a.length - b.length); // Shortest first

      return {
        ...group,
        totalQuantity,
        avgPrice,
        variationCount: variations.length,
        allVariations: variations,
        productName: variations[0] || group.productName // Use shortest variation as display name
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
        
        <div className="space-y-4">
          {groupedProducts.map((group, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{group.productName}</h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.unit}
                      </span>
                      {group.variationCount > 1 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {group.variationCount} variations
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-6 text-sm text-gray-600">
                      <span>📊 Total: <strong>{group.totalQuantity.toFixed(1)} {group.unit}</strong></span>
                      <span>💰 Avg Price: <strong>€{group.avgPrice.toFixed(2)}</strong></span>
                      <span>📋 {group.instances.length} invoice{group.instances.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <select
                      value={group.action}
                      onChange={(e) => handleProductActionChange(index, e.target.value as any)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="match">🔗 Match Existing</option>
                      <option value="create">➕ Create New</option>
                      <option value="skip">⏭️ Skip</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Variations Display */}
                {group.variationCount > 1 && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">📝 Name Variations Found:</h5>
                    <div className="flex flex-wrap gap-2">
                      {group.allVariations.slice(0, 5).map((variation, vIndex) => (
                        <span key={vIndex} className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">
                          {variation}
                        </span>
                      ))}
                      {group.allVariations.length > 5 && (
                        <span className="text-xs text-yellow-600">+{group.allVariations.length - 5} more</span>
                      )}
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      ℹ️ These appear to be the same product with OCR variations. Using shortest clean name: "<strong>{group.productName}</strong>"
                    </p>
                  </div>
                )}

                {/* Action-specific content */}
                {group.action === 'match' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select existing product to match:
                    </label>
                    <select
                      value={group.selectedProductId}
                      onChange={(e) => handleProductSelection(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose from your existing products...</option>
                      {products
                        .filter(p => p.unit.toLowerCase() === group.unit.toLowerCase())
                        .sort((a, b) => {
                          // Sort by similarity to current product name
                          const simA = calculateSimilarity(normalizeProductName(a.name), group.normalizedName);
                          const simB = calculateSimilarity(normalizeProductName(b.name), group.normalizedName);
                          return simB - simA;
                        })
                        .map(product => {
                          const similarity = calculateSimilarity(normalizeProductName(product.name), group.normalizedName);
                          return (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku}) {similarity > 0.6 ? `✨ ${Math.round(similarity * 100)}% match` : ''}
                            </option>
                          );
                        })}
                    </select>
                    {group.suggestedProduct && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="text-blue-700">💡 <strong>AI Suggestion:</strong> {group.suggestedProduct.name}</span>
                        <button
                          onClick={() => handleProductSelection(index, group.suggestedProduct!.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                        >
                          Use this
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {group.action === 'create' && (
                  <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 text-lg">➕</span>
                      <div>
                        <p className="text-sm font-medium text-green-800">Will create new product:</p>
                        <p className="text-green-700 font-medium">"{group.productName}" ({group.unit})</p>
                        <p className="text-xs text-green-600 mt-1">
                          SKU will be auto-generated • Category: Other • Can be edited later
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {group.action === 'skip' && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-500 text-lg">⏭️</span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Will skip this product</p>
                        <p className="text-xs text-gray-600 mt-1">
                          This product will be ignored in all {group.instances.length} invoice{group.instances.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compact Instance Summary */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
                      <span>📋 View {group.instances.length} invoice occurrence{group.instances.length !== 1 ? 's' : ''}</span>
                      <svg className="ml-2 h-4 w-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {group.instances.map((instance, instIndex) => (
                        <div key={instIndex} className="text-xs bg-gray-50 p-2 rounded border">
                          <div className="font-medium text-gray-900">Invoice #{instance.invoiceIndex + 1}</div>
                          <div className="text-gray-600">
                            {instance.quantity} {group.unit} × €{instance.unitPrice.toFixed(2)} = €{instance.totalPrice.toFixed(2)}
                          </div>
                          {instance.cleanedName !== group.productName && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              Originally: "{instance.originalName.length > 30 ? instance.originalName.substring(0, 30) + '...' : instance.originalName}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
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
