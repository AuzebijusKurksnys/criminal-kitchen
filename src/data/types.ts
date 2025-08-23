export type Unit = 'pcs' | 'kg' | 'g' | 'l' | 'ml';
export type Currency = 'EUR' | 'USD' | 'GBP';

export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: Unit;
  quantity: number;
  minStock?: number;
  category?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface SupplierPrice {
  id: string;
  productId: string;
  supplierId: string;
  price: number;
  currency: Currency;
  lastUpdated: string; // ISO timestamp
  preferred?: boolean;
}

export interface TechCardIngredient {
  productId: string;
  nettoQty: number;
  unit: Unit;
  yieldPct?: number;
  notes?: string;
}

export interface TechCard {
  id: string;
  name: string;
  items: TechCardIngredient[];
  notes?: string;
}

export interface TemperatureCheck {
  id: string;
  location: string;
  valueC: number;
  userName: string;
  timestamp: string; // ISO timestamp
  notes?: string;
}

export interface CleaningLog {
  id: string;
  area: string;
  status: 'done' | 'missed';
  userName: string;
  timestamp: string; // ISO timestamp
  notes?: string;
}

export interface EquipmentCheck {
  id: string;
  equipment: string;
  status: 'ok' | 'issue';
  userName: string;
  timestamp: string; // ISO timestamp
  notes?: string;
}

// UI Types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export interface RestaurantConfig {
  id: string;
  name: string;
  currency: Currency;
  markupMultiplier: number;
}
