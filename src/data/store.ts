import type {
  Product,
  Supplier,
  SupplierPrice,
  TechCard,
  TemperatureCheck,
  CleaningLog,
  EquipmentCheck,
  RestaurantConfig,
  Invoice,
  InvoiceLineItem,
  Currency,
  InvoiceStatus,
} from './types';
import { DEFAULT_CURRENCY, DEFAULT_MARKUP_MULTIPLIER } from './constants';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { TablesInsert, TablesUpdate } from '../lib/database.types';

// Product operations
export async function listProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
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
    console.log('createProduct called with:', product);
    const insertData: TablesInsert<'products'> = {
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity: product.quantity,
      min_stock: product.minStock,
      category: product.category,
      notes: product.notes,
    };
    console.log('insertData for Supabase:', insertData);
    
    const { data, error } = await supabase
      .from('products')
      .insert([insertData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }
    
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
    
    return (data || []).map((row: any) => ({
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

// Helper function to get preferred supplier for a product
export async function getPreferredSupplier(productId: string): Promise<Supplier | undefined> {
  try {
    const { data, error } = await supabase
      .from('supplier_prices')
      .select(`
        *,
        suppliers (*)
      `)
      .eq('product_id', productId)
      .eq('preferred', true)
      .single();
    
    if (error || !data || !data.suppliers) return undefined;
    
    return {
      id: data.suppliers.id,
      name: data.suppliers.name,
      email: data.suppliers.email || undefined,
      phone: data.suppliers.phone || undefined,
    };
  } catch (error) {
    console.error('Error getting preferred supplier:', error);
    return undefined;
  }
}

// Function to set preferred supplier for a product
export async function setPreferredSupplier(productId: string, supplierId: string): Promise<boolean> {
  try {
    // First, unset all preferred suppliers for this product
    await supabase
      .from('supplier_prices')
      .update({ preferred: false })
      .eq('product_id', productId);
    
    // Then set the new preferred supplier
    const { error } = await supabase
      .from('supplier_prices')
      .update({ preferred: true })
      .eq('product_id', productId)
      .eq('supplier_id', supplierId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting preferred supplier:', error);
    return false;
  }
}

// Supplier Price operations
export async function listSupplierPrices(productId?: string): Promise<SupplierPrice[]> {
  try {
    let query = supabase
      .from('supplier_prices')
      .select(`
        *,
        invoices(invoice_number)
      `)
      .order('last_updated', { ascending: false });
    
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      supplierId: row.supplier_id,
      price: Number(row.price),
      currency: row.currency as SupplierPrice['currency'],
      lastUpdated: row.last_updated || new Date().toISOString(),
      preferred: row.preferred || false,
      invoiceId: row.invoice_id || undefined,
      invoiceNumber: row.invoices?.invoice_number || undefined,
    }));
  } catch (error) {
    handleSupabaseError(error, 'list supplier prices');
    return [];
  }
}

export async function listAllSupplierPrices(): Promise<SupplierPrice[]> {
  return listSupplierPrices(); // Use the same function without productId filter
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
    
    const insertData = {
      product_id: supplierPrice.productId,
      supplier_id: supplierPrice.supplierId,
      price: supplierPrice.price,
      currency: supplierPrice.currency,
      preferred: supplierPrice.preferred,
      invoice_id: supplierPrice.invoiceId,
    };
    
    const { data, error } = await supabase
      .from('supplier_prices')
      .insert([insertData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating supplier price:', error);
      throw new Error(`Failed to create supplier price: ${error.message}`);
    }
    
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

export async function deleteTechCard(_id: string): Promise<boolean> {
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
    
    return (data || []).map((row: any) => ({
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
    
    return (data || []).map((row: any) => ({
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
    
    return (data || []).map((row: any) => ({
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

// Optional: Add Lithuanian suppliers manually (not auto-run)
export async function seedSuppliersOnly(): Promise<void> {
  try {
    const suppliers = await listSuppliers();
    if (suppliers.length === 0) {
      const { seedData } = await import('./mockData');
      await seedData();
      console.log('✅ Lithuanian suppliers added to database');
    } else {
      console.log('ℹ️ Suppliers already exist, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding suppliers:', error);
  }
}

// Invoice Management Functions
export async function listInvoices(): Promise<Invoice[]> {
  console.log('Fetching invoices from Supabase...');
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      suppliers(name)
    `)
    .order('created_at', { ascending: false });
  
  console.log('Supabase response:', { data, error });
  
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  
  const invoices = data?.map((row: any) => ({
    id: row.id,
    supplierId: row.supplier_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    totalExclVat: row.total_excl_vat,
    totalInclVat: row.total_incl_vat,
    vatAmount: row.vat_amount,
    discountAmount: row.discount_amount ?? 0,
    currency: row.currency as Currency,
    status: row.status as InvoiceStatus,
    filePath: row.file_path ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type ?? undefined,
    extractedData: row.extracted_data || undefined,
    notes: row.notes ?? undefined,
    processedAt: row.processed_at ?? undefined,
    processedBy: row.processed_by ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    supplierName: row.suppliers?.name
  })) || [];
  
  console.log('Mapped invoices:', invoices);
  return invoices;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      suppliers(name)
    `)
    .eq('id', id)
    .single();
  
  if (error) return null;
  if (!data) return null;
  
  return {
    id: data.id,
    supplierId: data.supplier_id,
    invoiceNumber: data.invoice_number,
    invoiceDate: data.invoice_date,
    totalExclVat: data.total_excl_vat,
    totalInclVat: data.total_incl_vat,
    vatAmount: data.vat_amount,
    discountAmount: data.discount_amount ?? 0,
    currency: data.currency as Currency,
    status: data.status as InvoiceStatus,
    filePath: data.file_path ?? undefined,
    fileName: data.file_name ?? undefined,
    fileSize: data.file_size ?? undefined,
    mimeType: data.mime_type ?? undefined,
    extractedData: data.extracted_data || undefined,
    notes: data.notes ?? undefined,
    processedAt: data.processed_at ?? undefined,
    processedBy: data.processed_by ?? undefined,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString(),
    supplierName: data.suppliers?.name
  };
}

export async function checkInvoiceExists(supplierId: string, invoiceNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('invoice_number', invoiceNumber)
    .limit(1);
  
  if (error) {
    console.error('Error checking invoice existence:', error);
    return false;
  }
  
  return data && data.length > 0;
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
  // Check if invoice already exists for this supplier
  const exists = await checkInvoiceExists(invoice.supplierId, invoice.invoiceNumber);
  if (exists) {
    throw new Error(`Invoice ${invoice.invoiceNumber} already exists for this supplier`);
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      supplier_id: invoice.supplierId,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      total_excl_vat: invoice.totalExclVat,
      total_incl_vat: invoice.totalInclVat,
      vat_amount: invoice.vatAmount,
      discount_amount: invoice.discountAmount,
      currency: invoice.currency,
      status: invoice.status,
      file_path: invoice.filePath,
      file_name: invoice.fileName,
      file_size: invoice.fileSize,
      mime_type: invoice.mimeType,
      extracted_data: invoice.extractedData,
      notes: invoice.notes,
      processed_at: invoice.processedAt,
      processed_by: invoice.processedBy
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error creating invoice:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.message.includes('invoices_supplier_invoice_number_unique')) {
      throw new Error(`Invoice ${invoice.invoiceNumber} already exists for this supplier`);
    }
    
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
  
  return {
    id: data.id,
    supplierId: data.supplier_id,
    invoiceNumber: data.invoice_number,
    invoiceDate: data.invoice_date,
    totalExclVat: data.total_excl_vat,
    totalInclVat: data.total_incl_vat,
    vatAmount: data.vat_amount,
    discountAmount: data.discount_amount ?? 0,
    currency: data.currency as Currency,
    status: data.status as InvoiceStatus,
    filePath: data.file_path ?? undefined,
    fileName: data.file_name ?? undefined,
    fileSize: data.file_size ?? undefined,
    mimeType: data.mime_type ?? undefined,
    extractedData: data.extracted_data || undefined,
    notes: data.notes ?? undefined,
    processedAt: data.processed_at ?? undefined,
    processedBy: data.processed_by ?? undefined,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString()
  };
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const updateData: any = {};
  
  if (updates.supplierId !== undefined) updateData.supplier_id = updates.supplierId;
  if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber;
  if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate;
  if (updates.totalExclVat !== undefined) updateData.total_excl_vat = updates.totalExclVat;
  if (updates.totalInclVat !== undefined) updateData.total_incl_vat = updates.totalInclVat;
  if (updates.vatAmount !== undefined) updateData.vat_amount = updates.vatAmount;
  if (updates.discountAmount !== undefined) updateData.discount_amount = updates.discountAmount;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.filePath !== undefined) updateData.file_path = updates.filePath;
  if (updates.fileName !== undefined) updateData.file_name = updates.fileName;
  if (updates.fileSize !== undefined) updateData.file_size = updates.fileSize;
  if (updates.mimeType !== undefined) updateData.mime_type = updates.mimeType;
  if (updates.extractedData !== undefined) updateData.extracted_data = updates.extractedData;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.processedAt !== undefined) updateData.processed_at = updates.processedAt;
  if (updates.processedBy !== undefined) updateData.processed_by = updates.processedBy;

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    supplierId: data.supplier_id,
    invoiceNumber: data.invoice_number,
    invoiceDate: data.invoice_date,
    totalExclVat: data.total_excl_vat,
    totalInclVat: data.total_incl_vat,
    vatAmount: data.vat_amount,
    discountAmount: data.discount_amount ?? 0,
    currency: data.currency as Currency,
    status: data.status as InvoiceStatus,
    filePath: data.file_path ?? undefined,
    fileName: data.file_name ?? undefined,
    fileSize: data.file_size ?? undefined,
    mimeType: data.mime_type ?? undefined,
    extractedData: data.extracted_data || undefined,
    notes: data.notes ?? undefined,
    processedAt: data.processed_at ?? undefined,
    processedBy: data.processed_by ?? undefined,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString()
  };
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Invoice Line Items Functions
export async function listInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
  const { data, error } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data?.map((row: any) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id ?? undefined,
    productName: row.product_name,
    description: row.description ?? undefined,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    vatRate: row.vat_rate,
    matchedProductId: row.matched_product_id ?? undefined,
    matchConfidence: row.match_confidence ?? undefined,
    needsReview: row.needs_review ?? false,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString()
  })) || [];
}

export async function createInvoiceLineItem(lineItem: Omit<InvoiceLineItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceLineItem> {
  const { data, error } = await supabase
    .from('invoice_line_items')
    .insert({
      invoice_id: lineItem.invoiceId,
      product_id: lineItem.productId || null,
      product_name: lineItem.productName,
      description: lineItem.description || null,
      quantity: lineItem.quantity,
      unit: lineItem.unit,
      unit_price: lineItem.unitPrice,
      total_price: lineItem.totalPrice,
      vat_rate: lineItem.vatRate || 21,
      matched_product_id: lineItem.matchedProductId || null,
      match_confidence: lineItem.matchConfidence || null,
      needs_review: lineItem.needsReview || false,
      notes: lineItem.notes || null
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error creating invoice line item:', error);
    throw new Error(`Failed to create invoice line item: ${error.message}`);
  }
  
  return {
    id: data.id,
    invoiceId: data.invoice_id,
    productId: data.product_id ?? undefined,
    productName: data.product_name,
    description: data.description ?? undefined,
    quantity: data.quantity,
    unit: data.unit,
    unitPrice: data.unit_price,
    totalPrice: data.total_price,
    vatRate: data.vat_rate,
    matchedProductId: data.matched_product_id ?? undefined,
    matchConfidence: data.match_confidence ?? undefined,
    needsReview: data.needs_review ?? false,
    notes: data.notes ?? undefined,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString()
  };
}

export async function updateInvoiceLineItem(id: string, updates: Partial<InvoiceLineItem>): Promise<InvoiceLineItem> {
  const updateData: any = {};
  
  if (updates.productId !== undefined) updateData.product_id = updates.productId;
  if (updates.productName !== undefined) updateData.product_name = updates.productName;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
  if (updates.totalPrice !== undefined) updateData.total_price = updates.totalPrice;
  if (updates.vatRate !== undefined) updateData.vat_rate = updates.vatRate;
  if (updates.matchedProductId !== undefined) updateData.matched_product_id = updates.matchedProductId;
  if (updates.matchConfidence !== undefined) updateData.match_confidence = updates.matchConfidence;
  if (updates.needsReview !== undefined) updateData.needs_review = updates.needsReview;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('invoice_line_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    invoiceId: data.invoice_id,
    productId: data.product_id ?? undefined,
    productName: data.product_name,
    description: data.description ?? undefined,
    quantity: data.quantity,
    unit: data.unit,
    unitPrice: data.unit_price,
    totalPrice: data.total_price,
    vatRate: data.vat_rate,
    matchedProductId: data.matched_product_id ?? undefined,
    matchConfidence: data.match_confidence ?? undefined,
    needsReview: data.needs_review ?? false,
    notes: data.notes ?? undefined,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString()
  };
}

export async function deleteInvoiceLineItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// File Upload Functions
export async function uploadInvoiceFile(file: File, invoiceId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${invoiceId}-${Date.now()}.${fileExt}`;
  const filePath = `${invoiceId}/${fileName}`;

  const { error } = await supabase.storage
    .from('invoices')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return filePath;
}

export async function getInvoiceFileUrl(filePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  return data?.signedUrl || '';
}

export async function deleteInvoiceFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('invoices')
    .remove([filePath]);

  if (error) throw error;
}