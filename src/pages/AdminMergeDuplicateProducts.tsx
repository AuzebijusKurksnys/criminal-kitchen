import { useState, useEffect } from 'react';
import { listProducts, updateProduct, deleteProduct, createSupplierPrice, listSupplierPrices, deleteSupplierPrice } from '../data/store';
import { Product, SupplierPrice } from '../data/types';
import { normalizeProductName } from '../services/invoiceParser';
import { showToast } from '../components/Toast';

interface DuplicateGroup {
  normalizedName: string;
  products: Product[];
  recommended: Product;
}

export function AdminMergeDuplicateProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await listProducts();
      setProducts(productsData);
      findDuplicates(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast('error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const findDuplicates = (productsData: Product[]) => {
    const groups = new Map<string, Product[]>();
    
    // Group products by normalized name
    productsData.forEach(product => {
      const normalizedName = normalizeProductName(product.name);
      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      groups.get(normalizedName)!.push(product);
    });

    // Find groups with duplicates
    const duplicates: DuplicateGroup[] = [];
    groups.forEach((products, normalizedName) => {
      if (products.length > 1) {
        // Find the product with the highest quantity or most recent creation date
        const recommended = products.reduce((best, current) => {
          if (current.quantity > best.quantity) return current;
          if (current.quantity === best.quantity && current.createdAt > best.createdAt) return current;
          return best;
        });
        
        duplicates.push({
          normalizedName,
          products,
          recommended
        });
      }
    });

    setDuplicateGroups(duplicates);
  };

  const mergeDuplicates = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    
    try {
      const { recommended, products } = group;
      const productsToMerge = products.filter(p => p.id !== recommended.id);
      
      // Calculate total quantity
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      
      // Get all supplier prices for products to be merged
      const allSupplierPrices: SupplierPrice[] = [];
      for (const product of products) {
        const supplierPrices = await listSupplierPrices();
        const productPrices = supplierPrices.filter(sp => sp.productId === product.id);
        allSupplierPrices.push(...productPrices);
      }

      // Update the recommended product with total quantity
      await updateProduct(recommended.id, {
        ...recommended,
        quantity: totalQuantity,
        updatedAt: new Date().toISOString()
      });

      // Merge supplier prices (keep unique supplier-product combinations)
      const mergedPrices = new Map<string, SupplierPrice>();
      allSupplierPrices.forEach(price => {
        const key = `${price.supplierId}-${recommended.id}`;
        if (!mergedPrices.has(key)) {
          // Update the productId to point to the recommended product
          mergedPrices.set(key, {
            ...price,
            productId: recommended.id
          });
        }
      });

      // Delete old supplier prices and create new ones
      for (const price of allSupplierPrices) {
        await deleteSupplierPrice(price.id);
      }
      for (const price of mergedPrices.values()) {
        await createSupplierPrice({
          productId: price.productId,
          supplierId: price.supplierId,
          price: price.price,
          unit: price.unit,
          preferred: price.preferred,
          notes: price.notes
        });
      }

      // Delete the duplicate products
      for (const product of productsToMerge) {
        await deleteProduct(product.id);
      }

      showToast('success', `Merged ${products.length} products into "${recommended.name}"`);
      
      // Reload data
      await loadProducts();
      
    } catch (error) {
      console.error('Error merging duplicates:', error);
      showToast('error', 'Failed to merge duplicate products');
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeAllDuplicates = async () => {
    setIsProcessing(true);
    
    try {
      for (const group of duplicateGroups) {
        await mergeDuplicates(group);
      }
      
      showToast('success', `Merged ${duplicateGroups.length} duplicate groups`);
      setDuplicateGroups([]);
      
    } catch (error) {
      console.error('Error merging all duplicates:', error);
      showToast('error', 'Failed to merge all duplicate products');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Merge Duplicate Products</h1>
          <p className="mt-2 text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Merge Duplicate Products</h1>
        <p className="mt-2 text-gray-400">
          Found {duplicateGroups.length} groups of duplicate products
        </p>
      </div>

      {duplicateGroups.length > 0 && (
        <div className="mb-6">
          <button
            onClick={mergeAllDuplicates}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Merging...' : `Merge All ${duplicateGroups.length} Groups`}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {duplicateGroups.map((group, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">
                  {group.normalizedName}
                </h3>
                <p className="text-gray-400">
                  {group.products.length} duplicate products found
                </p>
              </div>
              <button
                onClick={() => mergeDuplicates(group)}
                disabled={isProcessing}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Merge
              </button>
            </div>

            <div className="space-y-3">
              {group.products.map((product, productIndex) => (
                <div
                  key={product.id}
                  className={`p-3 rounded border ${
                    product.id === group.recommended.id
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-gray-600 bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">
                        {product.name}
                        {product.id === group.recommended.id && (
                          <span className="ml-2 text-green-400 text-sm">(Recommended)</span>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Quantity: {product.quantity} {product.unit} | Created: {new Date(product.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">ID: {product.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {duplicateGroups.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No duplicate products found!</div>
          <p className="text-gray-500 mt-2">All products have unique names.</p>
        </div>
      )}
    </div>
  );
}
