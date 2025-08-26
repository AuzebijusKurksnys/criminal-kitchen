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

// Extract invoice data using OpenAI Vision API
export async function extractInvoiceData(file: File): Promise<InvoiceProcessingResult> {
  if (!openaiClient) {
    throw new Error('OpenAI not initialized. Please configure your API key in settings.');
  }

  try {
    const base64Image = await fileToBase64(file);
    const mimeType = file.type;

    const prompt = `
You are an expert invoice OCR specialist. Analyze this invoice image with EXTREME PRECISION and extract ALL data.

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
1. READ EVERY LINE: Scan the entire invoice systematically - header, body, footer
2. EXACT TRANSCRIPTION: Copy text exactly as written, including special characters
3. NUMBERS ONLY: Remove €, $, currencies, commas - convert to pure numbers
4. DATE FORMAT: Always convert dates to YYYY-MM-DD (e.g., 2025-01-15)
5. UNITS: Extract exact units as written (kg, vnt, l, ml, etc.)
6. VAT CALCULATION: If VAT % not shown, calculate from totals or use 21%
7. LINE ITEMS: Include EVERY product/service line - even with partial data
8. ZERO VALUES: Use 0 for missing discounts, empty fields
9. LITHUANIAN TEXT: Handle Lithuanian invoices (PVM=VAT, Data=Date, etc.)
10. TABLE STRUCTURE: Look for itemized tables with products, quantities, prices

QUALITY CHECKS:
- Verify line items sum matches invoice total (±0.01 tolerance)
- Ensure dates are logical (not future dates unless legitimate)
- Confirm VAT calculations make sense
- Double-check all numeric values are properly extracted

Extract EVERYTHING visible. If text is unclear, make best effort but be accurate.
`;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a highly accurate invoice data extraction specialist. You MUST extract every piece of information from invoices with 100% accuracy. Return only valid JSON."
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
        invoiceNumber: extractedData.invoice?.invoiceNumber || `INV-${Date.now()}`,
        invoiceDate: extractedData.invoice?.invoiceDate || new Date().toISOString().split('T')[0],
        totalExclVat: parseFloat(extractedData.invoice?.totalExclVat) || 0,
        totalInclVat: parseFloat(extractedData.invoice?.totalInclVat) || 0,
        vatAmount: parseFloat(extractedData.invoice?.vatAmount) || 0,
        discountAmount: parseFloat(extractedData.invoice?.discountAmount) || 0,
        currency: extractedData.invoice?.currency || 'EUR',
        status: 'review' as const,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        extractedData: extractedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      lineItems: (extractedData.lineItems || []).map((item: any, index: number) => ({
        productName: item.productName || `Product ${index + 1}`,
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'pcs',
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0,
        vatRate: parseFloat(item.vatRate) || 21,
        needsReview: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
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
  const matches: ProductMatch[] = [];
  const searchLower = searchName.toLowerCase().trim();

  for (const product of products) {
    const productNameLower = product.name.toLowerCase().trim();
    const skuLower = product.sku.toLowerCase().trim();

    let confidence = 0;
    let reason = '';

    // Exact match
    if (productNameLower === searchLower || skuLower === searchLower) {
      confidence = 1.0;
      reason = 'Exact match';
    }
    // Starts with
    else if (productNameLower.startsWith(searchLower) || searchLower.startsWith(productNameLower)) {
      confidence = 0.9;
      reason = 'Name starts with match';
    }
    // Contains
    else if (productNameLower.includes(searchLower) || searchLower.includes(productNameLower)) {
      confidence = 0.8;
      reason = 'Name contains match';
    }
    // Word overlap
    else {
      const searchWords = searchLower.split(/\s+/);
      const productWords = productNameLower.split(/\s+/);
      const commonWords = searchWords.filter(word => 
        productWords.some(pWord => pWord.includes(word) || word.includes(pWord))
      );
      
      if (commonWords.length > 0) {
        confidence = (commonWords.length / Math.max(searchWords.length, productWords.length)) * 0.7;
        reason = `${commonWords.length} word(s) match`;
      }
    }

    if (confidence > 0.5) {
      matches.push({
        productId: product.id,
        product,
        confidence,
        reason
      });
    }
  }

  // Sort by confidence descending, limit to top 3
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}


