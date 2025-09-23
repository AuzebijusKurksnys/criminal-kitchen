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
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    description: 'Fast and cost-effective fallback option',
    maxTokens: 4000,
    temperature: 0.0,
    strengths: ['speed', 'cost-effective', 'reliability'],
    costPer1kTokens: 0.00015
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
    
    // Set model preference order - testing different models for accuracy
    this.preferredModel = 'gpt-4-turbo';  // Try turbo instead of gpt-4o
    this.fallbackModels = ['gpt-4o-mini', 'gpt-4o'];
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
- Handle multiple languages (especially Lithuanian) if present
- Extract data from tables with irregular formatting
- Read each line item row systematically from top to bottom
- Do NOT translate foreign language product names to English
- If text is partially obscured, transcribe visible characters exactly`,

      'gpt-4-turbo': `${basePrompt}

OPTIMIZED FOR SPEED AND ACCURACY:
- Focus on standard invoice layouts
- Prioritize clearly printed text
- Extract line items in table format systematically
- Ensure consistent number formatting
- Read product names exactly as written - no interpretation
- Count total line items to ensure none are missed`,

      'gpt-4o-mini': `${basePrompt}

FAST AND EFFICIENT MODE:
- Focus on core invoice information
- Use conservative approach for unclear text
- Double-check numerical values
- Maintain consistent data structure
- Extract ALL line items without skipping any
- Copy product names character-by-character if needed`
    };

    return modelSpecificPrompts[model] + `

INVOICE LINE ITEM EXTRACTION - CRITICAL ACCURACY REQUIRED:

When extracting product names from line items:
1. Read EACH line carefully and completely
2. Copy the EXACT product name as written (don't translate or interpret)
3. Do NOT skip any line items - extract ALL products listed
4. Do NOT create duplicate entries unless they actually appear twice
5. Do NOT guess or hallucinate product names
6. If text is unclear, copy what you can see character by character

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
      "description": "EXACT product name as written on invoice - DO NOT translate, interpret, or modify",
      "quantity": 1.0,
      "unit": "kg/pcs/l/etc",
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "vatRate": 21
    }
  ]
}

ULTRA-CRITICAL EXTRACTION RULES:
- Return ONLY valid JSON, no explanations
- EXTRACT ALL LINE ITEMS - do not skip any products
- Product names: Copy EXACTLY as written, preserve all characters, punctuation, accents
- Do NOT translate Lithuanian/foreign text to English
- Do NOT interpret or guess product names - copy what you see
- If multiple similar items exist, they are separate line items
- Use 0.00 for unclear/missing amounts only
- Convert all numbers to decimals (use . not ,)
- Quantities/prices: extract numbers carefully, ignore currency symbols  
- Dates: convert to YYYY-MM-DD format (guess year if needed)
- Units: normalize to standard units (kg, pcs, l, m, etc.)

ACCURACY CHECK: Count line items in image vs JSON - they must match exactly!`;
  }

  // Try multiple models with intelligent fallback
  async processInvoiceWithFallback(file: File): Promise<{
    result: InvoiceProcessingResult;
    modelUsed: OpenAIModelKey;
    attempts: Array<{model: OpenAIModelKey; success: boolean; error?: string}>;
  }> {
    // Validate file is an image
    if (!this.isValidImageFile(file)) {
      throw new Error(`Invalid image file. File type: ${file.type}, Name: ${file.name}`);
    }
    
    const attempts: Array<{model: OpenAIModelKey; success: boolean; error?: string}> = [];
    const modelsToTry = [this.preferredModel, ...this.fallbackModels];

    for (const model of modelsToTry) {
      try {
        console.log(`Trying OpenAI model: ${OPENAI_MODELS[model].name}`);
        
        const result = await this.processWithModel(file, model);
        attempts.push({ model, success: true });
        
        // Enhanced logging for debugging OCR accuracy
        console.log(`🔍 Model Performance Debug:`, {
          model: OPENAI_MODELS[model].name,
          supplier: result.supplierInfo?.name,
          lineItemCount: result.lineItems?.length,
          firstProduct: result.lineItems?.[0]?.productName?.substring(0, 50) + '...',
          lastProduct: result.lineItems?.[result.lineItems?.length - 1]?.productName?.substring(0, 50) + '...'
        });
        
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
    
    // Debug file information
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    const base64Image = await this.fileToBase64(file);
    
    // Ensure we have a valid image MIME type
    const imageMimeType = this.getValidImageMimeType(file.type);
    console.log('Using MIME type:', imageMimeType);
    
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
                url: `data:${imageMimeType};base64,${base64Image}`,
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
        // Extract just the base64 data part (after the comma)
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private isValidImageFile(file: File): boolean {
    // Check if file type starts with 'image/'
    if (!file.type || !file.type.startsWith('image/')) {
      console.warn('File is not an image type:', file.type);
      return false;
    }
    
    // Check file size (max 20MB for OpenAI)
    if (file.size > 20 * 1024 * 1024) {
      console.warn('File too large:', file.size, 'bytes');
      return false;
    }
    
    // Check if file has a valid extension for OpenAI vision models
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      console.warn('File extension not supported by OpenAI:', fileName);
      return false;
    }
    
    // Check MIME type is supported by OpenAI
    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const normalizedMimeType = file.type.toLowerCase().trim();
    const isSupportedMimeType = supportedMimeTypes.includes(normalizedMimeType) || 
                                normalizedMimeType === 'image/jpg';
    
    if (!isSupportedMimeType) {
      console.warn('MIME type not supported by OpenAI:', file.type);
      return false;
    }
    
    return true;
  }

  private getValidImageMimeType(fileType: string): string {
    // OpenAI vision models support: image/jpeg, image/png, image/gif, image/webp
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    // Normalize the file type
    const normalizedType = fileType.toLowerCase().trim();
    
    if (supportedTypes.includes(normalizedType)) {
      return normalizedType;
    }
    
    // Handle common variations
    if (normalizedType === 'image/jpg') {
      return 'image/jpeg';
    }
    
    // If file type is not supported or unknown, default to JPEG
    // This handles cases where file.type might be empty or unsupported
    console.warn(`Unsupported file type: ${fileType}, defaulting to image/jpeg`);
    return 'image/jpeg';
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
      ...config,
      strengths: [...config.strengths] // Convert readonly array to mutable array
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
