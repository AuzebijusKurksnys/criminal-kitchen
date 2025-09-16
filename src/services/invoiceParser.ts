import OpenAI from 'openai';
import type { InvoiceLineItem, InvoiceProcessingResult, Product, ProductMatch } from '../data/types';
import { listProducts } from '../data/store';

// OpenAI client - will be initialized with user's API key
let openaiClient: OpenAI | null = null;

export function initializeOpenAI(apiKey: string): void {
  openaiClient = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Only for demo purposes
  });
}

export function isOpenAIInitialized(): boolean {
  return openaiClient !== null;
}

// Convert file to base64 for OpenAI Vision API
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Normalize and sanitize product names extracted from OCR to reduce noise
function sanitizeProductName(rawName: string | undefined | null): string {
  if (!rawName) return '';
  let name = String(rawName)
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/[\u00AD\u200B\u200C\u200D]/g, '') // soft hyphens/zero-width
    .trim();
  // Remove SKU-like trailing codes and parentheses-only tails
  name = name.replace(/\s*[#(\[]?[A-Z0-9_-]{4,}[)\]]?\s*$/i, '').trim();
  // If name is mostly digits/symbols, consider it unknown
  const alnum = name.replace(/[^\p{L}\p{N}]/gu, '');
  const digits = name.replace(/[^0-9]/g, '');
  if (!alnum || (digits.length > 0 && digits.length / Math.max(1, alnum.length) > 0.6)) {
    return '';
  }
  return name;
}

// Parse numbers robustly (handle commas and currency symbols)
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (value == null) return 0;
  const cleaned = String(value)
    .replace(/[^0-9,.-]/g, '')
    .replace(/,(?=\d{3}(\D|$))/g, '') // remove thousand separators
    .replace(',', '.'); // decimal comma to dot
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Extract invoice data using OpenAI Vision API
export async function extractInvoiceData(file: File): Promise<InvoiceProcessingResult> {
  if (!openaiClient) {
    throw new Error('OpenAI not initialized. Please configure your API key in settings.');
  }

  try {
    const base64Image = await fileToBase64(file);
    const mimeType = file.type;

    const prompt = `
You are an expert invoice OCR specialist with advanced text recognition capabilities. Analyze this invoice image with EXTREME PRECISION and extract ALL data.

REQUIRED JSON STRUCTURE:
{
  "invoice": {
    "invoiceNumber": "exact invoice number",
    "invoiceDate": "YYYY-MM-DD format",
    "supplierName": "exact company name",
    "supplierEmail": "email if visible",
    "supplierPhone": "phone if visible",
    "totalExclVat": number,
    "totalInclVat": number,
    "vatAmount": number,
    "discountAmount": number,
    "currency": "EUR"
  },
  "lineItems": [
    {
      "productName": "exact product name as written",
      "description": "additional details if any",
      "quantity": number,
      "unit": "exact unit (kg/pcs/l/ml/g/etc)",
      "unitPrice": number,
      "totalPrice": number,
      "vatRate": number
    }
  ]
}

CRITICAL EXTRACTION RULES:
1. SYSTEMATIC SCANNING: Start from top-left, read systematically across and down the entire document
2. PDF TEXT EXTRACTION: If this is a PDF, focus on text layers first, then visual elements
3. HANDLE POOR QUALITY: For blurry/low-quality images, apply advanced OCR techniques:
   - Look for patterns in tables and structured data
   - Cross-reference numbers for consistency
   - Use context clues from surrounding text
4. EXACT TRANSCRIPTION: Copy text exactly as written, preserve special characters and accents
5. NUMBER PARSING: Remove €, $, currencies, commas, spaces - convert to pure decimal numbers
6. DATE FORMATS: Convert all date formats to YYYY-MM-DD:
   - DD/MM/YYYY → YYYY-MM-DD
   - DD.MM.YYYY → YYYY-MM-DD
   - YYYY-MM-DD (keep as is)
7. UNITS STANDARDIZATION: Extract exact units, handle common variations:
   - vnt./pcs./pc./piece → pcs
   - kg/kilogram → kg
   - l/liter/litre → l
   - ml/milliliter → ml
8. VAT HANDLING: Calculate VAT if not explicitly shown, common rates: 0%, 5%, 9%, 21%
9. MULTI-LANGUAGE SUPPORT:
   - Lithuanian: PVM=VAT, Data=Date, Suma=Total, Kiekis=Quantity
   - English: VAT, Date, Total, Quantity
   - Handle mixed language invoices
10. TABLE EXTRACTION: Identify and parse tabular data:
    - Product/service descriptions
    - Quantities and units
    - Unit prices and total prices
    - VAT rates per line item

ADVANCED OCR TECHNIQUES FOR POOR QUALITY:
- For blurred numbers: Look for digit patterns and context
- For skewed text: Apply perspective correction mentally
- For faded text: Use surrounding context to infer missing characters
- For overlapping text: Separate overlaid elements
- For handwritten annotations: Focus on printed text, ignore handwriting unless it's the main content

QUALITY ASSURANCE:
- Mathematical validation: Line items must sum to invoice totals (±0.02 tolerance for rounding)
- Date validation: Ensure dates are realistic (not in future, not before 1990)
- VAT consistency: Check if VAT calculations are correct across line items
- Currency consistency: All amounts should use the same currency
- Completeness check: Ensure no line items are missed from tables

ERROR HANDLING:
- If text is completely unreadable, mark field as null but continue extraction
- If numbers are unclear, provide best estimate with context
- If structure is unclear, follow the most logical interpretation
- Always extract maximum possible data even if some fields are incomplete

Extract EVERYTHING visible with maximum accuracy. Quality over speed - take time to analyze each section thoroughly.
`;

    const isPDF = mimeType === 'application/pdf';
    
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a highly accurate invoice data extraction specialist. You MUST extract every piece of information from invoices with 100% accuracy. Return only valid JSON.
          
          ${isPDF ? 'SPECIAL INSTRUCTIONS FOR PDF: This is a PDF file rendered as an image. PDF invoices often have very clean text and structured layouts. Pay extra attention to text layers, table structures, and precise number formatting. PDFs typically have higher text quality than photos.' : 'SPECIAL INSTRUCTIONS FOR IMAGE: This appears to be a photo or image scan. Apply advanced OCR techniques for potentially unclear text, lighting variations, and perspective distortion.'}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4000, // Increased for complex invoices
      temperature: 0, // Zero temperature for maximum consistency
      response_format: { type: "json_object" } // Ensure JSON response
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove any markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonString);
      
      // Validate required structure
      if (!extractedData.invoice || !extractedData.lineItems) {
        throw new Error('Invalid response structure: missing invoice or lineItems');
      }
      
      console.log('OpenAI extraction successful:', {
        invoiceNumber: extractedData.invoice?.invoiceNumber,
        lineItemsCount: extractedData.lineItems?.length || 0,
        totalInclVat: extractedData.invoice?.totalInclVat
      });
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', {
        content: content.substring(0, 500) + '...',
        error: parseError
      });
      throw new Error(`Failed to parse invoice data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}. Please try again or check the image quality.`);
    }

    // Validate and transform the extracted data
    const result: InvoiceProcessingResult = {
      invoice: {
        invoiceNumber: sanitizeProductName(extractedData.invoice?.invoiceNumber) || `INV-${Date.now()}`,
        invoiceDate: extractedData.invoice?.invoiceDate || new Date().toISOString().split('T')[0],
        totalExclVat: parseNumber(extractedData.invoice?.totalExclVat) || 0,
        totalInclVat: parseNumber(extractedData.invoice?.totalInclVat) || 0,
        vatAmount: parseNumber(extractedData.invoice?.vatAmount) || 0,
        discountAmount: parseNumber(extractedData.invoice?.discountAmount) || 0,
        currency: extractedData.invoice?.currency || 'EUR',
        status: 'review' as const,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        extractedData: extractedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      lineItems: (extractedData.lineItems || []).map((item: any, index: number) => {
        const sanitizedName = sanitizeProductName(item.productName);
        return {
          productName: sanitizedName || `Product ${index + 1}`,
          description: item.description || '',
          quantity: parseNumber(item.quantity) || 1,
          unit: item.unit || 'pcs',
          unitPrice: parseNumber(item.unitPrice) || 0,
          totalPrice: parseNumber(item.totalPrice) || 0,
          vatRate: parseNumber(item.vatRate) || 21,
          needsReview: !sanitizedName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }),
      matches: {},
      errors: [],
      warnings: []
    };

    // Add supplier information to invoice if extracted
    if (extractedData.invoice?.supplierName) {
      result.supplierInfo = {
        name: extractedData.invoice.supplierName,
        email: extractedData.invoice.supplierEmail || '',
        phone: extractedData.invoice.supplierPhone || ''
      };
    }

    // Calculate VAT amount if not provided
    if (result.invoice.vatAmount === 0 && (result.invoice.totalInclVat || 0) > (result.invoice.totalExclVat || 0)) {
      result.invoice.vatAmount = (result.invoice.totalInclVat || 0) - (result.invoice.totalExclVat || 0);
    }

    // Validate totals
    const lineItemsTotal = result.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const invoiceTotal = result.invoice.totalExclVat || 0;
    if (Math.abs(lineItemsTotal - invoiceTotal) > 0.01) {
      result.warnings.push(`Line items total (${lineItemsTotal.toFixed(2)}) doesn't match invoice total (${invoiceTotal.toFixed(2)})`);
    }

    // Find product matches
    result.matches = await findProductMatches(result.lineItems);

    return result;

  } catch (error) {
    console.error('Error extracting invoice data:', error);
    throw new Error(`Failed to extract invoice data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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


