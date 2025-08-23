import type {
  Product,
  Supplier,
  SupplierPrice,
  TechCard,
  TemperatureCheck,
  CleaningLog,
  EquipmentCheck,
  RestaurantConfig,
} from './types';
import { STORAGE_KEYS, DEFAULT_CURRENCY, DEFAULT_MARKUP_MULTIPLIER } from './constants';
import { generateId, generateTimestamp } from '../utils/id';

// Generic localStorage utilities
function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Product operations
export function listProducts(): Product[] {
  return getFromStorage<Product>(STORAGE_KEYS.PRODUCTS);
}

export function getProduct(id: string): Product | undefined {
  return listProducts().find(p => p.id === id);
}

export function createProduct(product: Omit<Product, 'id'>): Product {
  const newProduct: Product = {
    ...product,
    id: generateId(),
  };
  
  const products = listProducts();
  products.push(newProduct);
  saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  
  return newProduct;
}

export function updateProduct(product: Product): Product {
  const products = listProducts();
  const index = products.findIndex(p => p.id === product.id);
  
  if (index === -1) {
    throw new Error('Product not found');
  }
  
  products[index] = product;
  saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  
  return product;
}

export function deleteProduct(id: string): boolean {
  const products = listProducts();
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return false;
  }
  
  products.splice(index, 1);
  saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  
  // Also delete related supplier prices
  const supplierPrices = listSupplierPrices();
  const filteredPrices = supplierPrices.filter(sp => sp.productId !== id);
  saveToStorage(STORAGE_KEYS.SUPPLIER_PRICES, filteredPrices);
  
  return true;
}

// Supplier operations
export function listSuppliers(): Supplier[] {
  return getFromStorage<Supplier>(STORAGE_KEYS.SUPPLIERS);
}

export function getSupplier(id: string): Supplier | undefined {
  return listSuppliers().find(s => s.id === id);
}

export function createSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
  const newSupplier: Supplier = {
    ...supplier,
    id: generateId(),
  };
  
  const suppliers = listSuppliers();
  suppliers.push(newSupplier);
  saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
  
  return newSupplier;
}

export function updateSupplier(supplier: Supplier): Supplier {
  const suppliers = listSuppliers();
  const index = suppliers.findIndex(s => s.id === supplier.id);
  
  if (index === -1) {
    throw new Error('Supplier not found');
  }
  
  suppliers[index] = supplier;
  saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
  
  return supplier;
}

export function deleteSupplier(id: string): boolean {
  const suppliers = listSuppliers();
  const index = suppliers.findIndex(s => s.id === id);
  
  if (index === -1) {
    return false;
  }
  
  suppliers.splice(index, 1);
  saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
  
  // Also delete related supplier prices
  const supplierPrices = listSupplierPrices();
  const filteredPrices = supplierPrices.filter(sp => sp.supplierId !== id);
  saveToStorage(STORAGE_KEYS.SUPPLIER_PRICES, filteredPrices);
  
  return true;
}

// Supplier Price operations
export function listSupplierPrices(productId?: string): SupplierPrice[] {
  const allPrices = getFromStorage<SupplierPrice>(STORAGE_KEYS.SUPPLIER_PRICES);
  return productId ? allPrices.filter(sp => sp.productId === productId) : allPrices;
}

export function getSupplierPrice(id: string): SupplierPrice | undefined {
  return listSupplierPrices().find(sp => sp.id === id);
}

export function createSupplierPrice(supplierPrice: Omit<SupplierPrice, 'id' | 'lastUpdated'>): SupplierPrice {
  const newSupplierPrice: SupplierPrice = {
    ...supplierPrice,
    id: generateId(),
    lastUpdated: generateTimestamp(),
  };
  
  // If this should be preferred, remove preferred flag from other prices for the same product
  if (newSupplierPrice.preferred) {
    const allPrices = listSupplierPrices();
    allPrices.forEach(sp => {
      if (sp.productId === newSupplierPrice.productId && sp.id !== newSupplierPrice.id) {
        sp.preferred = false;
      }
    });
    saveToStorage(STORAGE_KEYS.SUPPLIER_PRICES, allPrices);
  }
  
  const supplierPrices = listSupplierPrices();
  supplierPrices.push(newSupplierPrice);
  saveToStorage(STORAGE_KEYS.SUPPLIER_PRICES, supplierPrices);
  
  return newSupplierPrice;
}

export function updateSupplierPrice(supplierPrice: SupplierPrice): SupplierPrice {
  const supplierPrices = listSupplierPrices();
  const index = supplierPrices.findIndex(sp => sp.id === supplierPrice.id);
  
  if (index === -1) {
    throw new Error('Supplier price not found');
  }
  
  // Update timestamp
  supplierPrice.lastUpdated = generateTimestamp();
  
  // If this should be preferred, remove preferred flag from other prices for the same product
  if (supplierPrice.preferred) {
    supplierPrices.forEach(sp => {
      if (sp.productId === supplierPrice.productId && sp.id !== supplierPrice.id) {
        sp.preferred = false;
      }
    });
  }
  
  supplierPrices[index] = supplierPrice;
  saveToStorage(STORAGE_KEYS.SUPPLIER_PRICES, supplierPrices);
  
  return supplierPrice;
}

