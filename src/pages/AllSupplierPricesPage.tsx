import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Supplier, SupplierPrice } from '../data/types';
import { listAllSupplierPrices, listProducts, listSuppliers } from '../data/store';
import { Table, TableColumn } from '../components/Table';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { formatPrice } from '../utils/format';
import { useToast } from '../components/Toast';

interface SupplierPriceWithDetails extends SupplierPrice {
  productName: string;
  productSku: string;
  supplierName: string;
}

export function AllSupplierPricesPage() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [supplierPrices, setSupplierPrices] = useState<SupplierPriceWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [preferredFilter, setPreferredFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading supplier prices data...');
      
      const [pricesData, productsData, suppliersData] = await Promise.all([
        listAllSupplierPrices(),
        listProducts(),
        listSuppliers()
      ]);

      console.log('Loaded data:', { 
        prices: pricesData.length, 
        products: productsData.length, 
        suppliers: suppliersData.length 
      });

      // Create lookup maps
      const productMap = new Map(productsData.map(p => [p.id, p]));
      const supplierMap = new Map(suppliersData.map(s => [s.id, s]));

      // Enrich supplier prices with product and supplier details
      const enrichedPrices: SupplierPriceWithDetails[] = pricesData.map(price => {
        const product = productMap.get(price.productId);
        const supplier = supplierMap.get(price.supplierId);
        
        return {
          ...price,
          productName: product?.name || 'Unknown Product',
          productSku: product?.sku || 'N/A',
          supplierName: supplier?.name || 'Unknown Supplier'
        };
      });

      setSupplierPrices(enrichedPrices);
      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading supplier prices:', error);
      showError('Failed to load supplier prices');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredPrices = supplierPrices.filter(price => {
    const matchesSearch = 
      price.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      price.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      price.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSupplier = !supplierFilter || price.supplierId === supplierFilter;
    const matchesCurrency = !currencyFilter || price.currency === currencyFilter;
    const matchesPreferred = !preferredFilter || 
      (preferredFilter === 'preferred' && price.preferred) ||
      (preferredFilter === 'not-preferred' && !price.preferred);

    return matchesSearch && matchesSupplier && matchesCurrency && matchesPreferred;
  });

  const supplierOptions = [
    { value: '', label: 'All Suppliers' },
    ...suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))
  ];

  const currencyOptions = [
    { value: '', label: 'All Currencies' },
    { value: 'EUR', label: 'EUR' },
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' }
  ];

  const preferredOptions = [
    { value: '', label: 'All Prices' },
    { value: 'preferred', label: 'Preferred Only' },
    { value: 'not-preferred', label: 'Non-Preferred Only' }
  ];

  const columns: TableColumn<SupplierPriceWithDetails>[] = [
    {
      key: 'productSku',
      label: 'SKU',
      sortable: true,
      render: (value, price) => (
        <div className="font-mono text-sm">{value}</div>
      ),
    },
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
      render: (value, price) => (
        <div className="flex flex-col">
          <span className="font-medium">{value}</span>
          <span className="text-xs text-gray-500">ID: {price.productId.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      sortable: true,
      render: (value, price) => (
        <div className="flex flex-col">
          <span className="font-medium">{value}</span>
          {price.preferred && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit">
              ⭐ Preferred
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value, price) => (
        <div className="text-right">
          <span className="font-medium">{formatPrice(value, price.currency)}</span>
        </div>
      ),
    },
    {
      key: 'currency',
      label: 'Currency',
      sortable: true,
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {value}
        </span>
      ),
    },
    {
      key: 'invoiceNumber',
      label: 'Invoice Source',
      sortable: true,
      render: (value, price) => (
        <div className="text-sm">
          {value ? (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              📄 {value}
            </span>
          ) : (
            <span className="text-gray-400">Manual Entry</span>
          )}
        </div>
      ),
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Supplier Prices</h1>
          <p className="mt-2 text-gray-600">
            View and manage all supplier pricing information across products
          </p>
        </div>
        <button
          onClick={() => navigate('/supplier-prices')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          ← Back to Product View
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Products/Suppliers
            </label>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by product, SKU, or supplier..."
              className="w-full"
            />
          </div>

          {/* Supplier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <Select
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={supplierOptions}
              className="w-full"
            />
          </div>

          {/* Currency Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <Select
              value={currencyFilter}
              onChange={setCurrencyFilter}
              options={currencyOptions}
              className="w-full"
            />
          </div>

          {/* Preferred Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preference
            </label>
            <Select
              value={preferredFilter}
              onChange={setPreferredFilter}
              options={preferredOptions}
              className="w-full"
            />
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredPrices.length} of {supplierPrices.length} supplier prices
          </span>
          {(searchQuery || supplierFilter || currencyFilter || preferredFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSupplierFilter('');
                setCurrencyFilter('');
                setPreferredFilter('');
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table
          data={filteredPrices}
          columns={columns}
          keyExtractor={(price) => price.id}
          loading={loading}
          emptyMessage={
            filteredPrices.length === 0 && supplierPrices.length > 0
              ? 'No supplier prices match your filter criteria'
              : 'No supplier prices found. Start by adding products and suppliers.'
          }
        />
      </div>
    </div>
  );
}