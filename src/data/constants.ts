import type { Currency, Unit } from './types';

export const DEFAULT_CURRENCY: Currency = 'EUR';
export const DEFAULT_MARKUP_MULTIPLIER = 4.0;

export const UNITS: Unit[] = ['pcs', 'kg', 'g', 'l', 'ml'];
export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];

export const UNIT_LABELS: Record<Unit, string> = {
  pcs: 'pieces',
  kg: 'kilograms',
  g: 'grams',
  l: 'liters',
  ml: 'milliliters',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export const PRODUCT_CATEGORIES = [
  'Meat',
  'Dairy', 
  'Vegetables',
  'Fruits',
  'Dry',
  'Spices',
  'Beverages',
  'Brew',
  'Cleaning',
  'Other'
];

export const STORAGE_KEYS = {
  PRODUCTS: 'criminalkitchen_products',
  SUPPLIERS: 'criminalkitchen_suppliers', 
  SUPPLIER_PRICES: 'criminalkitchen_supplier_prices',
  TECH_CARDS: 'criminalkitchen_tech_cards',
  TEMPERATURE_CHECKS: 'criminalkitchen_temperature_checks',
  CLEANING_LOGS: 'criminalkitchen_cleaning_logs',
  EQUIPMENT_CHECKS: 'criminalkitchen_equipment_checks',
  RESTAURANT_CONFIG: 'criminalkitchen_restaurant_config',
} as const;
