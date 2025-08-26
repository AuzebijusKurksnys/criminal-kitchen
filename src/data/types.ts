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

// Invoice Management Types
export type InvoiceStatus = 'pending' | 'processing' | 'review' | 'approved' | 'rejected';

export interface Invoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalExclVat: number;
  totalInclVat: number;
  vatAmount: number;
  discountAmount: number;
  currency: Currency;
  status: InvoiceStatus;
  filePath?: string; // Path to stored PDF/image
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  extractedData?: any; // Raw OCR data for debugging
  notes?: string;
  processedAt?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
  supplierName?: string; // Computed field from join
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  productId?: string; // null if product not matched yet
  productName: string; // As appears on invoice
  description?: string;
  quantity: number;
  unit: string; // As appears on invoice
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
  matchedProductId?: string; // Suggested/confirmed product match
  matchConfidence?: number; // 0-1 confidence score
  needsReview: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMatch {
  productId: string;
  product: Product;
  confidence: number;
  reason: string; // Why this match was suggested
}

export interface InvoiceProcessingResult {
  invoice: Partial<Invoice>;
  lineItems: Partial<InvoiceLineItem>[];
  matches: { [lineItemIndex: number]: ProductMatch[] };
  errors: string[];
  warnings: string[];
  supplierInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };
}
