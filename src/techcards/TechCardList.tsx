
import type { TechCard, Product } from '../data/types';
import { useMemo, useEffect, useState } from 'react';
import { Table, type TableColumn } from '../components/Table';
import { formatPrice, calculateSuggestedPrice, formatMargin } from '../utils/format';
import { getRestaurantConfig, getPreferredSupplierPrices } from '../data/store';

interface TechCardListProps {
  techCards: TechCard[];
  products: Product[];
  onEdit: (techCard: TechCard) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

type TechCardCost = {
  cost: number;
  hasAllPrices: boolean;
};

export function TechCardList({ techCards, products, onEdit, onDelete, loading = false }: TechCardListProps) {
  const restaurantConfig = getRestaurantConfig();
  const [costs, setCosts] = useState<Record<string, TechCardCost>>({});
  const [costsLoading, setCostsLoading] = useState(false);

  const productPriceLookup = useMemo(() => {
    const productIds = new Set<string>();
    techCards.forEach((techCard) => {
      techCard.items.forEach((item) => {
        if (item.productId) {
          productIds.add(item.productId);
        }
      });
    });
    return Array.from(productIds);
  }, [techCards]);

  useEffect(() => {
    let isMounted = true;

    async function loadCosts() {
      if (productPriceLookup.length === 0) {
        setCosts({});
        return;
      }

      setCostsLoading(true);

      try {
        const priceMap = await getPreferredSupplierPrices(productPriceLookup);

        if (!isMounted) return;

        const nextCosts: Record<string, TechCardCost> = {};

        techCards.forEach((techCard) => {
          let cost = 0;
          let hasAllPrices = techCard.items.length > 0;

          techCard.items.forEach((item) => {
            if (!item.productId) {
              hasAllPrices = false;
              return;
            }

            const priceEntry = priceMap[item.productId];

            if (!priceEntry) {
              hasAllPrices = false;
              return;
            }

            const yieldMultiplier = item.yieldPct ?? 1;
            const adjustedQty = item.nettoQty / Math.max(yieldMultiplier, 0.000001);

            cost += adjustedQty * priceEntry.priceExclVat;
          });

          nextCosts[techCard.id] = { cost, hasAllPrices };
        });

        setCosts(nextCosts);
      } catch (error) {
        console.error('Error calculating tech card costs:', error);
      } finally {
        if (isMounted) {
          setCostsLoading(false);
        }
      }
    }

    loadCosts();

    return () => {
      isMounted = false;
    };
  }, [productPriceLookup, techCards]);

  const calculateTechCardCost = (techCard: TechCard): TechCardCost => {
    return costs[techCard.id] || { cost: 0, hasAllPrices: false };
  };

  const columns: TableColumn<TechCard>[] = [
    {
      key: 'name',
      label: 'Recipe Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: 'items',
      label: 'Ingredients',
      render: (items) => (
        <span className="text-sm text-gray-600">
          {items.length} ingredient{items.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (_, techCard) => {
        const { cost, hasAllPrices } = calculateTechCardCost(techCard);
        
        if (!hasAllPrices) {
          return (
            <div className="flex flex-col">
              <span className="text-red-600 font-medium">No price</span>
              <span className="text-xs text-red-500">Missing supplier prices</span>
            </div>
          );
        }

        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {formatPrice(cost, restaurantConfig.currency)}
            </span>
            <span className="text-xs text-gray-500">Total cost</span>
          </div>
        );
      },
    },
    {
      key: 'suggested_price',
      label: 'Suggested Price',
      render: (_, techCard) => {
        const { cost, hasAllPrices } = calculateTechCardCost(techCard);
        
        if (!hasAllPrices) {
          return <span className="text-gray-400">-</span>;
        }

        const suggestedPrice = calculateSuggestedPrice(cost, restaurantConfig.markupMultiplier);
        
        return (
          <div className="flex flex-col">
            <span className="font-medium text-green-600">
              {formatPrice(suggestedPrice, restaurantConfig.currency)}
            </span>
            <span className="text-xs text-gray-500">
              {restaurantConfig.markupMultiplier}x markup
            </span>
          </div>
        );
      },
    },
    {
      key: 'margin',
      label: 'Margin',
      render: (_, techCard) => {
        const { cost, hasAllPrices } = calculateTechCardCost(techCard);
        
        if (!hasAllPrices) {
          return <span className="text-gray-400">-</span>;
        }

        const suggestedPrice = calculateSuggestedPrice(cost, restaurantConfig.markupMultiplier);
        const margin = formatMargin(suggestedPrice, cost);
        
        return (
          <span className="font-medium text-blue-600">{margin}</span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, techCard) => (
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(techCard)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View
          </button>
          <button
            onClick={() => onDelete(techCard.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 text-sm text-blue-700">
            <p className="font-medium">Tech Cards Feature (Beta)</p>
            <p>
              Costs are calculated using preferred supplier prices. Markup multiplier: {restaurantConfig.markupMultiplier}x
            </p>
          </div>
        </div>
      </div>

      <Table
        data={techCards}
        columns={columns}
        keyExtractor={(techCard) => techCard.id}
        loading={loading || costsLoading}
        emptyMessage="No tech cards found. Create your first recipe to get started."
      />
    </div>
  );
}
