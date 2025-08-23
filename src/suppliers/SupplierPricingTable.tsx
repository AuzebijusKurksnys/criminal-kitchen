import { useState } from 'react';
import type { SupplierPrice, Supplier, Product } from '../data/types';
import { Table, type TableColumn } from '../components/Table';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatPrice, formatDate } from '../utils/format';

interface SupplierPricingTableProps {
  supplierPrices: SupplierPrice[];
  suppliers: Supplier[];
  product: Product;
  onEdit: (supplierPrice: SupplierPrice) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function SupplierPricingTable({ 
  supplierPrices, 
  suppliers, 
  product, 
  onEdit, 
  onDelete, 
  loading = false 
}: SupplierPricingTableProps) {
  const [deletePrice, setDeletePrice] = useState<SupplierPrice | null>(null);

  const handleDeleteClick = (supplierPrice: SupplierPrice) => {
    setDeletePrice(supplierPrice);
  };

  const handleDeleteConfirm = () => {
    if (deletePrice) {
      onDelete(deletePrice.id);
      setDeletePrice(null);
    }
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  const columns: TableColumn<SupplierPrice>[] = [
    {
      key: 'supplierId',
      label: 'Supplier',
      sortable: true,
      render: (supplierId) => (
        <span className="font-medium">{getSupplierName(supplierId)}</span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (price, supplierPrice) => (
        <div className="flex flex-col">
          <span className="font-medium text-lg">
            {formatPrice(price, supplierPrice.currency)}
          </span>
          <span className="text-xs text-gray-500">
            per {product.unit}
          </span>
        </div>
      ),
    },
    {
      key: 'currency',
      label: 'Currency',
      sortable: true,
      render: (currency) => (
        <span className="text-sm font-medium text-gray-600">{currency}</span>
      ),
    },
    {
      key: 'preferred',
      label: 'Preferred',
      render: (preferred) => (
        preferred ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ⭐ Preferred
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      render: (lastUpdated) => (
        <span className="text-sm text-gray-600">
          {formatDate(lastUpdated)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, supplierPrice) => (
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(supplierPrice)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(supplierPrice)}
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {product.name}
              </h3>
              <p className="text-sm text-gray-600">
                SKU: {product.sku} • Unit: {product.unit}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {supplierPrices.length} supplier{supplierPrices.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <Table
          data={supplierPrices}
          columns={columns}
          keyExtractor={(supplierPrice) => supplierPrice.id}
          loading={loading}
          emptyMessage="No supplier prices found for this product. Add the first price to get started."
        />
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deletePrice !== null}
        onClose={() => setDeletePrice(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier Price"
        message={`Are you sure you want to delete this price from ${deletePrice ? getSupplierName(deletePrice.supplierId) : ''}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
