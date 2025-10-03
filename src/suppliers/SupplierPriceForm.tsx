import React, { useState, useEffect } from 'react';
import type { SupplierPrice, Supplier } from '../data/types';
import { SupplierPriceSchema, type SupplierPriceFormData } from '../utils/validators';
import { CURRENCIES } from '../data/constants';
import { Select } from '../components/Select';
import { useToast } from '../components/Toast';

interface SupplierPriceFormProps {
  supplierPrice?: SupplierPrice;
  productId: string;
  suppliers: Supplier[];
  onSubmit: (data: SupplierPriceFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SupplierPriceForm({ 
  supplierPrice, 
  productId, 
  suppliers, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: SupplierPriceFormProps) {
  const { showError } = useToast();
  const [formData, setFormData] = useState<SupplierPriceFormData>({
    productId,
    supplierId: supplierPrice?.supplierId || '',
    price: supplierPrice?.price || 0,
    currency: supplierPrice?.currency || 'EUR',
    preferred: supplierPrice?.preferred || false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplierPrice) {
      setFormData({
        productId: supplierPrice.productId,
        supplierId: supplierPrice.supplierId,
        price: supplierPrice.price,
        currency: supplierPrice.currency,
        preferred: supplierPrice.preferred || false,
      });
    }
  }, [supplierPrice]);

  const validateForm = () => {
    try {
      SupplierPriceSchema.parse(formData);
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
        currency: formData.currency as any, // Type cast for form submission
      });
    }
  };

  const handleChange = (field: keyof SupplierPriceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const supplierOptions = suppliers.map(supplier => ({ 
    value: supplier.id, 
    label: supplier.name 
  }));

  const currencyOptions = CURRENCIES.map(currency => ({ 
    value: currency, 
    label: currency 
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="supplierId" className="form-label">
            Supplier <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.supplierId}
            onChange={(value) => handleChange('supplierId', value)}
            options={supplierOptions}
            placeholder="Select supplier"
            disabled={suppliers.length === 0}
          />
          {errors.supplierId && <p className="form-error">{errors.supplierId}</p>}
          {suppliers.length === 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              No suppliers available. Create a supplier first.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="currency" className="form-label">
            Currency <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.currency}
            onChange={(value) => handleChange('currency', value)}
            options={currencyOptions}
            placeholder="Select currency"
          />
          {errors.currency && <p className="form-error">{errors.currency}</p>}
        </div>

        <div>
          <label htmlFor="price" className="form-label">
            Price <span className="text-red-500">*</span>
          </label>
          <input
            id="price"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            className={`form-input ${errors.price ? 'border-red-300' : ''}`}
            placeholder="0.00"
          />
          {errors.price && <p className="form-error">{errors.price}</p>}
        </div>

        <div className="flex items-center pt-6">
          <input
            id="preferred"
            type="checkbox"
            checked={formData.preferred}
            onChange={(e) => handleChange('preferred', e.target.checked)}
            className="h-4 w-4 text-blue-400 focus:ring-blue-500 border-gray-700 rounded"
          />
          <label htmlFor="preferred" className="ml-2 text-sm text-gray-200">
            Set as preferred supplier for this product
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 text-sm text-blue-700">
            Only one supplier can be marked as preferred per product. Setting this as preferred will remove the preferred status from other suppliers for this product.
          </div>
        </div>
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
          disabled={isSubmitting || suppliers.length === 0}
        >
          {isSubmitting ? 'Saving...' : supplierPrice ? 'Update Price' : 'Add Price'}
        </button>
      </div>
    </form>
  );
}
