import React, { useState, useEffect } from 'react';
import type { TechCard, Product } from '../data/types';
import type { TechCardFormData } from '../utils/validators';
import { Select } from '../components/Select';
import { UNITS } from '../data/constants';

interface TechCardFormProps {
  techCard?: TechCard;
  products: Product[];
  onSubmit: (data: TechCardFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TechCardForm({ techCard, products, onSubmit, onCancel, isSubmitting = false }: TechCardFormProps) {
  const [formData, setFormData] = useState<TechCardFormData>({
    name: techCard?.name || '',
    items: techCard?.items || [],
    notes: techCard?.notes || '',
  });

  useEffect(() => {
    if (techCard) {
      setFormData({
        name: techCard.name,
        items: techCard.items,
        notes: techCard.notes || '',
      });
    }
  }, [techCard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        unit: item.unit as any, // Type cast for form submission
      }))
    });
  };

  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.name} (${product.sku})`
  }));

  const unitOptions = UNITS.map(unit => ({ value: unit, label: unit }));

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: '', nettoQty: 0, unit: 'kg', yieldPct: 1, notes: '' }
      ]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 text-sm text-yellow-700">
            <p className="font-medium">Tech Cards Feature (Beta)</p>
            <p>
              This is a skeleton implementation. Full recipe management with ingredient calculations will be implemented in the next iteration.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="form-label">
            Recipe Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
            placeholder="e.g., Classic Burger"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="form-label">Ingredients</label>
            <button
              type="button"
              onClick={addIngredient}
              className="btn-secondary btn-sm"
              disabled={products.length === 0}
            >
              Add Ingredient
            </button>
          </div>

          {products.length === 0 && (
            <p className="text-sm text-yellow-600 mb-4">
              No products available. Create products in the Inventory section first.
            </p>
          )}

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label text-sm">Product</label>
                    <Select
                      value={item.productId}
                      onChange={(value) => updateIngredient(index, 'productId', value)}
                      options={productOptions}
                      placeholder="Select product"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label text-sm">Netto Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.nettoQty}
                      onChange={(e) => updateIngredient(index, 'nettoQty', parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label text-sm">Unit</label>
                    <Select
                      value={item.unit}
                      onChange={(value) => updateIngredient(index, 'unit', value)}
                      options={unitOptions}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label text-sm">Yield %</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.yieldPct || 1}
                        onChange={(e) => updateIngredient(index, 'yieldPct', parseFloat(e.target.value) || 1)}
                        className="form-input"
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="form-label text-sm">Notes</label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                    className="form-input"
                    placeholder="Preparation notes..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="form-label">
            Recipe Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="form-input"
            placeholder="Preparation instructions, serving suggestions, etc."
          />
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
            disabled={isSubmitting || formData.items.length === 0}
          >
            {isSubmitting ? 'Saving...' : techCard ? 'Update Recipe' : 'Create Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
