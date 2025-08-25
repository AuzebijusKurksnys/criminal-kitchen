import { useState, useEffect } from 'react';
import type { TechCard, Product } from '../data/types';
import type { TechCardFormData } from '../utils/validators';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { TechCardList } from '../techcards/TechCardList';
import { TechCardForm } from '../techcards/TechCardForm';
import { useToast } from '../components/Toast';
import {
  listProducts,
  listTechCards,
  createTechCard,
  updateTechCard,
  deleteTechCard,
} from '../data/store';

type ViewMode = 'list' | 'create' | 'edit';

export function TechCardsPage() {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [techCards, setTechCards] = useState<TechCard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTechCard, setEditingTechCard] = useState<TechCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const productsList = await listProducts();
      const techCardsList = await listTechCards();
      setProducts(productsList);
      setTechCards(techCardsList);
    } catch (error) {
      showError('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTechCard = async (formData: TechCardFormData) => {
    setSubmitting(true);
    try {
      const newTechCard = await createTechCard(formData as any);
      setTechCards(prev => [...prev, newTechCard]);
      setViewMode('list');
      showSuccess('Tech card created successfully');
    } catch (error) {
      showError('Failed to create tech card');
      console.error('Error creating tech card:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTechCard = async (formData: TechCardFormData) => {
    if (!editingTechCard) return;
    
    setSubmitting(true);
    try {
      const updatedTechCard = await updateTechCard({
        ...editingTechCard,
        ...formData,
      } as any);
      setTechCards(prev => 
        prev.map(tc => tc.id === updatedTechCard.id ? updatedTechCard : tc)
      );
      setViewMode('list');
      setEditingTechCard(null);
      showSuccess('Tech card updated successfully');
    } catch (error) {
      showError('Failed to update tech card');
      console.error('Error updating tech card:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTechCard = async (id: string) => {
    try {
      const success = await deleteTechCard(id);
      if (success) {
        setTechCards(prev => prev.filter(tc => tc.id !== id));
        showSuccess('Tech card deleted successfully');
      } else {
        showError('Tech card not found');
      }
    } catch (error) {
      showError('Failed to delete tech card');
      console.error('Error deleting tech card:', error);
    }
  };

  const handleEditClick = (techCard: TechCard) => {
    setEditingTechCard(techCard);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingTechCard(null);
  };

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return 'Create New Tech Card';
      case 'edit':
        return `Edit Tech Card: ${editingTechCard?.name}`;
      default:
        return 'Tech Cards (Recipe Management)';
    }
  };

  const renderHeaderActions = () => {
    if (viewMode === 'list') {
      return (
        <button
          onClick={() => setViewMode('create')}
          className="btn-primary btn-md"
          disabled={products.length === 0}
        >
          Create Tech Card
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
            <>
              {products.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 text-sm text-yellow-700">
                      <p className="font-medium">No Products Available</p>
                      <p>Create products in the Inventory section before creating tech cards.</p>
                    </div>
                  </div>
                </div>
              )}
              
              <TechCardList
                techCards={techCards}
                products={products}
                onEdit={handleEditClick}
                onDelete={handleDeleteTechCard}
                loading={loading}
              />
            </>
          )}

          {viewMode === 'create' && (
            <TechCardForm
              products={products}
              onSubmit={handleCreateTechCard}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}

          {viewMode === 'edit' && editingTechCard && (
            <TechCardForm
              techCard={editingTechCard}
              products={products}
              onSubmit={handleUpdateTechCard}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
