import type { Currency, Unit } from '../data/types';
import { CURRENCY_SYMBOLS, UNIT_LABELS } from '../data/constants';

/**
 * Format a price with currency symbol
 */
export function formatPrice(price: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: Unit): string {
  const unitLabel = UNIT_LABELS[unit];
  return `${quantity} ${unitLabel}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format margin percentage  
 */
export function formatMargin(price: number, cost: number): string {
  if (price === 0) return '0%';
  const margin = (price - cost) / price;
  return formatPercentage(margin);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate suggested price based on cost and markup multiplier
 */
export function calculateSuggestedPrice(cost: number, markupMultiplier: number): number {
  return cost * markupMultiplier;
}
