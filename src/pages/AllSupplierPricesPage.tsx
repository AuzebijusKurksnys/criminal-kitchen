import { useState, useEffect, useMemo } from 'react';
import type { Product, Supplier, SupplierPrice } from '../data/types';
import { Table, type TableColumn } from '../components/Table';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatPrice } from '../utils/format';
import { useToast } from '../components/Toast';
import {
  listProducts,
  listSuppliers,
  listAllSupplierPrices,
  deleteSupplierPrice,
} from '../data/store';

export function AllSupplierPricesPage() {
  const { showSuccess, showError } = useToast();
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<(SupplierPrice & { productName?: string; supplierName?: string })[]>([]);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [preferredFilter, setPreferredFilter] = useState('all');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [deletePrice, setDeletePrice] = useState<SupplierPrice | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsList, suppliersList, pricesList] = await Promise.all([
        listProducts(),
        listSuppliers(),
        listAllSupplierPrices(),
      ]);
      
      setProducts(productsList);
      setSuppliers(suppliersList);
      
      // Enrich supplier prices with product and supplier names
      const enrichedPrices = pricesList.map(price => ({
        ...price,
        productName: productsList.find(p => p.id === price.productId)?.name || 'Unknown Product',
        supplierName: suppliersList.find(s => s.id === price.supplierId)?.name || 'Unknown Supplier'
      }));
      
      setSupplierPrices(enrichedPrices);
    } catch (error) {
      showError('Failed to load supplier prices');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = useMemo(() => {
    return supplierPrices.filter(price => {
      const matchesSearch = searchQuery === '' || 
        price.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        price.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        price.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProduct = productFilter === '' || price.productId === productFilter;
      const matchesSupplier = supplierFilter === '' || price.supplierId === supplierFilter;
      const matchesCurrency = currencyFilter === '' || price.currency === currencyFilter;
      const matchesPreferred = preferredFilter === 'all' || 
        (preferredFilter === 'preferred' && price.preferred) ||
        (preferredFilter === 'not-preferred' && !price.preferred);
      
      return matchesSearch && matchesProduct && matchesSupplier && matchesCurrency && matchesPreferred;
    });
  }, [supplierPrices, searchQuery, productFilter, supplierFilter, currencyFilter, preferredFilter]);

  const handleDeletePrice = async (price: SupplierPrice) => {
    try {
      const success = await deleteSupplierPrice(price.id);
      if (success) {
        setSupplierPrices(prev => prev.filter(p => p.id !== price.id));
        showSuccess('Supplier price deleted successfully');
      } else {
        showError('Supplier price not found');
      }
    } catch (error) {
      showError('Failed to delete supplier price');
      console.error('Error deleting supplier price:', error);
    }
  };

  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.name} (${product.sku})`
  }));

  const supplierOptions = suppliers.map(supplier => ({
    value: supplier.id,
    label: supplier.name
  }));

  const currencyOptions = [
    { value: 'EUR', label: 'EUR' },
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' }
  ];

  const preferredOptions = [
    { value: 'all', label: 'All' },
    { value: 'preferred', label: 'Preferred Only' },
    { value: 'not-preferred', label: 'Non-Preferred' }
  ];

  const columns: TableColumn<SupplierPrice & { productName?: string; supplierName?: string }>[] = [
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
      render: (_value: any, price) => (
        <div>
          <div className="font-medium text-gray-900">{price.productName}</div>
          <div className="text-sm text-gray-500">SKU: {products.find(p => p.id === price.productId)?.sku}</div>
        </div>
      ),
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      sortable: true,
      render: (_value: any, price) => (
        <span className="font-medium">{price.supplierName}</span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (_value: any, price) => (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{formatPrice(price.price, price.currency)}</span>
          {price.preferred && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Preferred
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'currency',
      label: 'Currency',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-gray-600">{value}</span>
      ),
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      render: (value) => (
        <div>
          <div className="text-sm text-gray-900">
            {new Date(value).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'invoiceNumber',
      label: 'Source Invoice',
      render: (_value: any, price) => (
        price.invoiceNumber ? (
          <span className="text-sm text-blue-600 font-mono">
            {price.invoiceNumber}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Manual</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value: any, price) => (
        <button
          onClick={() => setDeletePrice(price)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Supplier Prices</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive view of all supplier pricing with filtering options
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search products, suppliers, invoices..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <Select
              value={productFilter}
              onChange={setProductFilter}
              options={productOptions}
              placeholder="All Products"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <Select
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={supplierOptions}
              placeholder="All Suppliers"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <Select
              value={currencyFilter}
              onChange={setCurrencyFilter}
              options={currencyOptions}
              placeholder="All Currencies"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred
            </label>
            <Select
              value={preferredFilter}
              onChange={setPreferredFilter}
              options={preferredOptions}
            />
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          {searchQuery || productFilter || supplierFilter || currencyFilter || preferredFilter !== 'all' ? (
            <>Showing {filteredPrices.length} of {supplierPrices.length} supplier prices</>
          ) : (
            <>{supplierPrices.length} supplier prices total</>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        data={filteredPrices}
        columns={columns}
        keyExtractor={(price) => price.id}
        loading={loading}
        sortable
        emptyMessage={
          searchQuery || productFilter || supplierFilter || currencyFilter || preferredFilter !== 'all'
            ? 'No supplier prices match your filters'
            : 'No supplier prices found. Add some prices to get started.'
        }
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deletePrice !== null}
        onCancel={() => setDeletePrice(null)}
        onConfirm={() => {
          if (deletePrice) {
            handleDeletePrice(deletePrice);
            setDeletePrice(null);
          }
        }}
        title="Delete Supplier Price"
        message={`Are you sure you want to delete this price entry? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
