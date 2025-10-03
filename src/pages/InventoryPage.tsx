import { useState, useEffect } from 'react';
import type { Product } from '../data/types';
import type { ProductFormData } from '../utils/validators';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { ProductList } from '../inventory/ProductList';
import { ProductForm } from '../inventory/ProductForm';
import { useToast } from '../components/Toast';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../data/store';

type ViewMode = 'list' | 'create' | 'edit';

export function InventoryPage() {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsList = await listProducts();
      setProducts(productsList);
    } catch (error) {
      showError('Failed to load products');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (formData: ProductFormData) => {
    setSubmitting(true);
    try {
      const newProduct = await createProduct(formData as any);
      setProducts(prev => [...prev, newProduct]);
      setViewMode('list');
      showSuccess('Product created successfully');
    } catch (error) {
      showError('Failed to create product');
      console.error('Error creating product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (formData: ProductFormData) => {
    if (!editingProduct) return;
    
    setSubmitting(true);
    try {
      const updatedProduct = await updateProduct({
        ...editingProduct,
        ...formData,
      } as any);
      setProducts(prev => 
        prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
      );
      setViewMode('list');
      setEditingProduct(null);
      showSuccess('Product updated successfully');
    } catch (error) {
      showError('Failed to update product');
      console.error('Error updating product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const success = await deleteProduct(id);
      if (success) {
        setProducts(prev => prev.filter(p => p.id !== id));
        showSuccess('Product deleted successfully');
      } else {
        showError('Product not found');
      }
    } catch (error) {
      showError('Failed to delete product');
      console.error('Error deleting product:', error);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingProduct(null);
  };

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return 'Create New Product';
      case 'edit':
        return `Edit Product: ${editingProduct?.name}`;
      default:
        return 'Stock Management';
    }
  };

  const renderHeaderActions = () => {
    if (viewMode === 'list') {
      return (
        <button
          onClick={() => setViewMode('create')}
          className="btn-primary btn-md"
        >
          Add Product
        </button>
      );
    }
    return null;
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
          {viewMode === 'list' && (
            <ProductList
              products={products}
              onEdit={handleEditClick}
              onDelete={handleDeleteProduct}
              loading={loading}
            />
          )}

          {viewMode === 'create' && (
            <ProductForm
              onSubmit={handleCreateProduct}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}

          {viewMode === 'edit' && editingProduct && (
            <ProductForm
              product={editingProduct}
              onSubmit={handleUpdateProduct}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {viewMode === 'list' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {products.length}
              </div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
          </Card>

          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {products.filter(p => p.minStock && p.quantity <= p.minStock).length}
              </div>
              <div className="text-sm text-gray-600">Low Stock Items</div>
            </div>
          </Card>

          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {[...new Set(products.map(p => p.category).filter(Boolean))].length}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
