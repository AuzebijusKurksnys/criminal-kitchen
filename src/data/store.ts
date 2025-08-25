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
import { DEFAULT_CURRENCY, DEFAULT_MARKUP_MULTIPLIER } from './constants';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

// Product operations
export async function listProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      unit: row.unit as Product['unit'],
      quantity: Number(row.quantity),
      minStock: row.min_stock ? Number(row.min_stock) : undefined,
      category: row.category || undefined,
      notes: row.notes || undefined,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list products');
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | undefined> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return undefined;
    
    return {
      id: data.id,
      sku: data.sku,
      name: data.name,
      unit: data.unit as Product['unit'],
      quantity: Number(data.quantity),
      minStock: data.min_stock ? Number(data.min_stock) : undefined,
      category: data.category || undefined,
      notes: data.notes || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'get product');
    return undefined;
  }
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  try {
    const insertData: TablesInsert<'products'> = {
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity: product.quantity,
      min_stock: product.minStock,
      category: product.category,
      notes: product.notes,
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      sku: data.sku,
      name: data.name,
      unit: data.unit as Product['unit'],
      quantity: Number(data.quantity),
      minStock: data.min_stock ? Number(data.min_stock) : undefined,
      category: data.category || undefined,
      notes: data.notes || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'create product');
    throw error;
  }
}

export async function updateProduct(product: Product): Promise<Product> {
  try {
    const updateData: TablesUpdate<'products'> = {
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity: product.quantity,
      min_stock: product.minStock,
      category: product.category,
      notes: product.notes,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', product.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      sku: data.sku,
      name: data.name,
      unit: data.unit as Product['unit'],
      quantity: Number(data.quantity),
      minStock: data.min_stock ? Number(data.min_stock) : undefined,
      category: data.category || undefined,
      notes: data.notes || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'update product');
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'delete product');
    return false;
  }
}

// Supplier operations
export async function listSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list suppliers');
    return [];
  }
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return undefined;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'get supplier');
    return undefined;
  }
}

export async function createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
  try {
    const insertData: TablesInsert<'suppliers'> = {
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
    };
    
    const { data, error } = await supabase
      .from('suppliers')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'create supplier');
    throw error;
  }
}

export async function updateSupplier(supplier: Supplier): Promise<Supplier> {
  try {
    const updateData: TablesUpdate<'suppliers'> = {
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', supplier.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'update supplier');
    throw error;
  }
}

export async function deleteSupplier(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'delete supplier');
    return false;
  }
}

// Supplier Price operations
export async function listSupplierPrices(productId?: string): Promise<SupplierPrice[]> {
  try {
    let query = supabase
      .from('supplier_prices')
      .select('*')
      .order('last_updated', { ascending: false });
    
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      productId: row.product_id,
      supplierId: row.supplier_id,
      price: Number(row.price),
      currency: row.currency as SupplierPrice['currency'],
      lastUpdated: row.last_updated || new Date().toISOString(),
      preferred: row.preferred || false,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list supplier prices');
    return [];
  }
}

export async function createSupplierPrice(supplierPrice: Omit<SupplierPrice, 'id' | 'lastUpdated'>): Promise<SupplierPrice> {
  try {
    // If this should be preferred, remove preferred flag from other prices for the same product
    if (supplierPrice.preferred) {
      await supabase
        .from('supplier_prices')
        .update({ preferred: false })
        .eq('product_id', supplierPrice.productId);
    }
    
    const insertData: TablesInsert<'supplier_prices'> = {
      product_id: supplierPrice.productId,
      supplier_id: supplierPrice.supplierId,
      price: supplierPrice.price,
      currency: supplierPrice.currency,
      preferred: supplierPrice.preferred,
    };
    
    const { data, error } = await supabase
      .from('supplier_prices')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      price: Number(data.price),
      currency: data.currency as SupplierPrice['currency'],
      lastUpdated: data.last_updated || new Date().toISOString(),
      preferred: data.preferred || false,
    };
  } catch (error) {
    handleSupabaseError(error, 'create supplier price');
    throw error;
  }
}

export async function updateSupplierPrice(supplierPrice: SupplierPrice): Promise<SupplierPrice> {
  try {
    // If this should be preferred, remove preferred flag from other prices for the same product
    if (supplierPrice.preferred) {
      await supabase
        .from('supplier_prices')
        .update({ preferred: false })
        .eq('product_id', supplierPrice.productId)
        .neq('id', supplierPrice.id);
    }
    
    const updateData: TablesUpdate<'supplier_prices'> = {
      product_id: supplierPrice.productId,
      supplier_id: supplierPrice.supplierId,
      price: supplierPrice.price,
      currency: supplierPrice.currency,
      preferred: supplierPrice.preferred,
      last_updated: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('supplier_prices')
      .update(updateData)
      .eq('id', supplierPrice.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      price: Number(data.price),
      currency: data.currency as SupplierPrice['currency'],
      lastUpdated: data.last_updated || new Date().toISOString(),
      preferred: data.preferred || false,
    };
  } catch (error) {
    handleSupabaseError(error, 'update supplier price');
    throw error;
  }
}

export async function deleteSupplierPrice(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supplier_prices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'delete supplier price');
    return false;
  }
}

