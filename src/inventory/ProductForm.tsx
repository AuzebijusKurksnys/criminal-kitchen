import React, { useState, useEffect } from 'react';
import type { Product } from '../data/types';
import { ProductSchema, type ProductFormData } from '../utils/validators';
import { UNITS, PRODUCT_CATEGORIES } from '../data/constants';
import { Select } from '../components/Select';
import { useToast } from '../components/Toast';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({ product, onSubmit, onCancel, isSubmitting = false }: ProductFormProps) {
  const { showError } = useToast();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: product?.sku || '',
    name: product?.name || '',
    unit: product?.unit || 'pcs',
    quantity: product?.quantity || 0,
    minStock: product?.minStock || 0,
    category: product?.category || '',
    notes: product?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        unit: formData.unit as any, // Type cast for form submission
      });
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