export function deleteSupplierPrice(id: string): boolean {
  const supplierPrices = listSupplierPrices();
  const index = supplierPrices.findIndex(sp => sp.id === id);
  
  if (index === -1) {
    return false;
  }
  
  supplierPrices.splice(index, 1);
  saveToStorage(STORAGE_KEYS.SUPPLIER_PRICES, supplierPrices);
  
  return true;
}

export function getPreferredSupplierPrice(productId: string): SupplierPrice | undefined {
  return listSupplierPrices(productId).find(sp => sp.preferred);
}

// Tech Card operations (skeleton)
export function listTechCards(): TechCard[] {
  return getFromStorage<TechCard>(STORAGE_KEYS.TECH_CARDS);
}

export function createTechCard(techCard: Omit<TechCard, 'id'>): TechCard {
  const newTechCard: TechCard = {
    ...techCard,
    id: generateId(),
  };
  
  const techCards = listTechCards();
  techCards.push(newTechCard);
  saveToStorage(STORAGE_KEYS.TECH_CARDS, techCards);
  
  return newTechCard;
}

export function updateTechCard(techCard: TechCard): TechCard {
  const techCards = listTechCards();
  const index = techCards.findIndex(tc => tc.id === techCard.id);
  
  if (index === -1) {
    throw new Error('Tech card not found');
  }
  
  techCards[index] = techCard;
  saveToStorage(STORAGE_KEYS.TECH_CARDS, techCards);
  
  return techCard;
}

export function deleteTechCard(id: string): boolean {
  const techCards = listTechCards();
  const index = techCards.findIndex(tc => tc.id === id);
  
  if (index === -1) {
    return false;
  }
  
  techCards.splice(index, 1);
  saveToStorage(STORAGE_KEYS.TECH_CARDS, techCards);
  
  return true;
}

// Journal operations (skeleton)
export function listTemperatureChecks(): TemperatureCheck[] {
  return getFromStorage<TemperatureCheck>(STORAGE_KEYS.TEMPERATURE_CHECKS);
}

export function createTemperatureCheck(check: Omit<TemperatureCheck, 'id' | 'timestamp'>): TemperatureCheck {
  const newCheck: TemperatureCheck = {
    ...check,
    id: generateId(),
    timestamp: generateTimestamp(),
  };
  
  const checks = listTemperatureChecks();
  checks.push(newCheck);
  saveToStorage(STORAGE_KEYS.TEMPERATURE_CHECKS, checks);
  
  return newCheck;
}

export function listCleaningLogs(): CleaningLog[] {
  return getFromStorage<CleaningLog>(STORAGE_KEYS.CLEANING_LOGS);
}

export function createCleaningLog(log: Omit<CleaningLog, 'id' | 'timestamp'>): CleaningLog {
  const newLog: CleaningLog = {
    ...log,
    id: generateId(),
    timestamp: generateTimestamp(),
  };
  
  const logs = listCleaningLogs();
  logs.push(newLog);
  saveToStorage(STORAGE_KEYS.CLEANING_LOGS, logs);
  
  return newLog;
}

export function listEquipmentChecks(): EquipmentCheck[] {
  return getFromStorage<EquipmentCheck>(STORAGE_KEYS.EQUIPMENT_CHECKS);
}

export function createEquipmentCheck(check: Omit<EquipmentCheck, 'id' | 'timestamp'>): EquipmentCheck {
  const newCheck: EquipmentCheck = {
    ...check,
    id: generateId(),
    timestamp: generateTimestamp(),
  };
  
  const checks = listEquipmentChecks();
  checks.push(newCheck);
  saveToStorage(STORAGE_KEYS.EQUIPMENT_CHECKS, checks);
  
  return newCheck;
}

// Restaurant config
export function getRestaurantConfig(): RestaurantConfig {
  const configs = getFromStorage<RestaurantConfig>(STORAGE_KEYS.RESTAURANT_CONFIG);
  if (configs.length === 0) {
    // Create default config
    const defaultConfig: RestaurantConfig = {
      id: generateId(),
      name: 'Little Big Pub',
      currency: DEFAULT_CURRENCY,
      markupMultiplier: DEFAULT_MARKUP_MULTIPLIER,
    };
    saveToStorage(STORAGE_KEYS.RESTAURANT_CONFIG, [defaultConfig]);
    return defaultConfig;
  }
  return configs[0];
}

export function updateRestaurantConfig(config: RestaurantConfig): RestaurantConfig {
  saveToStorage(STORAGE_KEYS.RESTAURANT_CONFIG, [config]);
  return config;
}

// Initialize with seed data if needed
export function seed(): void {
  if (listProducts().length === 0) {
    // Import and apply mock data
    import('./mockData').then(({ seedData }) => {
      seedData();
    });
  }
}
