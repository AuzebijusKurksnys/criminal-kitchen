// Direct text extraction from PDF using PDF.js text layer
import * as pdfjsLib from 'pdfjs-dist';
import { cleanSupplierName } from '../utils/supplierNameUtils';

interface ParsedProduct {
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalBeforeDiscount?: number;
  discountAmount?: number;
  totalPrice: number;
  vatRate?: number;
  expiryDate?: string;
}

interface ParsedInvoiceSummary {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalExclVat?: number;
  totalInclVat?: number;
  vatAmount?: number;
  discountAmount?: number;
}

interface ParsedSupplierInfo {
  name: string;
}

interface ParsedInvoiceResult {
  products: ParsedProduct[];
  rawText: string;
  lineCount: number;
  invoice?: ParsedInvoiceSummary;
  supplier?: ParsedSupplierInfo;
}

const NUMERIC_REGEX = /^-?\d+(?:[.,]\d+)?$/;
const UNIT_REGEX = /^[\p{L}%]+$/u;

const COUNTRY_KEYWORDS = new Set([
  'latvia',
  'latvija',
  'latvijos',
  'lithuania',
  'lietuva',
  'lietuvoje',
  'ukraine',
  'ukraina',
  'poland',
  'lenkija',
  'netherlands',
  'olandija',
  'holland',
  'estonia',
  'estija',
  'germany',
  'vokietija',
  'italy',
  'italija',
  'spain',
  'ispanija',
  'france',
  'prancuzija',
  'belgium',
  'belgija',
  'denmark',
  'danija',
  'norway',
  'norvegija',
  'sweden',
  'svedija',
  'finland',
  'suomija'
]);

export class TextExtractor {
  private static async initializePDFJS() {
    if (typeof window !== 'undefined') {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js';
      return pdfjs;
    }
    throw new Error('PDF text extraction only available in browser');
  }

  // Extract raw text from PDF - much more accurate than vision OCR
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      const pdfjs = await this.initializePDFJS();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items as any[];

        textItems.sort((a, b) => {
          const yDiff = Math.abs(a.transform[5] - b.transform[5]);
          if (yDiff > 5) {
            return b.transform[5] - a.transform[5];
          }
          return a.transform[4] - b.transform[4];
        });

        const lines: string[] = [];
        let currentLine = '';
        let lastY = -1;

