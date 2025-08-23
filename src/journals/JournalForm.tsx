import React, { useState } from 'react';
import { Select } from '../components/Select';

interface JournalFormProps {
  type: 'temperature' | 'cleaning' | 'equipment';
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function JournalForm({ type, onSubmit, onCancel, isSubmitting = false }: JournalFormProps) {
  const [formData, setFormData] = useState<any>({
    userName: '',
    notes: '',
    // Type-specific fields
    ...(type === 'temperature' && { location: '', valueC: 0 }),
    ...(type === 'cleaning' && { area: '', status: 'done' }),
    ...(type === 'equipment' && { equipment: '', status: 'ok' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'temperature':
        return (
          <>
            <div>
              <label htmlFor="location" className="form-label">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="form-input"
                placeholder="e.g., Walk-in Freezer #1"
                required
              />
            </div>
            <div>
              <label htmlFor="valueC" className="form-label">
                Temperature (°C) <span className="text-red-500">*</span>
              </label>
              <input
                id="valueC"
                type="number"
                step="0.1"
                value={formData.valueC}
                onChange={(e) => handleChange('valueC', parseFloat(e.target.value) || 0)}
                className="form-input"
                placeholder="e.g., -2.5"
                required
              />
            </div>
          </>
        );

      case 'cleaning':
        return (
          <>
            <div>
              <label htmlFor="area" className="form-label">
                Area <span className="text-red-500">*</span>
              </label>
              <input
                id="area"
                type="text"
                value={formData.area}
                onChange={(e) => handleChange('area', e.target.value)}
                className="form-input"
                placeholder="e.g., Kitchen Floor"
                required
              />
            </div>
            <div>
              <label htmlFor="status" className="form-label">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onChange={(value) => handleChange('status', value)}
                options={[
                  { value: 'done', label: 'Done' },
                  { value: 'missed', label: 'Missed' },
                ]}
              />
            </div>
          </>
        );

      case 'equipment':
        return (
          <>
            <div>
              <label htmlFor="equipment" className="form-label">
                Equipment <span className="text-red-500">*</span>
              </label>
              <input
                id="equipment"
                type="text"
                value={formData.equipment}
                onChange={(e) => handleChange('equipment', e.target.value)}
                className="form-input"
                placeholder="e.g., Oven #2"
                required
              />
            </div>
            <div>
              <label htmlFor="status" className="form-label">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onChange={(value) => handleChange('status', value)}
                options={[
                  { value: 'ok', label: 'OK' },
                  { value: 'issue', label: 'Issue' },
                ]}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'temperature':
        return 'Temperature Check';
      case 'cleaning':
        return 'Cleaning Log';
      case 'equipment':
        return 'Equipment Check';
      default:
        return 'Journal Entry';
    }
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
            <p className="font-medium">Journals Feature (Beta)</p>
            <p>
              This is a skeleton implementation. Full journal functionality with scheduling, assignments, and photo uploads will be implemented in the next iteration.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="userName" className="form-label">
              User Name <span className="text-red-500">*</span>
            </label>
            <input
              id="userName"
              type="text"
              value={formData.userName}
              onChange={(e) => handleChange('userName', e.target.value)}
              className="form-input"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          {renderTypeSpecificFields()}
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
            placeholder="Additional notes or observations..."
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : `Log ${getTitle()}`}
          </button>
        </div>
      </form>
    </div>
  );
}
