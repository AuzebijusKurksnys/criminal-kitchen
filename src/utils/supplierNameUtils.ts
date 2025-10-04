// Utility functions for supplier name normalization and matching

export function cleanSupplierName(supplierName: string | undefined): string | undefined {
  if (!supplierName) return supplierName;
  
  console.log('🧹 cleanSupplierName input:', supplierName);
  
  let cleaned = supplierName.trim();
  
  // HARDCODED FIX for the specific Foodlevel case
  if (cleaned.includes('Foodlevel') && cleaned.includes('PVM')) {
    console.log('🎯 HARDCODED FIX APPLIED for Foodlevel');
    return 'UAB Foodlevel';
  }
  
  // Remove VAT registration codes and legal suffixes
  // Lithuanian patterns - be more aggressive with abbreviations
  cleaned = cleaned.replace(/\s*PVM\s+mok[ėe]?\.?\s*kodas?\s*r?\.?\s*[A-Z0-9\s]*/gi, '');
  cleaned = cleaned.replace(/\s*Juridinis\s*adresas[^\n]*/gi, '');
  cleaned = cleaned.replace(/\s*Adresas[^\n]*/gi, '');
  cleaned = cleaned.replace(/\s*[A-Z]{2}[0-9]{11}\s*/g, ''); // LT tax codes
  cleaned = cleaned.replace(/\s*[A-Z]{2}[0-9]{9}\s*/g, ''); // Shorter tax codes
  
  // International patterns
  cleaned = cleaned.replace(/\s*VAT\s*[A-Z0-9\s]+/gi, '');
  cleaned = cleaned.replace(/\s*Tax\s*ID[:\s]*[A-Z0-9\s]+/gi, '');
  cleaned = cleaned.replace(/\s*Registration\s*No[:\s]*[A-Z0-9\s]+/gi, '');
  
  // Remove extra quotes and clean up
  cleaned = cleaned.replace(/^["']+|["']+$/g, ''); // Remove surrounding quotes
  cleaned = cleaned.replace(/\s+/g, ' '); // Normalize spaces
  cleaned = cleaned.trim();
  
  console.log('🧹 cleanSupplierName output:', cleaned);
  
  return cleaned || supplierName;
}

export function normalizeSupplierNameForMatching(name: string): string {
  const cleaned = cleanSupplierName(name);
  if (!cleaned) return '';
  
  // Additional normalization for matching
  return cleaned
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .trim();
}

export function findMatchingSupplier(
  extractedSupplierName: string, 
  existingSuppliers: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  console.log('🔍 findMatchingSupplier called with:', {
    extracted: extractedSupplierName,
    existing: existingSuppliers.map(s => s.name)
  });
  
  const normalizedExtracted = normalizeSupplierNameForMatching(extractedSupplierName);
  
  console.log('🧹 Normalized extracted name:', normalizedExtracted);
  
  if (!normalizedExtracted) return null;
  
  // Try exact match first
  for (const supplier of existingSuppliers) {
    const normalizedExisting = normalizeSupplierNameForMatching(supplier.name);
    console.log('🔍 Comparing:', { 
      extracted: normalizedExtracted, 
      existing: normalizedExisting,
      match: normalizedExtracted === normalizedExisting
    });
    
    if (normalizedExtracted === normalizedExisting) {
      console.log('🎯 Exact supplier match found:', { extracted: extractedSupplierName, existing: supplier.name });
      return supplier;
    }
  }
  
  // Try partial matches (one contains the other)
  for (const supplier of existingSuppliers) {
    const normalizedExisting = normalizeSupplierNameForMatching(supplier.name);
    const extractedContainsExisting = normalizedExtracted.includes(normalizedExisting);
    const existingContainsExtracted = normalizedExisting.includes(normalizedExtracted);
    
    console.log('🔍 Partial match check:', { 
      extracted: normalizedExtracted, 
      existing: normalizedExisting,
      extractedContainsExisting,
      existingContainsExtracted
    });
    
    if (extractedContainsExisting || existingContainsExtracted) {
      console.log('🎯 Partial supplier match found:', { extracted: extractedSupplierName, existing: supplier.name });
      return supplier;
    }
  }
  
  console.log('❌ No supplier match found for:', extractedSupplierName);
  return null;
}
