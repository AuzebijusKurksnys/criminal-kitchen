import { Invoice, InvoiceLineItem } from '../data/types';
import { findExistingInvoice, getInvoiceLineItems } from '../data/store';

export interface DuplicateInvoiceInfo {
  existing: Invoice;
  existingLineItems: InvoiceLineItem[];
  isDuplicate: true;
}

export interface NoDuplicateInfo {
  isDuplicate: false;
}

export type DuplicateCheckResult = DuplicateInvoiceInfo | NoDuplicateInfo;

export async function checkForDuplicateInvoice(
  supplierId: string, 
  invoiceNumber: string
): Promise<DuplicateCheckResult> {
  console.log('🔍 Checking for duplicate invoice:', { supplierId, invoiceNumber });
  
  const existingInvoice = await findExistingInvoice(supplierId, invoiceNumber);
  
  if (!existingInvoice) {
    console.log('✅ No duplicate found');
    return { isDuplicate: false };
  }
  
  console.log('⚠️ Duplicate invoice found:', existingInvoice);
  
  const existingLineItems = await getInvoiceLineItems(existingInvoice.id);
  
  return {
    isDuplicate: true,
    existing: existingInvoice,
    existingLineItems
  };
}

export interface MergeOptions {
  mergeLineItems: boolean;
  updateTotals: boolean;
  keepExistingFile: boolean;
}

export interface LineItemComparison {
  existing: InvoiceLineItem;
  new: InvoiceLineItem;
  isDuplicate: boolean;
  action: 'keep_existing' | 'replace_with_new' | 'merge_quantities';
}

export function compareLineItems(
  existingLineItems: InvoiceLineItem[],
  newLineItems: Partial<InvoiceLineItem>[]
): LineItemComparison[] {
  const comparisons: LineItemComparison[] = [];
  
  // Create a map of existing line items by normalized product name
  const existingMap = new Map<string, InvoiceLineItem>();
  existingLineItems.forEach(item => {
    const normalizedName = normalizeProductName(item.productName);
    existingMap.set(normalizedName, item);
  });
  
  // Compare with new line items
  newLineItems.forEach(newItem => {
    if (!newItem.productName) return;
    
    const normalizedName = normalizeProductName(newItem.productName);
    const existingItem = existingMap.get(normalizedName);
    
    if (existingItem && newItem.quantity !== undefined && newItem.unitPrice !== undefined) {
      comparisons.push({
        existing: existingItem,
        new: newItem as InvoiceLineItem,
        isDuplicate: true,
        action: newItem.quantity === existingItem.quantity && 
                newItem.unitPrice === existingItem.unitPrice 
                ? 'keep_existing' 
                : 'merge_quantities'
      });
    }
  });
  
  return comparisons;
}

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function generateMergePreview(
  existing: Invoice,
  existingLineItems: InvoiceLineItem[],
  newLineItems: Partial<InvoiceLineItem>[]
): {
  totalLineItems: number;
  duplicateLineItems: number;
  newLineItems: number;
  comparisons: LineItemComparison[];
} {
  const comparisons = compareLineItems(existingLineItems, newLineItems);
  const duplicateLineItems = comparisons.length;
  const newLineItemsCount = newLineItems.length - duplicateLineItems;
  
  return {
    totalLineItems: existingLineItems.length + newLineItemsCount,
    duplicateLineItems,
    newLineItems: newLineItemsCount,
    comparisons
  };
}

export interface MergeOptions {
  mergeLineItems: boolean;
  updateTotals: boolean;
  keepExistingFile: boolean;
}

export async function mergeInvoices(
  existingInvoice: Invoice,
  existingLineItems: InvoiceLineItem[],
  newLineItems: Partial<InvoiceLineItem>[],
  newInvoicePartial: Partial<Invoice>,
  options: MergeOptions
): Promise<{ updatedInvoice: Invoice; updatedLineItems: InvoiceLineItem[] }> {
  let updatedInvoice = { ...existingInvoice };
  let updatedLineItems: InvoiceLineItem[] = [...existingLineItems];

  if (options.mergeLineItems) {
    const existingMap = new Map<string, InvoiceLineItem>();
    updatedLineItems.forEach(item => {
      existingMap.set(normalizeProductName(item.productName), item);
    });

    for (const newItem of newLineItems) {
      if (!newItem.productName || newItem.quantity === undefined || newItem.unitPrice === undefined) {
        continue;
      }

      const normalizedName = normalizeProductName(newItem.productName);
      const existingItem = existingMap.get(normalizedName);

      if (existingItem) {
        // Merge quantities and recalculate total price
        existingItem.quantity += newItem.quantity;
        existingItem.totalPrice = (existingItem.totalPrice || 0) + (newItem.totalPrice || (newItem.quantity * newItem.unitPrice));
        existingItem.unitPrice = existingItem.quantity > 0 ? existingItem.totalPrice / existingItem.quantity : 0;
        if (newItem.description && !existingItem.description) existingItem.description = newItem.description;
        if (newItem.vatRate !== undefined && existingItem.vatRate === undefined) existingItem.vatRate = newItem.vatRate;
      } else {
        // Add new line item
        updatedLineItems.push({
          ...newItem,
          id: `new-${Date.now()}-${Math.random()}`,
          invoiceId: existingInvoice.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          productName: newItem.productName,
          quantity: newItem.quantity,
          unit: newItem.unit || 'pcs',
          unitPrice: newItem.unitPrice,
          totalPrice: newItem.totalPrice || (newItem.quantity * newItem.unitPrice),
          vatRate: newItem.vatRate || 0,
        } as InvoiceLineItem);
      }
    }
  }

  if (options.updateTotals) {
    let newTotalExclVat = 0;
    let newTotalInclVat = 0;
    let newVatAmount = 0;

    for (const item of updatedLineItems) {
      const itemTotalExclVat = item.totalPrice;
      const itemVatRate = item.vatRate !== undefined ? item.vatRate : updatedInvoice.vatAmount;
      const itemVatAmount = itemTotalExclVat * (itemVatRate / 100);
      const itemTotalInclVat = itemTotalExclVat + itemVatAmount;

      newTotalExclVat += itemTotalExclVat;
      newVatAmount += itemVatAmount;
      newTotalInclVat += itemTotalInclVat;
    }

    updatedInvoice.totalExclVat = newTotalExclVat;
    updatedInvoice.vatAmount = newVatAmount;
    updatedInvoice.totalInclVat = newTotalInclVat;
  }

  if (!options.keepExistingFile && newInvoicePartial.filePath) {
    updatedInvoice.filePath = newInvoicePartial.filePath;
  }

  updatedInvoice.updatedAt = new Date().toISOString();

  return { updatedInvoice, updatedLineItems };
}
