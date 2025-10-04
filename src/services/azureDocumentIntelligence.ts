// Azure Document Intelligence service for invoice OCR
import type { InvoiceProcessingResult } from '../data/types';
import { cleanSupplierName } from '../utils/supplierNameUtils';

interface AzureDocumentIntelligenceConfig {
  endpoint: string;
  apiKey: string;
}

// Global rate limiter to prevent overwhelming Azure APIs
class AzureRateLimiter {
  private static instance: AzureRateLimiter;
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly minInterval = 2000; // Minimum 2 seconds between requests

  static getInstance(): AzureRateLimiter {
    if (!AzureRateLimiter.instance) {
      AzureRateLimiter.instance = new AzureRateLimiter();
    }
    return AzureRateLimiter.instance;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        console.log(`⏳ Rate limiter: waiting ${waitTime}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const operation = this.queue.shift();
      if (operation) {
        this.lastRequestTime = Date.now();
        await operation();
      }
    }

    this.isProcessing = false;
  }
}

interface AzureAnalysisResult {
  status: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  analyzeResult?: {
    apiVersion?: string;
    modelId?: string;
    stringIndexType?: string;
    content?: string;
    pages?: any[];
    documents: Array<{
      docType: string;
      fields: {
        VendorName?: { value?: string; content?: string };
        VendorAddress?: { value?: string; content?: string };
        InvoiceId?: { value?: string; content?: string };
        InvoiceDate?: { value?: string; content?: string };
        DueDate?: { value?: string; content?: string };
        InvoiceTotal?: { value?: number; content?: string };
        AmountDue?: { value?: number; content?: string };
        SubTotal?: { value?: number; content?: string };
        TotalTax?: { value?: number; content?: string };
        Items?: {
          values?: Array<{
            properties: {
              Description?: { value?: string; content?: string };
              Quantity?: { value?: number; content?: string };
              Unit?: { value?: string; content?: string };
              UnitPrice?: { value?: number; content?: string };
              Amount?: { value?: number; content?: string };
            };
          }>;
          valueArray?: Array<any>;
        };
      };
    }>;
  };
}

export class AzureDocumentIntelligenceService {
  private config: AzureDocumentIntelligenceConfig;

  constructor(config: AzureDocumentIntelligenceConfig) {
    this.config = config;
  }

  // Try multiple Azure models with intelligent fallback and retry logic
  async analyzeInvoice(file: File): Promise<InvoiceProcessingResult> {
    const rateLimiter = AzureRateLimiter.getInstance();
    
    return rateLimiter.execute(async () => {
      const models = [
        'prebuilt-invoice',      // Specialized invoice model (best for standard invoices)
        'prebuilt-document',     // General document model (fallback for unusual layouts)
        'prebuilt-layout'        // Layout model (last resort - extracts all text/tables)
      ];

      let lastError: Error | null = null;

      for (const model of models) {
        try {
          console.log(`🔵 Trying Azure model: ${model}`);
          return await this.analyzeWithRetry(file, model);
        } catch (error) {
          console.warn(`❌ Azure model ${model} failed:`, error);
          lastError = error as Error;
          
          // If it's a rate limit error, wait longer before trying next model
          if (error instanceof Error && error.message.includes('429')) {
            console.log('⏳ Rate limit hit, waiting 10 seconds before trying next model...');
            await new Promise(resolve => setTimeout(resolve, 10000));
          } else {
            // For other errors, wait briefly before trying next model
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      throw lastError || new Error('All Azure models failed');
    });
  }

  private async analyzeWithRetry(file: File, model: string, maxRetries: number = 5): Promise<InvoiceProcessingResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Azure ${model} attempt ${attempt}/${maxRetries}`);
        return await this.analyzeWithModel(file, model);
      } catch (error) {
        console.warn(`❌ Azure ${model} attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate wait time with exponential backoff and jitter
        let waitTime: number;
        
        if (error instanceof Error && error.message.includes('429')) {
          // For rate limit errors, use longer exponential backoff with jitter
          const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Cap at 30 seconds
          const jitter = Math.random() * 1000; // Add up to 1 second of jitter
          waitTime = baseDelay + jitter;
          console.log(`⏳ Rate limit hit, waiting ${Math.round(waitTime)}ms before retry...`);
        } else {
          // For other errors, use shorter backoff
          const baseDelay = Math.min(500 * Math.pow(1.5, attempt - 1), 5000); // Cap at 5 seconds
          const jitter = Math.random() * 500; // Add up to 0.5 seconds of jitter
          waitTime = baseDelay + jitter;
          console.log(`⏳ Error occurred, waiting ${Math.round(waitTime)}ms before retry...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw new Error(`Azure ${model} failed after ${maxRetries} attempts`);
  }

  private async analyzeWithModel(file: File, model: string): Promise<InvoiceProcessingResult> {
    try {
      // Step 1: Submit document for analysis
      const analyzeUrl = `${this.config.endpoint}/formrecognizer/documentModels/${model}:analyze?api-version=2023-07-31`;
      
      const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey,
          'Content-Type': 'application/octet-stream'
        },
        body: file
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text().catch(() => 'Unknown error');
        throw new Error(`Azure Document Intelligence error: ${analyzeResponse.status} - ${errorText}`);
      }

      // Get operation location from response headers
      const operationLocation = analyzeResponse.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('No operation location returned from Azure');
      }