        for (const item of textItems) {
          const y = item.transform[5];
          if (lastY === -1 || Math.abs(y - lastY) > 5) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = item.str;
            lastY = y;
          } else {
            currentLine += (item.str.startsWith(' ') ? '' : ' ') + item.str;
          }
        }

        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }

        const pageText = lines.join('\n');
        fullText += pageText + '\n\n';
      }

      // Fix encoding issues AGGRESSIVELY before returning
      let fixedText = this.fixLithuanianEncoding(fullText);
      
      // Apply encoding fix AGAIN after initial cleanup
      fixedText = this.fixLithuanianEncoding(fixedText);
      
      console.log('📄 Extracted raw PDF text:', fixedText.substring(0, 500) + '...');
      return fixedText;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  private static parseNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/[^0-9,.-]/g, '')
        .replace(',', '.')
        .trim();
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private static round(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }

  private static fixLithuanianEncoding(text: string): string {
    // Don't try to fix ALL text - it will break numbers/prices
    // Just clean up obvious garbage characters
    let fixed = text
      .replace(/\u0003/g, ' ')
      .replace(/\uFFFD/g, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return fixed;
  }

  // Detect if extracted text is garbled/corrupted
  private static isTextGarbled(text: string): boolean {
    // Check for excessive uppercase letter combinations that suggest encoding issues
    // Real Lithuanian text won't have many sequences like "EDQGHORY", "VLåUås", etc.
    const suspiciousPatterns = [
      /[A-Z]{6,}/g,  // 6+ consecutive uppercase letters
      /[DHLMNRUVWX]{4,}/g,  // Common garbled patterns
      /\d[A-Z]\d/g,  // Number-Letter-Number patterns (unusual in real text)
    ];
    
    let suspiciousCount = 0;
    for (const pattern of suspiciousPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        suspiciousCount += matches.length;
      }
    }
    
    // If more than 20% of text seems garbled, consider it corrupted
    const ratio = suspiciousCount / Math.max(text.length / 50, 1);
    const isGarbled = ratio > 0.2;
    
    if (isGarbled) {
      console.warn('🚨 Detected garbled text extraction. Will use OCR fallback.');
    }
    
    return isGarbled;
  }

  private static cleanProductName(name: string): string {
    const fixed = this.fixLithuanianEncoding(name);
    return fixed
      .replace(/\s+/g, ' ')
      .replace(/\s+,/g, ',')
      .replace(/\s+\./g, '.')
      .trim();
  }

  private static stripDiacritics(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private static isCountryWord(value: string): boolean {
    const normalized = this.stripDiacritics(value).replace(/[^a-z]/g, '');
    if (!normalized) {
      return false;
    }
    if (COUNTRY_KEYWORDS.has(normalized)) {
      return true;
    }
    // Try collapsing spaces in multi-word countries (e.g., "great britain")
    return COUNTRY_KEYWORDS.has(normalized.replace(/\s+/g, ''));
  }

  private static removeTrailingCountry(tokens: string[]): void {
    while (tokens.length) {
      const last = tokens[tokens.length - 1];
      if (this.isCountryWord(last)) {
        tokens.pop();
        continue;
      }
      if (tokens.length >= 2) {
        const combined = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
        if (this.isCountryWord(combined)) {
          tokens.splice(tokens.length - 2, 2);
          continue;
        }
      }
      break;
    }
  }

  private static normalizeMonth(month: string): string | undefined {
    const normalized = this.stripDiacritics(month);
    const monthMap: Record<string, string> = {
      sausis: '01',
      sausio: '01',
      vasaris: '02',
      vasario: '02',
      kovas: '03',
      kovo: '03',
      balandis: '04',
      balandzio: '04',
      geguze: '05',
      geguzes: '05',
      birzelis: '06',
      birzelio: '06',
      liepa: '07',
      liepos: '07',
      rugpjutis: '08',
      rugpjucio: '08',
      rugsejis: '09',
      rugsejo: '09',
      spalis: '10',
      spalio: '10',
      lapkritis: '11',
      lapkricio: '11',
      gruodis: '12',
      gruodzio: '12'
    };

    return monthMap[normalized];
  }

  private static extractInvoiceNumber(text: string): string | undefined {
    // Try Foodlevel format
    let match = text.match(/FL\d+/i);
    if (match) return match[0];
    
    // Try Lidl format (e.g., "25-0149990811003")
    match = text.match(/\d{2}-\d{13}/);
    if (match) return match[0];
    
    return undefined;
  }

  private static extractInvoiceDate(text: string): string | undefined {
    // Try Foodlevel format first
    let dateMatch = text.match(/(\d{4})\.m\.\s*([^\s\d]+)\s*(\d{1,2})d\./i);
    if (dateMatch) {
    const [, year, monthWord, dayRaw] = dateMatch;
    const month = this.normalizeMonth(monthWord);
      if (month) {
    const day = dayRaw.padStart(2, '0');
    return `${year}-${month}-${day}`;
      }
    }
    
    // Try Lidl format (e.g., "Data 2025-08-11")
    dateMatch = text.match(/Data\s+(\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    // Try generic date format YYYY-MM-DD
    dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    return undefined;
  }

  private static extractSupplierName(text: string): string | undefined {
    let rawSupplierName: string | undefined;
    
    // Try Foodlevel format first
    let supplierMatch = text.match(/Tiek[ėe]jas:\s*([^\n]+)/i);
    if (supplierMatch) {
      rawSupplierName = supplierMatch[1].trim();
    } else {
      // Try Lidl format - look for "UAB" followed by company name
      supplierMatch = text.match(/UAB\s+([^\n\r]+?)(?:\s+Adresas|$)/i);
      if (supplierMatch) {
        rawSupplierName = `UAB ${supplierMatch[1].trim()}`;
      }
    }
    
    // Apply the shared cleanup logic
    const cleanedName = cleanSupplierName(rawSupplierName);
    console.log('🧹 TextExtractor supplier cleanup:', { raw: rawSupplierName, cleaned: cleanedName });
    
    return cleanedName;
  }

  private static extractTableRows(text: string): string[] {
    // First, try to split the text into meaningful lines
    // For Lidl invoices, the entire content might be on one line
    // Split on product row patterns: "1 Product", "2 Product", etc.
    let textToProcess = text;
    
    // Stop at summary section
    const summaryMatch = text.match(/(Apmokestinama\s+\d+%|PVM\s+\d+%|Kasos\s+aparato)/i);
    if (summaryMatch && summaryMatch.index) {
      textToProcess = text.substring(0, summaryMatch.index);
    }
    
    // Try to find the start of the product table (after column headers)
    const tableStartMatch = textToProcess.match(/(?:Nr\.|#)\s+(?:Prekių|Product|Item).*?(?:Suma|Total|Price)/i);
    if (tableStartMatch && tableStartMatch.index) {
      textToProcess = textToProcess.substring(tableStartMatch.index + tableStartMatch[0].length);
    }
    
    // Split by line breaks first
    const lines = textToProcess.split('\n');
    const rows: string[] = [];
    
    // If we have multiple lines, use the old logic
    if (lines.length > 3) {
    let currentRow: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

        // Stop at various summary/total indicators
        if (/^Viso\s+be\s+PVM/i.test(line) || 
            /^Apmokestinama\s+\d+%/i.test(line) ||
            /^PVM\s+\d+%/i.test(line) ||
            /^Suma\s+su\s+PVM/i.test(line) ||
            /^Mokėtina\s+suma/i.test(line) ||
            /^Apvalinimas/i.test(line) ||
            /^Kasos\s+aparato/i.test(line)) {
        if (currentRow.length) {
          rows.push(currentRow.join(' '));
        }
        break;
      }

      if (/^\d+\s+/.test(line)) {
        if (currentRow.length) {
          rows.push(currentRow.join(' '));
        }
        currentRow = [line];
      } else if (currentRow.length) {
        currentRow.push(line);
      }
    }

    if (currentRow.length) {
      rows.push(currentRow.join(' '));
      }
    } else {
      // Single line case (Lidl PDFs) - split on product row patterns
      // Lidl format: "Suma 1 Product Kg. qty price vat sub total 2 NextProduct Vnt. ..."
      // Strategy: Find " <digit> " followed by text, then look for the NEXT " <digit> " to mark the end
      const singleLine = lines.join(' ');
      
      // First, find where the product table starts (after "Suma" header column)
      const tableStartMatch = singleLine.match(/Suma\s+1\s+/i);
      const startPos = tableStartMatch ? (tableStartMatch.index! + tableStartMatch[0].length - 2) : 0;
      
      // Find where products end (before summary section)
      const summaryMatch = singleLine.match(/Apmokestinama\s+\d+%/i);
      const endPos = summaryMatch ? summaryMatch.index! : singleLine.length;
      
      const productsSection = singleLine.substring(startPos, endPos);
      
      // Split on pattern: " <digit><space>" which marks the start of each row
      // But we need to be smart - look for " 1 ", " 2 ", " 3 " etc at the START of product rows
      const rowStarts: Array<{ index: number; rowNum: number }> = [];
      
      // Find all instances of " <digit> " that could be row markers
      const rowMarkerPattern = /\s(\d{1,2})\s+/g;
      let match;
      
      while ((match = rowMarkerPattern.exec(productsSection)) !== null) {
        const rowNum = parseInt(match[1]);
        // Only consider as row markers if they're sequential starting from 1
        if (rowNum >= 1 && rowNum <= 50) {
          rowStarts.push({ index: match.index, rowNum });
        }
      }
      
      // Filter to only keep sequential row numbers starting from 1
      const sequentialRows = rowStarts.filter((r, i) => {
        if (i === 0) return r.rowNum === 1;
        return r.rowNum === rowStarts[i - 1].rowNum + 1;
      });
      
      console.log(`🔍 Found ${sequentialRows.length} product rows in single-line PDF`);
      
      // Extract text between each row marker
      for (let i = 0; i < sequentialRows.length; i++) {
        const start = sequentialRows[i].index;
        const end = i < sequentialRows.length - 1 ? sequentialRows[i + 1].index : productsSection.length;
        const rowText = productsSection.substring(start, end).trim();
        if (rowText) {
          rows.push(rowText);
        }
      }
    }

    return rows;
  }

  private static parseProductRow(row: string): ParsedProduct | undefined {
    // Remove everything after summary indicators
    let sanitized = row
      .replace(/Apmokestinama.*$/i, '')
      .replace(/PVM\s+\d+%:.*$/i, '')
      .replace(/Suma\s+su\s+PVM.*$/i, '')
      .replace(/Mokėtina\s+suma.*$/i, '')
      .replace(/Apvalinimas.*$/i, '')
      .replace(/Kasos\s+aparato.*$/i, '')
      .replace(/Viso.*$/i, '')
      .trim();
      
    if (!sanitized) {
      return undefined;
    }
    
    // Skip summary rows (just quantities without product names)
    if (/^\d+\s+(kg|vnt|pcs|l|ml)\s+Viso/i.test(sanitized)) {
      return undefined;
    }

    let remainder = sanitized;
    const indexMatch = remainder.match(/^(\d+)\s+(.*)$/);
    if (indexMatch) {
      remainder = indexMatch[2].trim();
    }
    
    // Skip if remainder is too short to be a real product
    if (remainder.length < 5) {
      return undefined;
    }

    let expiryDate: string | undefined;
    const expiryMatch = remainder.match(/(\d{4}-\d{2}-\d{2})/);
    if (expiryMatch) {
      expiryDate = expiryMatch[1];
      // Keep only everything up to and including the expiry date, remove anything after
      const endIndex = (expiryMatch.index || 0) + expiryMatch[0].length;
      remainder = remainder.slice(0, endIndex).trim();
      // Now remove the expiry date from the end so it doesn't interfere with parsing
      remainder = remainder.slice(0, expiryMatch.index).trim();
    }

    // Try multiple patterns to handle different invoice formats:
    // Pattern Lidl: name unit quantity unitPrice vatRate subtotal total (Lidl format: name Kg. 4,61 0,8182 21,00 3,7686 4,56)
    // Pattern 1: name quantity unit unitPrice subtotal discount total (full format with explicit discount)
    // Pattern 2: name quantity unit unitPrice subtotal total (optional discount between subtotal and total)
    // Pattern 3: name quantity unit unitPrice total (simplest format - no subtotal/discount)
    
    const tailPatternLidl = /^(.+?)\s+(kg|vnt|pcs|l|ml)[.,]?\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)$/iu;
    const tailPatternFull = /^(.+?)\s+(\d+[.,]?\d*)\s+(kg|vnt|pcs|l|ml)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)$/iu;
    const tailPatternWithOptionalDiscount = /^(.+?)\s+(\d+[.,]?\d*)\s+(kg|vnt|pcs|l|ml)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)(?:\s+(\d+[.,]?\d*))?\s+(\d+[.,]?\d*)$/iu;
    const tailPatternSimple = /^(.+?)\s+(\d+[.,]?\d*)\s+(kg|vnt|pcs|l|ml)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)$/iu;
    
    let match = remainder.match(tailPatternLidl);
    let formatType: 'lidl' | 'full' | 'optional' | 'simple' = 'lidl';
    
    if (!match) {
      match = remainder.match(tailPatternFull);
      formatType = 'full';
    }
    
    if (!match) {
      match = remainder.match(tailPatternWithOptionalDiscount);
      formatType = 'optional';
    }
    
    if (!match) {
      match = remainder.match(tailPatternSimple);
      formatType = 'simple';
    }

    if (!match) {
      console.warn('⚠️ Unable to parse product row tail:', row);
      return undefined;
    }

    let leadingText, quantityStr, unitStr, unitPriceStr, subtotalStr, discountStr, totalStr, vatRateStr;
    
    if (formatType === 'lidl') {
      // Lidl format: name unit quantity unitPrice vatRate subtotal total
      [, leadingText, unitStr, quantityStr, unitPriceStr, vatRateStr, subtotalStr, totalStr] = match;
      discountStr = undefined;
    } else if (formatType === 'full') {
      // Full format: name quantity unit unitPrice subtotal discount total
      [, leadingText, quantityStr, unitStr, unitPriceStr, subtotalStr, discountStr, totalStr] = match;
    } else if (formatType === 'optional') {
      // Optional discount format: name quantity unit unitPrice subtotal [discount] total
      [, leadingText, quantityStr, unitStr, unitPriceStr, subtotalStr, discountStr, totalStr] = match;
    } else {
      // Simple format: name quantity unit unitPrice total
      [, leadingText, quantityStr, unitStr, unitPriceStr, totalStr] = match;
      subtotalStr = totalStr; // No discount, so subtotal = total
      discountStr = undefined;
    }

    const quantity = this.parseNumber(quantityStr);
    const unitPrice = this.parseNumber(unitPriceStr);
    const subtotal = this.parseNumber(subtotalStr);
    const total = this.parseNumber(totalStr);
    const computedDiscount = this.round(subtotal - total);

    let discount = discountStr ? this.parseNumber(discountStr) : computedDiscount;
    if (Math.abs(discount - computedDiscount) > 0.05) {
      discount = Math.abs(computedDiscount) <= 0.05 ? 0 : computedDiscount;
    }
    if (discount < 0.01) {
      discount = 0;
    }

    const leadingTokens = leadingText.split(/\s+/).filter(Boolean);
    this.removeTrailingCountry(leadingTokens);
    const rawName = this.cleanProductName(leadingTokens.join(' '));

    if (!rawName) {
      console.warn('⚠️ Empty product name detected for row:', row);
    }

    const productName = this.cleanProductName(rawName)
      // Remove leading barcodes/SKU codes (8-13 digit numbers at start, often with spaces)
      .replace(/^\d{8,13}\s+\d{0,2}\s*/g, '')
      .replace(/^\d{8,13}\s+/g, '')
      // Remove country names
      .replace(/\b(Latvija|Latvia)\b.*$/i, '')
      .replace(/\b(Lietuva|Lithuania|Ukraine|Netherlands|Olandija|Holland|India)\b.*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Skip products with nonsensical/incomplete names
    if (productName.length < 3) {
      console.warn('⚠️ Product name too short, likely incomplete:', productName);
      return undefined;
    }
    
    // Skip if product starts with common incomplete phrases (only for longer names)
    if (productName.length >= 15 && /^(su perpjautu|su |ir |be |per |prie )/i.test(productName)) {
      console.warn('⚠️ Product name starts with incomplete phrase:', productName);
      return undefined;
    }

    // Parse VAT rate from Lidl format or use default
    const vatRate = vatRateStr ? this.parseNumber(vatRateStr) : 21;

    const parsedProduct: ParsedProduct = {
      productName,
      description: productName,
      quantity: this.round(quantity),
      unit: unitStr.toLowerCase(),
      unitPrice: this.round(unitPrice),
      totalBeforeDiscount: this.round(subtotal),
      discountAmount: this.round(discount),
      totalPrice: this.round(total),
      vatRate: vatRate,
      expiryDate
    };

    console.log('📦 Parsed product row:', parsedProduct);
    return parsedProduct;
  }

  private static extractProductTable(text: string): ParsedProduct[] {
    const rows = this.extractTableRows(text);
    const products: ParsedProduct[] = [];
    const seenProducts = new Set<string>(); // Track unique products

    const expandedRows: string[] = [];
    const rowSplitRegex = /(?<=\d{4}-\d{2}-\d{2})\s+(?=\d+\s)/g;

    for (const row of rows) {
      const normalized = row.replace(/\s+/g, ' ').trim();
      if (!normalized) {
        continue;
      }

      const segments = normalized.split(rowSplitRegex);
      for (const segment of segments) {
        const cleaned = segment.trim();
        if (cleaned) {
          expandedRows.push(cleaned);
        }
      }
    }

    for (const row of expandedRows) {
      const parsed = this.parseProductRow(row);
      if (parsed) {
        // Create a unique key based on product details to avoid duplicates
        const uniqueKey = `${parsed.productName}-${parsed.quantity}-${parsed.unitPrice}-${parsed.totalPrice}`;
        if (!seenProducts.has(uniqueKey)) {
          seenProducts.add(uniqueKey);
        products.push(parsed);
        } else {
          console.log('⚠️ Skipping duplicate product:', parsed.productName);
        }
      }
    }

    console.log('📊 Structured table parsing found products:', {
      rowCount: rows.length,
      expandedRowCount: expandedRows.length,
      productCount: products.length
    });

    return products;
  }

  private static extractInvoiceTotals(text: string, products: ParsedProduct[]) {
    const totalExclMatch = text.match(/Viso\s+be\s+PVM[:\s]+([\d.,]+)/i);
    const totalInclMatch = text.match(/Viso\s+su\s+PVM[:\s]+([\d.,]+)/i);
    const vatMatch = text.match(/PVM\s*21%[^0-9]*([\d.,]+)/i);

    const computedTotals = products.reduce((acc, product) => {
      acc.total += product.totalPrice;
      acc.discount += product.discountAmount ?? 0;
      return acc;
    }, { total: 0, discount: 0 });

    const totalExclVat = totalExclMatch
      ? this.parseNumber(totalExclMatch[1])
      : this.round(computedTotals.total);

    const vatAmount = vatMatch ? this.parseNumber(vatMatch[1]) : undefined;

    const totalInclVat = totalInclMatch
      ? this.parseNumber(totalInclMatch[1])
      : (vatAmount !== undefined ? this.round(totalExclVat + vatAmount) : undefined);

    return {
      totalExclVat: this.round(totalExclVat),
      totalInclVat: totalInclVat !== undefined ? this.round(totalInclVat) : undefined,
      vatAmount: vatAmount !== undefined ? this.round(vatAmount) : undefined,
      discountAmount: this.round(computedTotals.discount)
    };
  }

  // Parse invoice data from extracted text using table detection with heuristic fallback
  static parseInvoiceFromText(text: string): ParsedInvoiceResult {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📝 Processing text lines (first 30):', lines.slice(0, 30));

    const invoiceNumber = this.extractInvoiceNumber(text) || 'PDF-INVOICE';
    const invoiceDate = this.extractInvoiceDate(text) || new Date().toISOString().split('T')[0];
    const supplierName = this.extractSupplierName(text);

    const structuredProducts = this.extractProductTable(text);

    if (structuredProducts.length > 0) {
      const totals = this.extractInvoiceTotals(text, structuredProducts);
      return {
        products: structuredProducts,
        rawText: text,
        lineCount: lines.length,
        invoice: {
          invoiceNumber,
          invoiceDate,
          ...totals
        },
        supplier: supplierName ? { name: supplierName } : undefined
      };
    }

    console.warn('⚠️ Structured parsing failed, falling back to heuristic product detection.');

    const productIndicators = [
      /sūrio.*lazdelės/i,
      /mocarelos/i,
      /kiaulienos.*šoninė/i,
      /viščiukų.*broilerių/i,
      /broilerių.*filė/i,
      /bulvės.*dippers/i,
      /lamb.*weston/i,
      /sūrio.*čili.*pipirų/i,
      /užkanda/i,
      /krevetės.*torpedo/i,
      /litopenaeus.*vannamei/i,
      /šaldytos/i,
      /atšaldyta/i,
      /vakuume/i,
      /kg[.,\s]/i,
      /x\d+[.,]\d+/i
    ];

    const products: ParsedProduct[] = [];
    let currentProduct = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^\d+$/) ||
          line.match(/^[A-Z]{2,}\s*\d/) ||
          line.length < 10 ||
          line.match(/^(PVM|VAT|Total|Suma)/i)) {
        continue;
      }

      const hasProductIndicator = productIndicators.some(pattern => pattern.test(line));

      if (hasProductIndicator) {
        currentProduct = currentProduct ? `${currentProduct} ${line}` : line;
        const isComplete = line.match(/(kg|vnt|l)[,\s]*(\(.*\))?\s*$/i) ||
          line.match(/šaldytos?\s*$/i) ||
          line.match(/atšaldyta\s*$/i);

        if (isComplete && currentProduct) {
          const cleaned = this.cleanProductName(currentProduct);
          products.push({
            productName: cleaned,
            description: cleaned,
            quantity: 1,
            unit: 'pcs',
            unitPrice: 0,
            totalPrice: 0,
            vatRate: 21
          });
          currentProduct = '';
        }
      } else if (currentProduct) {
        currentProduct += ` ${line}`;
        const isComplete = line.match(/(kg|vnt|l)[,\s]*(\(.*\))?\s*$/i) ||
          line.match(/šaldytos?\s*$/i) ||
          line.match(/atšaldyta\s*$/i);

        if (isComplete) {
          const cleaned = this.cleanProductName(currentProduct);
          products.push({
            productName: cleaned,
            description: cleaned,
            quantity: 1,
            unit: 'pcs',
            unitPrice: 0,
            totalPrice: 0,
            vatRate: 21
          });
          currentProduct = '';
        }
      }
    }

    if (currentProduct) {
      const cleaned = this.cleanProductName(currentProduct);
      products.push({
        productName: cleaned,
        description: cleaned,
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        totalPrice: 0,
        vatRate: 21
      });
    }

    console.log(`📊 Heuristic text extraction found ${products.length} products`);

    return {
      products,
      rawText: text,
      lineCount: lines.length,
      invoice: {
        invoiceNumber,
        invoiceDate
      },
      supplier: supplierName ? { name: supplierName } : undefined
    };
  }
}
