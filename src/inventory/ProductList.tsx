import { useState, useMemo } from 'react';
import type { Product } from '../data/types';
import { Table, type TableColumn } from '../components/Table';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatQuantity } from '../utils/format';
import { UNITS } from '../data/constants';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function ProductList({ products, onEdit, onDelete, loading = false }: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesUnit = unitFilter === '' || product.unit === unitFilter;
      
      return matchesSearch && matchesUnit;
    });
  }, [products, searchQuery, unitFilter]);

  const handleDeleteClick = (product: Product) => {
    setDeleteProduct(product);
  };

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      onDelete(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const getStockStatus = (product: Product) => {
    if (!product.minStock) return 'normal';
    return product.quantity <= product.minStock ? 'low' : 'normal';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const unitOptions = UNITS.map(unit => ({ value: unit, label: unit.toUpperCase() }));

  const columns: TableColumn<Product>[] = [
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
            <span className="text-xs text-gray-500">
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(product)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, SKU, or category..."
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={unitFilter}
              onChange={setUnitFilter}
              options={unitOptions}
              placeholder="Filter by unit"
            />
          </div>
        </div>

        {/* Results summary */}
        <div className="text-sm text-gray-600">
          {searchQuery || unitFilter ? (
            <>Showing {filteredProducts.length} of {products.length} products</>
          ) : (
            <>{products.length} products total</>
          )}
        </div>

        {/* Table */}
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
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteProduct !== null}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteProduct?.name}"? This action cannot be undone and will also delete all related supplier prices.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
