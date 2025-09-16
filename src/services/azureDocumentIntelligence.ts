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

  async analyzeInvoice(file: File): Promise<InvoiceProcessingResult> {
    try {
      // Step 1: Submit document for analysis
      const analyzeUrl = `${this.config.endpoint}/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=2023-07-31`;
      
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
    if (!items?.values) return [];

    return items.values.map((item: any, index: number) => {
      const props = item.properties || {};
      return {
        productName: props.Description?.value || `Product ${index + 1}`,
        description: '',
        quantity: props.Quantity?.value || 1,
        unit: this.normalizeUnit(props.Unit?.value) || 'pcs',
        unitPrice: props.UnitPrice?.value || 0,
        totalPrice: props.Amount?.value || 0,
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
  return !!(import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && 
           import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY);
}
