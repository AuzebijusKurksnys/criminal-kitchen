import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, Supplier, SupplierPrice } from '../data/types';
import type { SupplierFormData, SupplierPriceFormData } from '../utils/validators';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Select } from '../components/Select';
import { SupplierList } from '../suppliers/SupplierList';
import { SupplierForm } from '../suppliers/SupplierForm';
import { SupplierPricingTable } from '../suppliers/SupplierPricingTable';
import { SupplierPriceForm } from '../suppliers/SupplierPriceForm';
import { useToast } from '../components/Toast';
import {
  listProducts,
  listSuppliers,
  listSupplierPrices,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSupplierPrice,
  updateSupplierPrice,
  deleteSupplierPrice,
} from '../data/store';

type ViewMode = 'pricing' | 'suppliers' | 'create-supplier' | 'edit-supplier' | 'create-price' | 'edit-price';

export function SupplierPricesPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('pricing');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPrice, setEditingPrice] = useState<SupplierPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadSupplierPrices(selectedProductId);
    } else {
      setSupplierPrices([]);
    }
  }, [selectedProductId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const productsList = await listProducts();
      const suppliersList = await listSuppliers();
      
      setProducts(productsList);
      setSuppliers(suppliersList);
      
      // Auto-select first product if available
      if (productsList.length > 0 && !selectedProductId) {
        setSelectedProductId(productsList[0].id);
      }
    } catch (error) {
      showError('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierPrices = async (productId: string) => {
    try {
      const prices = await listSupplierPrices(productId);
      setSupplierPrices(prices);
    } catch (error) {
      showError('Failed to load supplier prices');
      console.error('Error loading supplier prices:', error);
    }
  };

  // Supplier operations
  const handleCreateSupplier = async (formData: SupplierFormData) => {
    setSubmitting(true);
    try {
      const newSupplier = await createSupplier(formData);
      setSuppliers(prev => [...prev, newSupplier]);
      setViewMode('suppliers');
      showSuccess('Supplier created successfully');
    } catch (error) {
      showError('Failed to create supplier');
      console.error('Error creating supplier:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSupplier = async (formData: SupplierFormData) => {
    if (!editingSupplier) return;
    
    setSubmitting(true);
    try {
      const updatedSupplier = await updateSupplier({
        ...editingSupplier,
        ...formData,
      });
      setSuppliers(prev => 
        prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s)
      );
      setViewMode('suppliers');
      setEditingSupplier(null);
      showSuccess('Supplier updated successfully');
    } catch (error) {
      showError('Failed to update supplier');
      console.error('Error updating supplier:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const success = await deleteSupplier(id);
      if (success) {
        setSuppliers(prev => prev.filter(s => s.id !== id));
        // Refresh supplier prices in case some were deleted
        if (selectedProductId) {
          loadSupplierPrices(selectedProductId);
        }
        showSuccess('Supplier deleted successfully');
      } else {
        showError('Supplier not found');
      }
    } catch (error) {
      showError('Failed to delete supplier');
      console.error('Error deleting supplier:', error);
    }
  };

  // Supplier price operations
  const handleCreateSupplierPrice = async (formData: SupplierPriceFormData) => {
    setSubmitting(true);
    try {
      const newPrice = await createSupplierPrice(formData as any);
      setSupplierPrices(prev => [...prev, newPrice]);
      setViewMode('pricing');
      showSuccess('Supplier price added successfully');
    } catch (error) {
      showError('Failed to add supplier price');
      console.error('Error creating supplier price:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSupplierPrice = async (formData: SupplierPriceFormData) => {
    if (!editingPrice) return;
    
    setSubmitting(true);
    try {
      const updatedPrice = await updateSupplierPrice({
        ...editingPrice,
        ...formData,
      } as any);
      setSupplierPrices(prev => 
        prev.map(p => p.id === updatedPrice.id ? updatedPrice : p)
      );
      setViewMode('pricing');
      setEditingPrice(null);
      showSuccess('Supplier price updated successfully');
    } catch (error) {
      showError('Failed to update supplier price');
      console.error('Error updating supplier price:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplierPrice = async (id: string) => {
    try {
      const success = await deleteSupplierPrice(id);
      if (success) {
        setSupplierPrices(prev => prev.filter(p => p.id !== id));
        showSuccess('Supplier price deleted successfully');
      } else {
        showError('Supplier price not found');
      }
    } catch (error) {
      showError('Failed to delete supplier price');
      console.error('Error deleting supplier price:', error);
    }
  };

  // Event handlers
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setViewMode('edit-supplier');
  };

  const handleEditPrice = (price: SupplierPrice) => {
    setEditingPrice(price);
    setViewMode('edit-price');
  };

  const handleCancel = () => {
    setViewMode(viewMode.includes('supplier') ? 'suppliers' : 'pricing');
    setEditingSupplier(null);
    setEditingPrice(null);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.name} (${product.sku})`
  }));

  const renderHeader = () => {
    switch (viewMode) {
      case 'suppliers':
        return 'Manage Suppliers';
      case 'create-supplier':
        return 'Create New Supplier';
      case 'edit-supplier':
        return `Edit Supplier: ${editingSupplier?.name}`;
      case 'create-price':
        return `Add Price: ${selectedProduct?.name}`;
      case 'edit-price':
        return `Edit Price: ${selectedProduct?.name}`;
      default:
        return 'Supplier Pricing';
    }
  };

  const renderHeaderActions = () => {
    switch (viewMode) {
      case 'pricing':
        return (
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/supplier-prices/all')}
              className="btn-secondary btn-md"
            >
              View All Prices
            </button>
            <button
              onClick={() => setViewMode('suppliers')}
              className="btn-secondary btn-md"
            >
              Manage Suppliers
            </button>
            <button
              onClick={() => setViewMode('create-price')}
              className="btn-primary btn-md"
              disabled={!selectedProductId || suppliers.length === 0}
            >
              Add Price
            </button>
          </div>
        );
      case 'suppliers':
        return (
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('pricing')}
              className="btn-secondary btn-md"
            >
              Back to Pricing
            </button>
            <button
              onClick={() => setViewMode('create-supplier')}
              className="btn-primary btn-md"
            >
              Add Supplier
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{renderHeader()}</CardTitle>
            {renderHeaderActions()}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Product selector for pricing view */}
          {(viewMode === 'pricing' || viewMode === 'create-price' || viewMode === 'edit-price') && (
            <div className="mb-6">
              <label className="form-label">Select Product</label>
              <Select
                value={selectedProductId}
                onChange={setSelectedProductId}
                options={productOptions}
                placeholder="Choose a product to manage pricing"
                disabled={products.length === 0}
              />
              {products.length === 0 && (
                <p className="text-sm text-yellow-600 mt-1">
                  No products available. Create products in the Inventory section first.
                </p>
              )}
            </div>
          )}

          {viewMode === 'pricing' && selectedProduct && (
            <SupplierPricingTable
              supplierPrices={supplierPrices}
              suppliers={suppliers}
              product={selectedProduct}
              onEdit={handleEditPrice}
              onDelete={handleDeleteSupplierPrice}
              loading={loading}
            />
          )}

          {viewMode === 'suppliers' && (
            <SupplierList
              suppliers={suppliers}
              onEdit={handleEditSupplier}
              onDelete={handleDeleteSupplier}
              loading={loading}
            />
          )}

          {viewMode === 'create-supplier' && (
            <SupplierForm
              onSubmit={handleCreateSupplier}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}

          {viewMode === 'edit-supplier' && editingSupplier && (
            <SupplierForm
              supplier={editingSupplier}
              onSubmit={handleUpdateSupplier}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}

          {viewMode === 'create-price' && selectedProduct && (
            <SupplierPriceForm
              productId={selectedProduct.id}
              suppliers={suppliers}
              onSubmit={handleCreateSupplierPrice}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}

          {viewMode === 'edit-price' && editingPrice && selectedProduct && (
            <SupplierPriceForm
              supplierPrice={editingPrice}
              productId={selectedProduct.id}
              suppliers={suppliers}
              onSubmit={handleUpdateSupplierPrice}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
