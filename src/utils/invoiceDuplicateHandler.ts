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
