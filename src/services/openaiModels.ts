// OpenAI Multiple Models Service for Invoice OCR
import OpenAI from 'openai';
import type { InvoiceProcessingResult } from '../data/types';

// OpenAI model configurations
export const OPENAI_MODELS = {
  'gpt-4o': {
    name: 'GPT-4o Vision',
    description: 'Latest vision model - best for complex invoices',
    maxTokens: 6000,
    temperature: 0.1,
    strengths: ['complex layouts', 'poor quality images', 'multi-language'],
    costPer1kTokens: 0.005
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo Vision', 
    description: 'Faster processing - good for standard invoices',
    maxTokens: 4000,
    temperature: 0.0,
    strengths: ['speed', 'standard layouts', 'consistent formatting'],
    costPer1kTokens: 0.003
  },
  'gpt-4-vision-preview': {
    name: 'GPT-4 Vision Preview',
    description: 'Reliable fallback option',
    maxTokens: 4000,
    temperature: 0.0,
    strengths: ['reliability', 'standard invoices', 'cost-effective'],
    costPer1kTokens: 0.002
  }
} as const;

export type OpenAIModelKey = keyof typeof OPENAI_MODELS;

interface OpenAIModelService {
  model: OpenAIModelKey;
  client: OpenAI;
}

class OpenAIInvoiceProcessor {
  private client: OpenAI;
  private preferredModel: OpenAIModelKey;
  private fallbackModels: OpenAIModelKey[];

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true
    });
    
    // Set model preference order
    this.preferredModel = 'gpt-4o';
    this.fallbackModels = ['gpt-4-turbo', 'gpt-4-vision-preview'];
  }

  // Get optimized prompt for each model
  private getPromptForModel(model: OpenAIModelKey): string {
    const basePrompt = `You are an expert invoice OCR specialist. Analyze this invoice image with EXTREME PRECISION and extract ALL data.

CRITICAL: This may be a low-quality smartphone photo with poor lighting, blur, or perspective distortion. Apply maximum OCR analysis effort.`;

    const modelSpecificPrompts = {
      'gpt-4o': `${basePrompt}

ADVANCED INSTRUCTIONS FOR GPT-4O:
- Use your enhanced vision capabilities for complex layouts
- Pay special attention to rotated/skewed text
- Handle multiple languages if present
- Extract data from tables with irregular formatting
- Identify handwritten notes or annotations`,

      'gpt-4-turbo': `${basePrompt}

OPTIMIZED FOR SPEED AND ACCURACY:
- Focus on standard invoice layouts
- Prioritize clearly printed text
- Extract line items in table format
- Ensure consistent number formatting`,

      'gpt-4-vision-preview': `${basePrompt}

RELIABLE EXTRACTION MODE:
- Focus on core invoice information
- Use conservative approach for unclear text
- Double-check numerical values
- Maintain consistent data structure`
    };

    return modelSpecificPrompts[model] + `

Extract and return ONLY a valid JSON object with this exact structure:
{
  "supplier": {
    "name": "Company Name",
    "address": "Full address or partial if available",
    "email": "email if found",
    "phone": "phone if found"
  },
  "invoice": {
    "number": "Invoice number or reference",
    "date": "YYYY-MM-DD format",
    "dueDate": "YYYY-MM-DD or null",
    "currency": "EUR/USD/etc (default EUR if unclear)"
  },
  "amounts": {
    "subtotal": 0.00,
    "vatAmount": 0.00,
    "total": 0.00,
    "vatRate": 21
  },
  "lineItems": [
    {
      "description": "Product/service name and details",
      "quantity": 1.0,
      "unit": "kg/pcs/l/etc",
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "vatRate": 21
    }
  ]
}

CRITICAL RULES:
- Return ONLY valid JSON, no explanations
- Use 0.00 for unclear/missing amounts
- Convert all numbers to decimals (use . not ,)
- If text is unclear, use your best interpretation
- For quantities/prices: extract numbers carefully, ignore currency symbols
- Dates: convert to YYYY-MM-DD format (guess year if needed)
- Units: normalize to standard units (kg, pcs, l, m, etc.)`;
  }

  // Try multiple models with intelligent fallback
  async processInvoiceWithFallback(file: File): Promise<{
    result: InvoiceProcessingResult;
    modelUsed: OpenAIModelKey;
    attempts: Array<{model: OpenAIModelKey; success: boolean; error?: string}>;
  }> {
    const attempts: Array<{model: OpenAIModelKey; success: boolean; error?: string}> = [];
    const modelsToTry = [this.preferredModel, ...this.fallbackModels];

    for (const model of modelsToTry) {
      try {
        console.log(`Trying OpenAI model: ${OPENAI_MODELS[model].name}`);
        
        const result = await this.processWithModel(file, model);
        attempts.push({ model, success: true });
        
        return {
          result,
          modelUsed: model,
          attempts
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Model ${model} failed:`, errorMessage);
        attempts.push({ model, success: false, error: errorMessage });
        
        // If it's a rate limit or quota error, try next model immediately
        if (errorMessage.includes('429') || errorMessage.includes('quota')) {
          continue;
        }
        
        // For other errors, also try next model
        continue;
      }
    }

    // All models failed
    throw new Error(`All OpenAI models failed. Attempts: ${JSON.stringify(attempts)}`);
  }

  // Process with specific model
  private async processWithModel(file: File, model: OpenAIModelKey): Promise<InvoiceProcessingResult> {
    const modelConfig = OPENAI_MODELS[model];
    const base64Image = await this.fileToBase64(file);
    
    const response = await this.client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: this.getPromptForModel(model)
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`No response from ${model}`);
    }

    try {
      const extractedData = JSON.parse(content);
      return this.transformToInvoiceResult(extractedData, file, model);
    } catch (parseError) {
      throw new Error(`JSON parsing failed for ${model}: ${parseError}`);
    }
  }

  // Transform extracted data to our format
  private transformToInvoiceResult(data: any, file: File, model: OpenAIModelKey): InvoiceProcessingResult {
    const modelInfo = OPENAI_MODELS[model];
    
    return {
      invoice: {
        invoiceNumber: data.invoice?.number || `INV-${Date.now()}`,
        invoiceDate: data.invoice?.date || new Date().toISOString().split('T')[0],
        totalExclVat: this.parseNumber(data.amounts?.subtotal) || 0,
        totalInclVat: this.parseNumber(data.amounts?.total) || 0,
        vatAmount: this.parseNumber(data.amounts?.vatAmount) || 0,
        discountAmount: 0,
        currency: data.invoice?.currency || 'EUR',
        status: 'review' as const,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        extractedData: {
          ...data,
          processingInfo: {
            model: model,
            modelName: modelInfo.name,
            timestamp: new Date().toISOString()
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      lineItems: (data.lineItems || []).map((item: any, index: number) => ({
        productName: item.description || `Product ${index + 1}`,
        description: '',
        quantity: this.parseNumber(item.quantity) || 1,
        unit: this.normalizeUnit(item.unit) || 'pcs',
        unitPrice: this.parseNumber(item.unitPrice) || 0,
        totalPrice: this.parseNumber(item.totalPrice) || 0,
        vatRate: this.parseNumber(item.vatRate) || 21,
        needsReview: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      supplierInfo: data.supplier ? {
        name: data.supplier.name || '',
        email: data.supplier.email || '',
        phone: data.supplier.phone || ''
      } : undefined,
      matches: {},
      errors: [],
      warnings: []
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private parseNumber(value: any): number {
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

  private normalizeUnit(unit: string | undefined): string {
    if (!unit) return 'pcs';
    
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

  // Get model statistics
  getModelStats(): Array<{
    key: OpenAIModelKey;
    name: string;
    description: string;
    strengths: string[];
    costPer1kTokens: number;
  }> {
    return Object.entries(OPENAI_MODELS).map(([key, config]) => ({
      key: key as OpenAIModelKey,
      ...config
    }));
  }

  // Set preferred model
  setPreferredModel(model: OpenAIModelKey): void {
    this.preferredModel = model;
    // Reorder fallback models
    this.fallbackModels = Object.keys(OPENAI_MODELS)
      .filter(m => m !== model) as OpenAIModelKey[];
  }
}

// Export singleton instance
export const openaiInvoiceProcessor = new OpenAIInvoiceProcessor();

// Check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}
