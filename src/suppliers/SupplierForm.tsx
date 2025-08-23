import React, { useState, useEffect } from 'react';
import type { Supplier } from '../data/types';
import { SupplierSchema, type SupplierFormData } from '../utils/validators';
import { useToast } from '../components/Toast';

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SupplierForm({ supplier, onSubmit, onCancel, isSubmitting = false }: SupplierFormProps) {
  const { showError } = useToast();
  const [formData, setFormData] = useState<SupplierFormData>({
    name: supplier?.name || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
      });
    }
  }, [supplier]);

  const validateForm = () => {
    try {
      SupplierSchema.parse(formData);
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
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="name" className="form-label">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`form-input ${errors.name ? 'border-red-300' : ''}`}
            placeholder="e.g., Baltic Foods UAB"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`form-input ${errors.email ? 'border-red-300' : ''}`}
            placeholder="sales@supplier.com"
          />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="form-label">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`form-input ${errors.phone ? 'border-red-300' : ''}`}
            placeholder="+370 5 123 4567"
          />
          {errors.phone && <p className="form-error">{errors.phone}</p>}
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
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
        </button>
      </div>
    </form>
  );
}