      // Step 2: Poll for results
      const result = await this.pollForResults(operationLocation);

      // Step 3: Transform Azure results to our format
      return this.transformResults(result, file);

    } catch (error) {
      console.error('Azure Document Intelligence error:', error);
      throw new Error(`Failed to analyze invoice with Azure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async pollForResults(operationLocation: string): Promise<AzureAnalysisResult> {
    const maxAttempts = 30; // 5 minutes max
    const pollInterval = 2000; // 2 seconds (faster polling)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Polling error: ${response.status} - ${errorText}`);
      }

      const result: AzureAnalysisResult = await response.json();

      if (result.status === 'succeeded') {
        return result;
      } else if (result.status === 'failed') {
        throw new Error('Azure Document Intelligence analysis failed');
      }

      // Use exponential backoff: start fast, slow down later
      const backoffDelay = Math.min(pollInterval * Math.pow(1.5, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }

    throw new Error('Azure Document Intelligence analysis timed out');
  }

  private transformResults(azureResult: AzureAnalysisResult, file: File): InvoiceProcessingResult {
    const document = azureResult.analyzeResult?.documents?.[0];
    if (!document) {
      throw new Error('No document found in Azure results');
    }

    const fields = document.fields;
    
    // Debug: Log what Azure actually returned
    console.log('📊 Azure returned fields:', Object.keys(fields));
    console.log('📦 Azure Items field:', fields.Items);
    console.log('📋 Full Azure result:', JSON.stringify(azureResult, null, 2));

    // Helper to parse European number format for totals
    const parseTotal = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/\s/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return value || 0;
    };

    // Transform to our format
    const result: InvoiceProcessingResult = {
      invoice: {
        invoiceNumber: fields.InvoiceId?.value || fields.InvoiceId?.content || `INV-${Date.now()}`,
        invoiceDate: this.parseDate(fields.InvoiceDate?.value || fields.InvoiceDate?.content) || new Date().toISOString().split('T')[0],
        totalExclVat: parseTotal(fields.SubTotal?.value || fields.SubTotal?.content),
        totalInclVat: parseTotal(fields.InvoiceTotal?.value || fields.InvoiceTotal?.content),
        vatAmount: parseTotal(fields.TotalTax?.value || fields.TotalTax?.content),
        discountAmount: 0,
        currency: 'EUR', // Azure doesn't always detect currency
        status: 'review' as const,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        extractedData: azureResult,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      lineItems: this.extractLineItems(fields.Items),
      matches: {},
      errors: [],
      warnings: []
    };

    // Add supplier info if available
    // Azure's VendorName field might only have abbreviated name - look for full name in content
    let vendorName = fields.VendorName?.value || fields.VendorName?.content;
    
    // Clean up supplier name to remove unnecessary details
    vendorName = cleanSupplierName(vendorName);
    
    // If vendor name is too short (like "LiDL"), try to find full company name in raw content
    if (vendorName && vendorName.length < 10) {
      const content = azureResult.analyzeResult?.content || '';
      
      // Try multiple patterns:
      // 1. Lithuanian company types: UAB, MB, AB, IĮ, VšĮ, TŪB, KŪB, etc.
      const lithuanianMatch = content.match(/(UAB|MB|AB|I[IĮ]|V[Ss][IĮ]|T[UŪ]B|K[UŪ]B)\s+[^\n]+/i);
      
      // 2. International patterns: Ltd, LLC, Inc, GmbH, S.A., etc.
      const internationalMatch = content.match(/[A-Z][a-zA-Z\s&.'-]+\s+(Ltd|LLC|Inc|Corp|GmbH|S\.?A\.?|B\.?V\.?|AG|AS|Oy|AB|ApS|S\.?r\.?l\.?|Sp\.\s*z\s*o\.?o\.?)[^\n]*/i);
      
      // 3. Generic: Look for "Tiekėjas" (Supplier) label followed by company name
      const supplierMatch = content.match(/Tiek[eė]jas[:\s]+([^\n]+)/i);
      
      if (lithuanianMatch) {
        vendorName = cleanSupplierName(lithuanianMatch[0].trim());
        console.log('📝 Found Lithuanian company name:', vendorName);
      } else if (internationalMatch) {
        vendorName = cleanSupplierName(internationalMatch[0].trim());
        console.log('📝 Found international company name:', vendorName);
      } else if (supplierMatch) {
        vendorName = cleanSupplierName(supplierMatch[1].trim());
        console.log('📝 Found supplier name from label:', vendorName);
      }
    }
    
    if (vendorName) {
      console.log('✅ Setting supplierInfo:', vendorName);
      result.supplierInfo = {
        name: vendorName,
        email: '',
        phone: ''
      };
    } else {
      console.warn('⚠️ No VendorName found in Azure response');
    }

    return result;
  }

  private extractLineItems(items: any): any[] {
    // Azure can return items in either 'values' or 'valueArray' depending on the model
    const itemArray = items?.valueArray || items?.values || [];
    
    console.log('🔍 Extracting line items:', {
      hasValueArray: !!items?.valueArray,
      hasValues: !!items?.values,
      itemCount: itemArray.length,
      firstItem: itemArray[0]
    });
    
    if (!itemArray.length) {
      console.warn('⚠️ No items found in Azure response');
      return [];
    }

    return itemArray.map((item: any, index: number) => {
      // Azure prebuilt-invoice model uses 'valueObject' with 'content' sub-fields
      const itemObj = item.valueObject || item.properties || item;
      const props = itemObj.content || itemObj;
      
      console.log(`📦 Item ${index + 1}:`, {
        raw: item,
        props: props,
        description: props.Description?.content || props.Description?.value,
        quantity: props.Quantity?.content || props.Quantity?.value,
        amount: props.Amount?.content || props.Amount?.value
      });
      
      // Helper to parse European number format (comma as decimal separator)
      const parseEuropeanNumber = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Replace comma with dot for European format, remove spaces
          const cleaned = value.replace(/\s/g, '').replace(',', '.');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };
      
      const productName = props.Description?.content || props.Description?.value || `Product ${index + 1}`;
      const extractedUnit = props.Unit?.content || props.Unit?.value;
      const normalizedUnit = this.normalizeUnit(extractedUnit);
      
      // Smart unit detection based on product name if unit seems wrong
      const smartUnit = this.getSmartUnit(productName, normalizedUnit, parseEuropeanNumber(props.Quantity?.content || props.Quantity?.value || '1'));
      
      return {
        productName,
        description: '',
        quantity: parseEuropeanNumber(props.Quantity?.content || props.Quantity?.value || '1') || 1,
        unit: smartUnit,
        unitPrice: parseEuropeanNumber(props.UnitPrice?.content || props.UnitPrice?.value || '0') || 0,
        totalPrice: parseEuropeanNumber(props.Amount?.content || props.Amount?.value || '0') || 0,
        vatRate: 21, // Default VAT rate
        needsReview: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }

  private parseDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  private normalizeUnit(unit: string | undefined): string {
    if (!unit) return 'pcs';
    
    // Remove periods and normalize
    const cleaned = unit.toLowerCase().trim().replace(/\./g, '');
    const unitMap: { [key: string]: string } = {
      // Weight units
      'kg': 'kg',
      'kilogram': 'kg',
      'g': 'g',
      'gram': 'g',
      'grams': 'g',
      
      // Volume units
      'l': 'l',
      'liter': 'l',
      'litre': 'l',
      'liters': 'l',
      'litres': 'l',
      'ml': 'ml',
      'milliliter': 'ml',
      'milliliters': 'ml',
      
      // Piece/unit units (Lithuanian: vnt = vienetai = pieces)
      'pcs': 'pcs',
      'pc': 'pcs',
      'piece': 'pcs',
      'pieces': 'pcs',
      'vnt': 'pcs',           // Lithuanian: vienetai
      'vienetai': 'pcs',      // Lithuanian: pieces
      'unit': 'pcs',
      'units': 'pcs',
      'item': 'pcs',
      'items': 'pcs'
    };

    return unitMap[cleaned] || 'pcs';
  }


  private getSmartUnit(productName: string, extractedUnit: string, quantity: number): string {
    const name = productName.toLowerCase();
    
    // If we have a clear unit from invoice, use it
    if (extractedUnit && extractedUnit !== 'pcs') {
      return extractedUnit;
    }
    
    // Smart detection based on product name patterns
    const vegetableKeywords = [
      'agurkai', 'pomidorai', 'kopūstai', 'morkos', 'bulvės', 'svogūnai',
      'česnakai', 'pipirai', 'salotos', 'žalumynai', 'daržovės',
      'cucumber', 'tomato', 'cabbage', 'carrot', 'potato', 'onion', 'garlic'
    ];
    
    const liquidKeywords = [
      'sultys', 'gėrimas', 'pienas', 'aliejus', 'sirupas', 'padažas',
      'juice', 'drink', 'milk', 'oil', 'syrup', 'sauce'
    ];
    
    const meatKeywords = [
      'mėsa', 'kumpis', 'šoninė', 'dešra', 'kumpis', 'kiaušiniai',
      'meat', 'ham', 'bacon', 'sausage', 'eggs'
    ];
    
    // Check for vegetables - likely kg
    if (vegetableKeywords.some(keyword => name.includes(keyword))) {
      // If quantity is very small (like 0.08), it's probably kg
      if (quantity < 1 && quantity > 0.01) {
        return 'kg';
      }
      // If quantity is large whole numbers, it might be pieces
      if (quantity >= 1 && quantity === Math.floor(quantity)) {
        return 'pcs';
      }
      // Default to kg for vegetables
      return 'kg';
    }
    
    // Check for liquids - likely l or ml
    if (liquidKeywords.some(keyword => name.includes(keyword))) {
      if (quantity < 1) {
        return 'l';
      } else if (quantity < 10) {
        return 'l';
      } else {
        return 'ml';
      }
    }
    
    // Check for meat - likely kg
    if (meatKeywords.some(keyword => name.includes(keyword))) {
      return quantity < 1 ? 'kg' : 'pcs';
    }
    
    // Default behavior - if quantity is very small, probably kg
    if (quantity < 1 && quantity > 0.01) {
      return 'kg';
    }
    
    // Default to pieces
    return extractedUnit || 'pcs';
  }
}

// Factory function to create Azure service
export function createAzureDocumentIntelligenceService(): AzureDocumentIntelligenceService | null {
  const endpoint = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !apiKey) {
    console.warn('Azure Document Intelligence not configured');
    return null;
  }

  return new AzureDocumentIntelligenceService({ endpoint, apiKey });
}

// Check if Azure Document Intelligence is available
export function isAzureDocumentIntelligenceAvailable(): boolean {
  const endpoint = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY;
  
  console.log('🔍 Azure Environment Variables Check:', {
    endpoint: endpoint ? `SET (${endpoint.substring(0, 30)}...)` : 'NOT SET',
    key: key ? `SET (${key.substring(0, 10)}...)` : 'NOT SET',
    available: !!(endpoint && key)
  });
  
  return !!(endpoint && key);
}
