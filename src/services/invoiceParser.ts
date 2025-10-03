import OpenAI from 'openai';
import type { InvoiceLineItem, InvoiceProcessingResult, Product, ProductMatch } from '../data/types';
import { listProducts } from '../data/store';
import { createAzureDocumentIntelligenceService, isAzureDocumentIntelligenceAvailable } from './azureDocumentIntelligence';
import { openaiInvoiceProcessor, isOpenAIAvailable } from './openaiModels';
import { pdfProcessor } from './pdfProcessor';
import PDFProcessor from './pdfProcessor';
import { TextExtractor } from './textExtractor';

// OpenAI client - legacy support (now handled by openaiModels.ts)
const openaiClient = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

// Legacy function for backward compatibility
export function initializeOpenAI(apiKey: string): void {
  console.log('OpenAI now uses VITE_OPENAI_API_KEY from Vercel env vars');
}

export function isOpenAIInitialized(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

// File conversion utilities
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convert PDF to image for OCR processing
async function processPDFFile(file: File): Promise<File> {
  console.log('🔄 Converting PDF to image for OCR...');
  
  const result = await pdfProcessor.processFirstPageOnly(file);
  
  if (!result.success || result.pages.length === 0) {
    throw new Error(`PDF processing failed: ${result.error || 'Unknown error'}`);
  }
  
  // Convert the first page to a File object
  const page = result.pages[0];
  const response = await fetch(page.imageDataUrl);
  const blob = await response.blob();
  
  // Create a new File object with PNG format
  const imageFile = new File([blob], `${file.name}_page1.png`, {
    type: 'image/png',
    lastModified: Date.now()
  });
  
  console.log(`✅ PDF converted to image: ${imageFile.size} bytes, ${page.width}x${page.height}px`);
  return imageFile;
}

// Fix common OCR errors in Lithuanian text
function fixOCRErrors(name: string): string {
  return name
    // Common OCR mistakes for specific products
    .replace(/mėzio\s+angl/gi, 'medžio anglys')
    .replace(/Get\s+red\s+medžio\s+angl/gi, 'Get red medžio anglys')
    .replace(/Gaz-gazuotis/gi, 'Gazuotas')
    .replace(/aitriapiprikos/gi, 'aitriųjų paprikų')
    .replace(/jalapeno\s+aitriapiprikos/gi, 'jalapeño aitriųjų paprikų')
    // Common character mistakes
    .replace(/Mės\./gi, 'Mėsainių')
    .replace(/padazas/gi, 'padažas')
    .trim();
}

// Sanitize product names
function sanitizeProductName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  // Fix OCR errors first
  const fixed = fixOCRErrors(name);
  
  return fixed
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['′]/g, "'")
    .replace(/[–—]/g, '-');
}

// Normalize units
function normalizeUnit(unit: string): string {
  if (!unit || typeof unit !== 'string') return 'pcs';
  
  const unitLower = unit.toLowerCase().trim();
  const unitMap: { [key: string]: string } = {
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'l': 'l', 'liter': 'l', 'litre': 'l', 'liters': 'l', 'litres': 'l',
    'ml': 'ml', 'milliliter': 'ml', 'millilitre': 'ml',
    'pcs': 'pcs', 'pc': 'pcs', 'piece': 'pcs', 'pieces': 'pcs',
    'vnt': 'pcs', 'unit': 'pcs', 'units': 'pcs',
    'm': 'm', 'meter': 'm', 'metre': 'm', 'meters': 'm', 'metres': 'm',
    'cm': 'cm', 'centimeter': 'cm', 'centimetre': 'cm'
  };

  return unitMap[unitLower] || 'pcs';
}

// Parse numbers
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[^\d.,-]/g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// Extract invoice data using the best available OCR service with intelligent fallback
export async function extractInvoiceData(file: File): Promise<InvoiceProcessingResult & {
  processingInfo?: {
    service: string;
    model?: string;
    attempts?: any[];
    azureError?: string;
  }
}> {
  const processingInfo: any = {};
  
  // Handle PDF files - try direct text extraction first (much more accurate)
  let processedFile = file;
  if (PDFProcessor.isPDFFile(file)) {
    console.log('📄 PDF file detected, trying direct text extraction first...');
    
    const validation = PDFProcessor.validatePDFFile(file);
    if (!validation.valid) {
      throw new Error(`Invalid PDF file: ${validation.error}`);
    }
    
    try {
      // Try direct text extraction first
      const extractedText = await TextExtractor.extractTextFromPDF(file);
      
      // Check if extracted text is garbled/corrupted (Lidl PDFs have broken text layer)
      const isGarbled = (TextExtractor as any).isTextGarbled(extractedText);
      
      if (isGarbled) {
        console.warn('🚨 Detected garbled PDF text layer - falling back to OCR');
        throw new Error('Garbled text extraction - will use OCR fallback');
      }
      
      const parsedData = TextExtractor.parseInvoiceFromText(extractedText);
      
      console.log('📝 Direct text extraction results:', {
        productCount: parsedData.products.length,
        products: parsedData.products.map(p => p.productName)
      });

      if (parsedData.products.length > 0) {
        console.log('✅ Using direct PDF text extraction (structured table parsing)');

        processingInfo.service = 'PDF Text Extraction';
        processingInfo.parser = 'pdf-text-layer';
        processingInfo.pdfTextExtraction = true;

        const nowIso = new Date().toISOString();
        const invoiceNumber = parsedData.invoice?.invoiceNumber || 'PDF-INVOICE';
        const invoiceDate = parsedData.invoice?.invoiceDate || new Date().toISOString().split('T')[0];

        const lineItems = parsedData.products.map((product, index) => {
          const sanitizedName = sanitizeProductName(product.productName || product.description || `Product ${index + 1}`);
          const description = sanitizeProductName(product.description || product.productName || sanitizedName);
          const quantity = parseNumber(product.quantity ?? 1) || 1;
          const unitPrice = parseNumber(product.unitPrice ?? 0);
          const computedTotal = Math.round(quantity * unitPrice * 100) / 100;
          const totalPrice = parseNumber(product.totalPrice ?? computedTotal) || computedTotal;

          const lineItem = {
            productName: sanitizedName,
            description,
            quantity,
            unit: normalizeUnit(product.unit || 'pcs'),
            unitPrice,
            totalPrice,
            vatRate: typeof product.vatRate === 'number' ? product.vatRate : 21,
            needsReview: false,
            notes: product.expiryDate ? `Use by ${product.expiryDate}` : undefined,
            createdAt: nowIso,
            updatedAt: nowIso
          };
          
          console.log(`📋 Line item ${index + 1}:`, lineItem);
          return lineItem;
        });

        const computedLineTotal = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const productsDiscountTotal = parsedData.products.reduce((sum, product) => sum + (product.discountAmount || 0), 0);

        const totalExclVat = parseNumber(parsedData.invoice?.totalExclVat ?? computedLineTotal);
        const vatAmount = parsedData.invoice?.vatAmount !== undefined
          ? parseNumber(parsedData.invoice.vatAmount)
          : (parsedData.invoice?.totalInclVat !== undefined
            ? parseNumber(parsedData.invoice.totalInclVat) - totalExclVat
            : 0);
        const totalInclVat = parsedData.invoice?.totalInclVat !== undefined
          ? parseNumber(parsedData.invoice.totalInclVat)
          : totalExclVat + vatAmount;
        const discountAmount = parseNumber(parsedData.invoice?.discountAmount ?? productsDiscountTotal);

        const toCurrency = (value: number) => Math.round(value * 100) / 100;

        const matches = await findProductMatches(lineItems);

        return {
          invoice: {
            invoiceNumber,
            invoiceDate,
            totalExclVat: toCurrency(totalExclVat),
            totalInclVat: toCurrency(totalInclVat),
            vatAmount: toCurrency(vatAmount),
            discountAmount: toCurrency(discountAmount),
            currency: 'EUR' as const,
            status: 'review' as const,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            extractedData: {
              parser: 'pdf-text-extraction',
              rawText: parsedData.rawText,
              products: parsedData.products,
              invoice: parsedData.invoice
            },
            createdAt: nowIso,
            updatedAt: nowIso
          },
          lineItems,
          matches,
          errors: [],
          warnings: ['Processed using PDF text extraction'],
          supplierInfo: parsedData.supplier ? {
            name: parsedData.supplier.name
          } : undefined,
          processingInfo: {
            ...processingInfo
          }
        };
      }
    } catch (error) {
      console.warn('📄 Direct text extraction failed, falling back to image conversion:', error);
    }
    
    // Fallback to image conversion for vision OCR
    try {
      console.log('🔄 Converting PDF to image for OCR...');
      processedFile = await processPDFFile(file);
      processingInfo.pdfProcessed = true;
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Try Azure Document Intelligence first (specialized for invoices)
  console.log('🔍 Checking Azure availability:', {
    endpoint: import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ? 'SET' : 'NOT SET',
    key: import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY ? 'SET' : 'NOT SET',
    available: isAzureDocumentIntelligenceAvailable()
  });
  
  if (isAzureDocumentIntelligenceAvailable()) {
    console.log('🔵 Using Azure Document Intelligence for OCR');
    try {
      const azureService = createAzureDocumentIntelligenceService();
      if (azureService) {
        const result = await azureService.analyzeInvoice(processedFile);
        result.matches = await findProductMatches(result.lineItems);
        
        return {
          ...result,
          processingInfo: {
            service: 'Azure Document Intelligence',
            model: 'prebuilt-invoice',
            ...processingInfo
          }
        };
      }
    } catch (error) {
      console.warn('Azure Document Intelligence failed, falling back to OpenAI:', error);
      processingInfo.azureError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Fallback to OpenAI Multi-Model System
  if (!isOpenAIAvailable()) {
    throw new Error('No OCR service configured. Please set VITE_OPENAI_API_KEY or VITE_AZURE_DOCUMENT_INTELLIGENCE_* environment variables.');
  }

  console.log('🟡 Using OpenAI Multi-Model System for OCR');
  
  try {
    const { result, modelUsed, attempts } = await openaiInvoiceProcessor.processInvoiceWithFallback(processedFile);
    result.matches = await findProductMatches(result.lineItems);

    return {
      ...result,
        processingInfo: {
          service: 'OpenAI',
          model: modelUsed,
          attempts,
          ...processingInfo
        }
    };
  } catch (error) {
    console.error('All OCR services failed:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Find matching products for invoice line items
export async function findProductMatches(lineItems: Partial<InvoiceLineItem>[]): Promise<{ [lineItemIndex: number]: ProductMatch[] }> {
  try {
    const products = await listProducts();
    const matches: { [lineItemIndex: number]: ProductMatch[] } = {};

    for (let i = 0; i < lineItems.length; i++) {
      const lineItem = lineItems[i];
      if (!lineItem.productName) continue;

      const productMatches = findSimilarProducts(lineItem.productName, products);
      if (productMatches.length > 0) {
        matches[i] = productMatches;
      }
    }

    return matches;
  } catch (error) {
    console.error('Error finding product matches:', error);
    return {};
  }
}

// Simple fuzzy matching algorithm
function findSimilarProducts(searchName: string, products: Product[]): ProductMatch[] {
  const normalize = (s: string) => s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // remove punctuation
    .replace(/\b(kg|g|l|ml|pcs|piece|pc|vnt|pack|unit|units)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stripNumbers = (s: string) => s.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim();

  const searchNorm = normalize(searchName);
  const searchNoNum = stripNumbers(searchNorm);
  const searchTokens = new Set(searchNoNum.split(' ').filter(Boolean));

  const matches: ProductMatch[] = [];

  for (const product of products) {
    const nameNorm = normalize(product.name);
    const skuNorm = normalize(product.sku);
    const nameNoNum = stripNumbers(nameNorm);
    const nameTokens = new Set(nameNoNum.split(' ').filter(Boolean));

    let confidence = 0;
    let reason = '';

    if (nameNorm === searchNorm || skuNorm === searchNorm) {
      confidence = 1.0;
      reason = 'Exact match';
    } else {
      // Token Jaccard similarity
      const intersectionSize = [...searchTokens].filter(t => nameTokens.has(t)).length;
      const unionSize = new Set([...searchTokens, ...nameTokens]).size || 1;
      const jaccard = intersectionSize / unionSize;

      // Prefix boost if one starts with the other
      const prefixBoost = nameNoNum.startsWith(searchNoNum) || searchNoNum.startsWith(nameNoNum) ? 0.2 : 0;

      confidence = Math.min(1, jaccard + prefixBoost);
      reason = `Token similarity ${(jaccard * 100).toFixed(0)}%` + (prefixBoost ? ' + prefix' : '');
    }

    if (confidence >= 0.7) {
      matches.push({ productId: product.id, product, confidence, reason });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}