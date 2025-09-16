import React, { useState, useEffect } from 'react';
import type { Product, Supplier } from '../data/types';
import { ProductSchema, type ProductFormData } from '../utils/validators';
import { UNITS, PRODUCT_CATEGORIES } from '../data/constants';
import { Select } from '../components/Select';
import { useToast } from '../components/Toast';
import { listSuppliers, getPreferredSupplier, setPreferredSupplier } from '../data/store';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({ product, onSubmit, onCancel, isSubmitting = false }: ProductFormProps) {
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: product?.sku || '',
    name: product?.name || '',
    unit: product?.unit || 'pcs',
    quantity: product?.quantity || 0,
    minStock: product?.minStock || 0,
    category: product?.category || '',
    notes: product?.notes || '',
    preferredSupplierId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [preferredSupplier, setPreferredSupplierState] = useState<Supplier | undefined>();
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Load suppliers on component mount
  useEffect(() => {
    const loadSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const suppliersData = await listSuppliers();
        setSuppliers(suppliersData);
      } catch (error) {
        showError('Failed to load suppliers');
      } finally {
        setLoadingSuppliers(false);
      }
    };
    
    loadSuppliers();
  }, [showError]);

  // Load product data and preferred supplier
  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        quantity: product.quantity,
        minStock: product.minStock || 0,
        category: product.category || '',
        notes: product.notes || '',
        preferredSupplierId: '',
      });
      
      // Load preferred supplier if editing existing product
      const loadPreferredSupplier = async () => {
        try {
          const preferred = await getPreferredSupplier(product.id);
          setPreferredSupplierState(preferred);
          setFormData(prev => ({ 
            ...prev, 
            preferredSupplierId: preferred?.id || '' 
          }));
        } catch (error) {
          console.error('Failed to load preferred supplier:', error);
        }
      };
      
      loadPreferredSupplier();
    }
  }, [product]);

  const validateForm = () => {
    try {
      ProductSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const validationErrors: Record<string, string> = {};
      error.errors.forEach((err: any) => {
        validationErrors[err.path[0]] = err.message;
      });
      setErrors(validationErrors);
      showError('Please fix the validation errors');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit the product form
      onSubmit({
        ...formData,
        unit: formData.unit as any, // Type cast for form submission
      });
      
      // Handle preferred supplier setting after product is created/updated
      if (product && formData.preferredSupplierId && formData.preferredSupplierId !== preferredSupplier?.id) {
        try {
          const success = await setPreferredSupplier(product.id, formData.preferredSupplierId);
          if (success) {
            showSuccess('Preferred supplier updated');
          } else {
            showError('Failed to update preferred supplier');
          }
        } catch (error) {
          showError('Failed to update preferred supplier');
        }
      }
    }
  };

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const unitOptions = UNITS.map(unit => ({ value: unit, label: unit }));
  const categoryOptions = PRODUCT_CATEGORIES.map(cat => ({ value: cat, label: cat }));
  const supplierOptions = suppliers.map(supplier => ({ 
    value: supplier.id, 
    label: supplier.name 
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="sku" className="form-label">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            id="sku"
            type="text"
            value={formData.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            className={`form-input ${errors.sku ? 'border-red-300' : ''}`}
            placeholder="e.g., CHICK-001"
          />
          {errors.sku && <p className="form-error">{errors.sku}</p>}
        </div>

        <div>
          <label htmlFor="name" className="form-label">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`form-input ${errors.name ? 'border-red-300' : ''}`}
            placeholder="e.g., Chicken Breast"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="unit" className="form-label">
            Unit <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.unit}
            onChange={(value) => handleChange('unit', value)}
            options={unitOptions}
            placeholder="Select unit"
          />
          {errors.unit && <p className="form-error">{errors.unit}</p>}
        </div>

        <div>
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <Select
            value={formData.category || ''}
            onChange={(value) => handleChange('category', value)}
            options={categoryOptions}
            placeholder="Select category"
          />
          {errors.category && <p className="form-error">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="quantity" className="form-label">
            Current Quantity <span className="text-red-500">*</span>
          </label>
          <input
            id="quantity"
            type="number"
            min="0"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
            className={`form-input ${errors.quantity ? 'border-red-300' : ''}`}
          />
          {errors.quantity && <p className="form-error">{errors.quantity}</p>}
        </div>

        <div>
          <label htmlFor="minStock" className="form-label">
            Minimum Stock
          </label>
          <input
            id="minStock"
            type="number"
            min="0"
            step="0.01"
            value={formData.minStock}
            onChange={(e) => handleChange('minStock', parseFloat(e.target.value) || 0)}
            className={`form-input ${errors.minStock ? 'border-red-300' : ''}`}
          />
          {errors.minStock && <p className="form-error">{errors.minStock}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="form-label">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="form-input"
          placeholder="Additional notes about this product..."
        />
        {errors.notes && <p className="form-error">{errors.notes}</p>}
      </div>

      {/* Preferred Supplier Section - only show when editing existing product */}
      {product && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h3>
          
          {preferredSupplier && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <span className="font-medium">Current Preferred Supplier:</span> {preferredSupplier.name}
              </p>
            </div>
          )}
          
          <div>
            <label htmlFor="preferredSupplierId" className="form-label">
              Preferred Supplier
            </label>
            <Select
              value={formData.preferredSupplierId || ''}
              onChange={(value) => handleChange('preferredSupplierId', value)}
              options={supplierOptions}
              placeholder={loadingSuppliers ? "Loading suppliers..." : "Select preferred supplier"}
              disabled={loadingSuppliers}
            />
            <p className="text-sm text-gray-500 mt-1">
              Set which supplier is preferred for this product. This affects pricing calculations and ordering.
            </p>
            {errors.preferredSupplierId && <p className="form-error">{errors.preferredSupplierId}</p>}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary btn-md"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary btn-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
