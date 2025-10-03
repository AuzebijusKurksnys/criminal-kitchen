// Azure Document Intelligence service for invoice OCR
import type { InvoiceProcessingResult } from '../data/types';

interface AzureDocumentIntelligenceConfig {
  endpoint: string;
  apiKey: string;
}

interface AzureAnalysisResult {
  status: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  analyzeResult?: {
    documents: Array<{
      docType: string;
      fields: {
        VendorName?: { value: string };
        VendorAddress?: { value: string };
        InvoiceId?: { value: string };
        InvoiceDate?: { value: string };
        DueDate?: { value: string };
        InvoiceTotal?: { value: number };
        AmountDue?: { value: number };
        SubTotal?: { value: number };
        TotalTax?: { value: number };
        Items?: {
          values: Array<{
            properties: {
              Description?: { value: string };
              Quantity?: { value: number };
              Unit?: { value: string };
              UnitPrice?: { value: number };
              Amount?: { value: number };
            };
          }>;
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

  // Try multiple Azure models with intelligent fallback
  async analyzeInvoice(file: File): Promise<InvoiceProcessingResult> {
    const models = [
      'prebuilt-invoice',      // Specialized invoice model (best for standard invoices)
      'prebuilt-document',     // General document model (fallback for unusual layouts)
      'prebuilt-layout'        // Layout model (last resort - extracts all text/tables)
    ];

    let lastError: Error | null = null;

    for (const model of models) {
      try {
        console.log(`🔵 Trying Azure model: ${model}`);
        return await this.analyzeWithModel(file, model);
      } catch (error) {
        console.warn(`❌ Azure model ${model} failed:`, error);
        lastError = error as Error;
        // Try next model
      }
    }

    throw lastError || new Error('All Azure models failed');
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
        throw new Error(`Azure Document Intelligence error: ${analyzeResponse.status}`);
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
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Polling error: ${response.status}`);
      }

      const result: AzureAnalysisResult = await response.json();

      if (result.status === 'succeeded') {
        return result;
      } else if (result.status === 'failed') {
        throw new Error('Azure Document Intelligence analysis failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
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

    // Transform to our format
    const result: InvoiceProcessingResult = {
      invoice: {
        invoiceNumber: fields.InvoiceId?.value || `INV-${Date.now()}`,
        invoiceDate: this.parseDate(fields.InvoiceDate?.value) || new Date().toISOString().split('T')[0],
        totalExclVat: (fields.SubTotal?.value || 0),
        totalInclVat: (fields.InvoiceTotal?.value || 0),
        vatAmount: (fields.TotalTax?.value || 0),
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
    if (fields.VendorName?.value) {
      result.supplierInfo = {
        name: fields.VendorName.value,
        email: '',
        phone: ''
      };
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
      
      return {
        productName: props.Description?.content || props.Description?.value || `Product ${index + 1}`,
        description: '',
        quantity: parseEuropeanNumber(props.Quantity?.content || props.Quantity?.value || '1') || 1,
        unit: this.normalizeUnit(props.Unit?.content || props.Unit?.value) || 'pcs',
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
    
    const unitLower = unit.toLowerCase().trim();
    const unitMap: { [key: string]: string } = {
      'kg': 'kg',
      'kilogram': 'kg',
      'g': 'g',
      'gram': 'g',
      'l': 'l',
      'liter': 'l',
      'litre': 'l',
      'ml': 'ml',
      'milliliter': 'ml',
      'pcs': 'pcs',
      'pc': 'pcs',
      'piece': 'pcs',
      'pieces': 'pcs',
      'vnt': 'pcs',
      'unit': 'pcs',
      'units': 'pcs'
    };

    return unitMap[unitLower] || 'pcs';
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