export async function getPreferredSupplierPrice(productId: string): Promise<SupplierPrice | undefined> {
  try {
    const { data, error } = await supabase
      .from('supplier_prices')
      .select('*')
      .eq('product_id', productId)
      .eq('preferred', true)
      .single();
    
    if (error) throw error;
    if (!data) return undefined;
    
    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      price: Number(data.price),
      currency: data.currency as SupplierPrice['currency'],
      lastUpdated: data.last_updated || new Date().toISOString(),
      preferred: data.preferred || false,
    };
  } catch (error) {
    // No preferred supplier is not an error
    return undefined;
  }
}

// Tech Card operations (skeleton - will implement with complex relationships later)
export async function listTechCards(): Promise<TechCard[]> {
  return Promise.resolve([]);
}

export async function createTechCard(techCard: Omit<TechCard, 'id'>): Promise<TechCard> {
  // Placeholder - complex implementation needed for ingredients
  return Promise.resolve({ id: 'temp', ...techCard });
}

export async function updateTechCard(techCard: TechCard): Promise<TechCard> {
  return Promise.resolve(techCard);
}

export async function deleteTechCard(id: string): Promise<boolean> {
  return Promise.resolve(true);
}

// Journal operations
export async function listTemperatureChecks(): Promise<TemperatureCheck[]> {
  try {
    const { data, error } = await supabase
      .from('temperature_checks')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      location: row.location,
      valueC: Number(row.value_c),
      userName: row.user_name,
      timestamp: row.timestamp || new Date().toISOString(),
      notes: row.notes || undefined,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list temperature checks');
    return [];
  }
}

export async function createTemperatureCheck(check: Omit<TemperatureCheck, 'id' | 'timestamp'>): Promise<TemperatureCheck> {
  try {
    const insertData: TablesInsert<'temperature_checks'> = {
      location: check.location,
      value_c: check.valueC,
      user_name: check.userName,
      notes: check.notes,
    };
    
    const { data, error } = await supabase
      .from('temperature_checks')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      location: data.location,
      valueC: Number(data.value_c),
      userName: data.user_name,
      timestamp: data.timestamp || new Date().toISOString(),
      notes: data.notes || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'create temperature check');
    throw error;
  }
}

export async function listCleaningLogs(): Promise<CleaningLog[]> {
  try {
    const { data, error } = await supabase
      .from('cleaning_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      area: row.area,
      status: row.status as CleaningLog['status'],
      userName: row.user_name,
      timestamp: row.timestamp || new Date().toISOString(),
      notes: row.notes || undefined,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list cleaning logs');
    return [];
  }
}

export async function createCleaningLog(log: Omit<CleaningLog, 'id' | 'timestamp'>): Promise<CleaningLog> {
  try {
    const insertData: TablesInsert<'cleaning_logs'> = {
      area: log.area,
      status: log.status,
      user_name: log.userName,
      notes: log.notes,
    };
    
    const { data, error } = await supabase
      .from('cleaning_logs')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      area: data.area,
      status: data.status as CleaningLog['status'],
      userName: data.user_name,
      timestamp: data.timestamp || new Date().toISOString(),
      notes: data.notes || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'create cleaning log');
    throw error;
  }
}

export async function listEquipmentChecks(): Promise<EquipmentCheck[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_checks')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      equipment: row.equipment,
      status: row.status as EquipmentCheck['status'],
      userName: row.user_name,
      timestamp: row.timestamp || new Date().toISOString(),
      notes: row.notes || undefined,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list equipment checks');
    return [];
  }
}

export async function createEquipmentCheck(check: Omit<EquipmentCheck, 'id' | 'timestamp'>): Promise<EquipmentCheck> {
  try {
    const insertData: TablesInsert<'equipment_checks'> = {
      equipment: check.equipment,
      status: check.status,
      user_name: check.userName,
      notes: check.notes,
    };
    
    const { data, error } = await supabase
      .from('equipment_checks')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      equipment: data.equipment,
      status: data.status as EquipmentCheck['status'],
      userName: data.user_name,
      timestamp: data.timestamp || new Date().toISOString(),
      notes: data.notes || undefined,
    };
  } catch (error) {
    handleSupabaseError(error, 'create equipment check');
    throw error;
  }
}

// Restaurant config (static for now)
export function getRestaurantConfig(): RestaurantConfig {
  return {
    id: 'default',
    name: 'Little Big Pub',
    currency: DEFAULT_CURRENCY,
    markupMultiplier: DEFAULT_MARKUP_MULTIPLIER,
  };
}

export function updateRestaurantConfig(config: RestaurantConfig): RestaurantConfig {
  return config;
}

// Initialize with seed data if needed
export async function seed(): Promise<void> {
  try {
    const products = await listProducts();
    if (products.length === 0) {
      // Import and apply mock data
      const { seedData } = await import('./mockData');
      await seedData();
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}