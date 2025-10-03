import { useState, useMemo, useEffect } from 'react';
import type { Product, SupplierPrice, Supplier } from '../data/types';
import { Table, type TableColumn } from '../components/Table';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatQuantity } from '../utils/format';
import { UNITS } from '../data/constants';
import { listSuppliers, listSupplierPrices } from '../data/store';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

type ViewMode = 'list' | 'supplier-groups';

interface ProductWithSupplier extends Product {
  supplierName?: string;
  supplierId?: string;
}

export function ProductList({ products, onEdit, onDelete, loading = false }: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState('');
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  // Load suppliers and prices for grouping
  useEffect(() => {
    const loadSuppliersAndPrices = async () => {
      const [suppliersData, pricesData] = await Promise.all([
        listSuppliers(),
        listSupplierPrices()
      ]);
      setSuppliers(suppliersData);
      setSupplierPrices(pricesData);
      // Expand all suppliers by default (including unassigned)
      setExpandedSuppliers(new Set([...suppliersData.map(s => s.id), 'unassigned']));
    };
    loadSuppliersAndPrices();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesUnit = unitFilter === '' || product.unit === unitFilter;
      
      const matchesCategory = categoryFilter === '' || 
        (categoryFilter === 'uncategorized' && !product.category) ||
        product.category === categoryFilter;
      
      const matchesStockLevel = stockLevelFilter === '' || (() => {
        switch (stockLevelFilter) {
          case 'low':
            return product.minStock && product.quantity <= product.minStock;
          case 'zero':
            return product.quantity === 0;
          case 'in-stock':
            return product.quantity > 0;
          case 'overstocked':
            return product.minStock && product.quantity > (product.minStock * 2);
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesUnit && matchesCategory && matchesStockLevel;
    });
  }, [products, searchQuery, unitFilter, categoryFilter, stockLevelFilter]);

  // Group products by supplier
  const productsBySupplier = useMemo(() => {
    const grouped: Record<string, ProductWithSupplier[]> = {};
    const unassigned: ProductWithSupplier[] = [];

    filteredProducts.forEach(product => {
      // Find preferred supplier for this product
      const preferredPrice = supplierPrices.find(
        sp => sp.productId === product.id && sp.preferred
      );
      
      if (preferredPrice) {
        const supplier = suppliers.find(s => s.id === preferredPrice.supplierId);
        if (supplier) {
          if (!grouped[supplier.id]) {
            grouped[supplier.id] = [];
          }
          grouped[supplier.id].push({
            ...product,
            supplierName: supplier.name,
            supplierId: supplier.id
          });
        } else {
          unassigned.push(product);
        }
      } else {
        unassigned.push(product);
      }
    });

    return { grouped, unassigned };
  }, [filteredProducts, supplierPrices, suppliers]);

  const toggleSupplier = (supplierId: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId);
    } else {
      newExpanded.add(supplierId);
    }
    setExpandedSuppliers(newExpanded);
  };

  const toggleAllSuppliers = () => {
    if (expandedSuppliers.size > 0) {
      setExpandedSuppliers(new Set());
    } else {
      setExpandedSuppliers(new Set(suppliers.map(s => s.id)));
    }
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteProduct(product);
  };

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      onDelete(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    const filteredProductIds = filteredProducts.map(p => p.id);
    if (selectedProducts.size === filteredProductIds.length && 
        filteredProductIds.every(id => selectedProducts.has(id))) {
      // All visible products are selected, so deselect all
      setSelectedProducts(new Set());
    } else {
      // Select all visible products
      setSelectedProducts(new Set(filteredProductIds));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.size === 0) return;
    
    const selectedProductsArray = filteredProducts.filter(p => selectedProducts.has(p.id));
    const confirmMessage = selectedProducts.size === 1 
      ? `Are you sure you want to delete "${selectedProductsArray[0].name}"?`
      : `Are you sure you want to delete ${selectedProducts.size} selected products?`;
    
    if (window.confirm(confirmMessage + ' This action cannot be undone and will also delete all related supplier prices.')) {
      selectedProducts.forEach(productId => onDelete(productId));
      setSelectedProducts(new Set());
    }
  };

  const isAllSelected = filteredProducts.length > 0 && 
    filteredProducts.every(product => selectedProducts.has(product.id));
  const isPartiallySelected = selectedProducts.size > 0 && !isAllSelected;

  const getStockStatus = (product: Product) => {
    if (!product.minStock) return 'normal';
    return product.quantity <= product.minStock ? 'low' : 'normal';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'text-red-400 bg-red-50 border-red-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const unitOptions = [
    { value: '', label: 'All Units' },
    ...UNITS.map(unit => ({ value: unit, label: unit.toUpperCase() }))
  ];

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return [
      { value: '', label: 'All Categories' },
      { value: 'uncategorized', label: 'Uncategorized' },
      ...categories.map(cat => ({ value: cat!, label: cat! }))
    ];
  }, [products]);

  const stockLevelOptions = [
    { value: '', label: 'All Stock Levels' },
    { value: 'zero', label: 'Out of Stock (0)' },
    { value: 'low', label: 'Low Stock (≤ Min)' },
    { value: 'in-stock', label: 'In Stock (> 0)' },
    { value: 'overstocked', label: 'Overstocked (> 2x Min)' }
  ];

  const columns: TableColumn<Product>[] = [
    {
      key: 'select',
      label: (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={input => {
              if (input) input.indeterminate = isPartiallySelected;
            }}
            onChange={handleSelectAll}
            className="h-4 w-4 text-blue-400 focus:ring-blue-500 border-gray-700 rounded"
          />
        </div>
      ),
      render: (_value: any, product: Product) => (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedProducts.has(product.id)}
            onChange={() => handleSelectProduct(product.id)}
            className="h-4 w-4 text-blue-400 focus:ring-blue-500 border-gray-700 rounded"
          />
        </div>
      ),
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, _product) => (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{value}</span>
          {/* Add preferred supplier indicator - placeholder for now */}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
            📋 Supplier Set
          </span>
        </div>
      ),
    },
    {
      key: 'unit',
      label: 'Unit',
      sortable: true,
      render: (value) => (
        <span className="text-sm uppercase font-medium text-gray-600">{value}</span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      render: (value, product) => (
        <div className="flex flex-col">
          <span className="font-medium">{formatQuantity(value, product.unit)}</span>
          {product.minStock && (
            <span className="text-xs text-gray-400">
              Min: {formatQuantity(product.minStock, product.unit)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (value) => (
        value ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-800">
            {value}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'stock_status',
      label: 'Stock Status',
      render: (_, product) => {
        const status = getStockStatus(product);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStockStatusColor(status)}`}>
            {status === 'low' ? 'Low Stock' : 'OK'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, product) => (
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(product)}
            className="text-blue-400 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(product)}
            className="text-red-400 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Search
              </label>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Name, SKU, category..."
                className="w-full"
              />
            </div>

            {/* Unit Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Unit
              </label>
              <Select
                value={unitFilter}
                onChange={setUnitFilter}
                options={unitOptions}
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Category
              </label>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                className="w-full"
              />
            </div>

            {/* Stock Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Stock Level
              </label>
              <Select
                value={stockLevelFilter}
                onChange={setStockLevelFilter}
                options={stockLevelOptions}
                className="w-full"
              />
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredProducts.length} of {products.length} products
            </span>
            {(searchQuery || unitFilter || categoryFilter || stockLevelFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setUnitFilter('');
                  setCategoryFilter('');
                  setStockLevelFilter('');
                }}
                className="text-blue-400 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {(searchQuery || unitFilter || categoryFilter || stockLevelFilter) ? (
                <>Showing {filteredProducts.length} of {products.length} products</>
              ) : (
                <>{products.length} products total</>
              )}
              {selectedProducts.size > 0 && (
                <span className="ml-2 text-blue-400 font-medium">
                  ({selectedProducts.size} selected)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedProducts.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                🗑️ Delete Selected ({selectedProducts.size})
              </button>
            )}
            
            <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📋 List View
              </button>
              <button
                onClick={() => setViewMode('supplier-groups')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'supplier-groups'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📁 Group by Supplier
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <Table
            data={filteredProducts}
            columns={columns}
            keyExtractor={(product) => product.id}
            loading={loading}
            emptyMessage={
              searchQuery || unitFilter 
                ? 'No products match your search criteria'
                : 'No products found. Create your first product to get started.'
            }
          />
        )}

        {/* Supplier Groups View */}
        {viewMode === 'supplier-groups' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={toggleAllSuppliers}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {expandedSuppliers.size > 0 ? '📂 Collapse All' : '📁 Expand All'}
              </button>
            </div>

            {suppliers.map(supplier => {
              const supplierProducts = productsBySupplier.grouped[supplier.id] || [];
              if (supplierProducts.length === 0) return null;
              
              const isExpanded = expandedSuppliers.has(supplier.id);
              
              return (
                <div key={supplier.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSupplier(supplier.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{isExpanded ? '📂' : '📁'}</span>
                      <div className="text-left">
                        <h3 className="text-lg font-medium text-gray-100">{supplier.name}</h3>
                        <p className="text-sm text-gray-400">{supplierProducts.length} products</p>
                      </div>
                    </div>
                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-800">
                      <Table
                        data={supplierProducts}
                        columns={columns}
                        keyExtractor={(product) => product.id}
                        emptyMessage="No products for this supplier"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {productsBySupplier.unassigned.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSupplier('unassigned')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{expandedSuppliers.has('unassigned') ? '📂' : '📁'}</span>
                    <div className="text-left">
                      <h3 className="text-lg font-medium text-gray-400">No Preferred Supplier</h3>
                      <p className="text-sm text-gray-500">{productsBySupplier.unassigned.length} products</p>
                    </div>
                  </div>
                  <span className="text-gray-400">{expandedSuppliers.has('unassigned') ? '▼' : '▶'}</span>
                </button>
                
                {expandedSuppliers.has('unassigned') && (
                  <div className="border-t border-gray-800">
                    <Table
                      data={productsBySupplier.unassigned}
                      columns={columns}
                      keyExtractor={(product) => product.id}
                      emptyMessage="No unassigned products"
                    />
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="text-center py-8 text-gray-400">
                Loading suppliers...
              </div>
            )}

            {!loading && suppliers.length === 0 && productsBySupplier.unassigned.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No products found. Create your first product to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteProduct !== null}
        onCancel={() => setDeleteProduct(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteProduct?.name}"? This action cannot be undone and will also delete all related supplier prices.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
