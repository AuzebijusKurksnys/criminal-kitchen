import { useState, useMemo } from 'react';
import type { Supplier } from '../data/types';
import { Table, type TableColumn } from '../components/Table';
import { SearchInput } from '../components/SearchInput';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface SupplierListProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function SupplierList({ suppliers, onEdit, onDelete, loading = false }: SupplierListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = searchQuery === '' || 
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [suppliers, searchQuery]);

  const handleDeleteClick = (supplier: Supplier) => {
    setDeleteSupplier(supplier);
  };

  const handleDeleteConfirm = () => {
    if (deleteSupplier) {
      onDelete(deleteSupplier.id);
      setDeleteSupplier(null);
    }
  };

  const columns: TableColumn<Supplier>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value) => (
        value ? (
          <a 
            href={`mailto:${value}`} 
            className="text-blue-600 hover:text-blue-800"
          >
            {value}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
      render: (value) => (
        value ? (
          <a 
            href={`tel:${value}`} 
            className="text-blue-600 hover:text-blue-800"
          >
            {value}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, supplier) => (
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(supplier)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(supplier)}
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
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search suppliers by name or email..."
            />
          </div>
        </div>

        {/* Results summary */}
        <div className="text-sm text-gray-600">
          {searchQuery ? (
            <>Showing {filteredSuppliers.length} of {suppliers.length} suppliers</>
          ) : (
            <>{suppliers.length} suppliers total</>
          )}
        </div>

        {/* Table */}
        <Table
          data={filteredSuppliers}
          columns={columns}
          keyExtractor={(supplier) => supplier.id}
          loading={loading}
          emptyMessage={
            searchQuery 
              ? 'No suppliers match your search criteria'
              : 'No suppliers found. Create your first supplier to get started.'
          }
        />
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteSupplier !== null}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteSupplier?.name}"? This action cannot be undone and will also delete all related supplier prices.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
