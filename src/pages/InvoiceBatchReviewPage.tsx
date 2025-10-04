import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { listProducts, listSuppliers, createInvoice, createInvoiceLineItem, uploadInvoiceFile, updateInvoice, createSupplier, createProduct, createSupplierPrice, checkInvoiceExists } from '../data/store';
import type { InvoiceProcessingResult, Product, Supplier, InvoiceLineItem, Unit } from '../data/types';
import { generateId } from '../utils/id';
import { findMatchingSupplier, cleanSupplierName } from '../utils/supplierNameUtils';

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
      navigate('/invoices/upload');
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

      // Auto-select supplier if all invoices have the same supplier
      if (batchResults && batchResults.length > 0) {
        const supplierNames = batchResults
          .map(item => item.result.supplierInfo?.name)
          .filter((name): name is string => Boolean(name))
          .map(name => cleanSupplierName(name))
          .filter((name): name is string => Boolean(name));
        
        if (supplierNames.length > 0) {
          // Find the most common supplier name
          const supplierCounts = supplierNames.reduce((acc, name) => {
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const mostCommonSupplier = Object.entries(supplierCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0];
          
          if (mostCommonSupplier) {
            console.log('🔍 Batch supplier matching:', {
              supplierNames,
              mostCommonSupplier,
              availableSuppliers: suppliersData.map(s => s.name)
            });
            
            const matchingSupplier = findMatchingSupplier(mostCommonSupplier, suppliersData);
            if (matchingSupplier) {
              setSelectedSupplierId(matchingSupplier.id);
              console.log('✅ Auto-selected batch supplier:', matchingSupplier.name);
            } else {
              console.log('❌ No matching supplier found for batch:', mostCommonSupplier);
            }
          }
        }
      }
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
    
    // More aggressive normalization for better grouping
    return cleaned
      .toLowerCase()
      // Normalize Lithuanian abbreviations and variations
      .replace(/\bšakelėm(is)?\b/g, 'sak')
      .replace(/\bšak\b\.?/g, 'sak')
      .replace(/\bbandel(ėmis|es|ės)?\b/g, 'bandel')
      .replace(/\bsūr(is|ių)?\b/g, 'sur')
      .replace(/\bsalotos\b/g, 'salotos')
      .replace(/\biceberg\b/g, 'iceberg')
      .replace(/\bmėsainių\b/g, 'mesainiu')
      .replace(/\bmes\.bandel(ės|es)?\b/g, 'mesbandel')
      .replace(/\bvišč(iukų)?\b/g, 'visciuku') // višč/viščiukų -> visciuku
      .replace(/\bkrūtinėlių\s*filė\b/g, 'file') // krūtinėlių filė -> file
      .replace(/\bbroilerių\b/g, 'broileriu')
      // Remove units
      .replace(/\b(kg|g|l|ml|pcs|piece|pc|vnt|pack|unit|units|pack|packet|box|bottle|can|šaldyta|šaldytos|atšaldyta)\b/g, '')
      // Remove quantity+unit patterns
      .replace(/\b\d+x\d+[.,]?\d*\s*(kg|g|l|ml|pcs|piece|pc|vnt)\b/g, '')
      .replace(/\b\d+\s*(kg|g|l|ml|pcs|piece|pc|vnt|pack|unit|units|pack|packet|box|bottle|can)\b/g, '')
      .replace(/\b\d+(\.\d+)?\s*%?\b/g, '') // Remove standalone numbers
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
    console.log('🔍 Starting product grouping for batch results:', batchResults.length);
    
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
      console.log(`📄 Invoice ${invoiceIndex + 1}: ${batchItem.result.lineItems?.length || 0} line items`);
      
      if (!batchItem.result.lineItems || batchItem.result.lineItems.length === 0) {
        console.warn(`⚠️ Invoice ${invoiceIndex + 1} has no line items!`);
        return;
      }
      
      batchItem.result.lineItems.forEach((lineItem, lineItemIndex) => {
        if (!lineItem.productName) {
          console.warn(`⚠️ Line item ${lineItemIndex} in invoice ${invoiceIndex + 1} has no product name`);
          return;
        }

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
    
    console.log(`✅ Collected ${allItems.length} total line items from all invoices`);

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

              // Create supplier price with preferred=true for new products
              try {
                const unitPrice = lineItem.unitPrice || 0;
                const vatRate = lineItem.vatRate || 21;
                
                // Check if this product already has a preferred supplier
                const existingProduct = products.find(p => p.id === productId);
                const hasPreferredSupplier = existingProduct ? false : false; // New products never have preferred supplier yet
                
                await createSupplierPrice({
                  productId,
                  supplierId: selectedSupplierId,
                  price: unitPrice,
                  priceExclVat: unitPrice,
                  priceInclVat: unitPrice * (1 + vatRate / 100),
                  vatRate,
                  currency: 'EUR',
                  preferred: matchingGroup.action === 'create' ? true : hasPreferredSupplier, // Set preferred for new products
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
        <h1 className="text-3xl font-bold text-gray-100 mb-4">Batch Processing Complete!</h1>
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
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Batch Invoice Review</h1>
          <p className="mt-2 text-lg text-gray-400">
            {batchResults.length} invoices • {groupedProducts.length} unique products
          </p>
        </div>

        {/* Supplier Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-3">Supplier</label>
          <div className="flex gap-3">
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select supplier...</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {batchResults && batchResults.length > 0 && !selectedSupplierId && (
              <button
                onClick={async () => {
                  // Get supplier name from first batch result, with fallback
                  const supplierName = batchResults[0].result.supplierInfo?.name || 'MB Viską gali';
                  console.log('🔍 Creating supplier with name:', supplierName);
                  
                  try {
                    const newSupplier = await createSupplier({
                      name: supplierName,
                      email: batchResults[0].result.supplierInfo?.email || undefined,
                      phone: batchResults[0].result.supplierInfo?.phone || undefined
                    });

                    setSuppliers([...suppliers, newSupplier]);
                    setSelectedSupplierId(newSupplier.id);
                    showToast('success', `Created supplier: ${newSupplier.name}`);
                  } catch (error) {
                    console.error('Error creating supplier:', error);
                    showToast('error', 'Failed to create supplier');
                  }
                }}
                className="px-4 py-3 border border-green-500 text-green-400 rounded-lg text-sm hover:bg-green-900/20 bg-green-900/10 whitespace-nowrap"
              >
                Create "{cleanSupplierName(batchResults[0].result.supplierInfo?.name || 'MB Viską gali')}"
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Products ({groupedProducts.length})
            </h2>
          </div>
        
        {groupedProducts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl font-medium text-gray-300 mb-2">No products found</p>
            <p className="text-gray-400 text-sm">
              Try re-processing the invoices
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-750 border-b border-gray-700 text-sm font-medium text-gray-400">
              <div className="col-span-4">Product</div>
              <div className="col-span-2 text-center">Total Qty</div>
              <div className="col-span-2 text-center">Avg Price</div>
              <div className="col-span-1 text-center">Invoices</div>
              <div className="col-span-3 text-right">Action</div>
            </div>

            {/* Table Rows */}
            {groupedProducts.map((group, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-700 hover:bg-gray-750 transition-colors">
                {/* Product Name */}
                <div className="col-span-4">
                  <div className="text-white font-medium">{group.productName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-200">
                      {group.unit}
                    </span>
                    {group.variationCount > 1 && (
                      <span className="text-xs text-yellow-400">
                        {group.variationCount} variations
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Quantity */}
                <div className="col-span-2 text-center text-white">
                  {group.totalQuantity.toFixed(1)} {group.unit}
                </div>

                {/* Avg Price */}
                <div className="col-span-2 text-center text-white">
                  €{group.avgPrice.toFixed(2)}
                </div>

                {/* Invoices Count */}
                <div className="col-span-1 text-center text-gray-400">
                  {group.instances.length}
                </div>

                {/* Action Dropdown */}
                <div className="col-span-3 flex justify-end">
                  <select
                    value={group.action}
                    onChange={(e) => handleProductActionChange(index, e.target.value as any)}
                    className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="match">🔗 Match Existing</option>
                    <option value="create">➕ Create New</option>
                    <option value="skip">⏭️ Skip</option>
                  </select>
                </div>
              </div>
            ))}

          </div>
        )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => navigate('/invoices/upload')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors"
          >
            ← Back
          </button>
          
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/invoices')}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleBatchApproval}
              disabled={!selectedSupplierId || isProcessing || groupedProducts.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin inline-block mr-2">⟳</span>
                  Processing...
                </>
              ) : (
                `Approve ${batchResults.length} Invoices`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
