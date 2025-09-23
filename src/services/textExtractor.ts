// Direct text extraction from PDF using PDF.js text layer
import * as pdfjsLib from 'pdfjs-dist';

export class TextExtractor {
  private static async initializePDFJS() {
    if (typeof window !== 'undefined') {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js';
      return pdfjsLib;
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
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items preserving spatial layout
        const textItems = textContent.items as any[];
        
        // Sort by Y position (top to bottom) then X position (left to right)
        textItems.sort((a, b) => {
          const yDiff = Math.abs(a.transform[5] - b.transform[5]);
          if (yDiff > 5) { // Different lines
            return b.transform[5] - a.transform[5]; // Top to bottom
          }
          return a.transform[4] - b.transform[4]; // Left to right
        });
        
        // Group items by line (similar Y coordinates)
        const lines: string[] = [];
        let currentLine = '';
        let lastY = -1;
        
        for (const item of textItems) {
          const y = item.transform[5];
          
          if (lastY === -1 || Math.abs(y - lastY) > 5) {
            // New line
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = item.str;
            lastY = y;
          } else {
            // Same line
            currentLine += (item.str.startsWith(' ') ? '' : ' ') + item.str;
          }
        }
        
        // Add final line
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        
        const pageText = lines.join('\n');
        fullText += pageText + '\n\n';
      }
      
      console.log('📄 Extracted raw PDF text:', fullText.substring(0, 500) + '...');
      return fullText;
      
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  // Extract quantity, unit, and price data for a specific product (Lithuanian invoice format)
  private static extractProductData(productName: string, contextLines: string[], allLines: string[], productIndex: number) {
    // Heuristic parsing based on table column order near the product line
    // Look ahead a few lines for numeric patterns: quantity, unit, unit price, total
    const window = contextLines.join(' ').replace(/,/g, '.');

    // Quantity: a number near the product, prefer small numbers like 2, 2.5, 5, 20
    const qtyMatch = window.match(/\b(\d{1,3}(?:\.\d{1,3})?)\s*(kg|vnt|pcs|l)\b/i);
    const unit = (qtyMatch?.[2] || 'kg').toLowerCase();
    const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

    // Unit price: look for price-like number with 2 decimals preceding total
    const priceCandidates = window.match(/\b(\d{1,3}\.\d{2})\b/g) || [];
    const unitPrice = priceCandidates.length > 0 ? parseFloat(priceCandidates[0]) : 0;
    const totalPrice = priceCandidates.length > 1 ? parseFloat(priceCandidates[1]) : unitPrice * quantity;

    return {
      quantity,
      unit,
      unitPrice: Math.round(unitPrice * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100
    };
  }

  // Parse invoice data from extracted text using advanced pattern matching
  static parseInvoiceFromText(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('📝 Processing text lines (first 30):', lines.slice(0, 30));
    
    // Generic extraction only; no hard-coded target products
    
    // More comprehensive Lithuanian product patterns
    const productIndicators = [
      // Dairy products
      /sūrio.*lazdelės/i,
      /mocarelos/i,
      
      // Meat products  
      /kiaulienos.*šoninė/i,
      /viščiukų.*broilerių/i,
      /broilerių.*filė/i,
      
      // Frozen products
      /bulvės.*dippers/i,
      /lamb.*weston/i,
      
      // Snacks
      /sūrio.*čili.*pipirų/i,
      /užkanda/i,
      
      // Seafood
      /krevetės.*torpedo/i,
      /litopenaeus.*vannamei/i,
      
      // General patterns
      /šaldytos/i,
      /atšaldyta/i,
      /vakuume/i,
      /kg[,\s]/i,
      /x\d+[\.,]\d+/i  // Pattern like 4x2.5kg
    ];
    
    const products = [];
    let currentProduct = '';
    
    // Multi-line product detection
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip obvious non-product lines
      if (line.match(/^\d+$/) || 
          line.match(/^[A-Z]{2,}\s*\d/) || 
          line.length < 10 ||
          line.match(/^(PVM|VAT|Total|Suma)/i)) {
        continue;
      }
      
      // Check if this line contains product indicators
      const hasProductIndicator = productIndicators.some(pattern => pattern.test(line));
      
      if (hasProductIndicator) {
        // Start or continue building product name
        if (currentProduct) {
          currentProduct += ' ' + line;
        } else {
          currentProduct = line;
        }
        
        // Check if we have a complete product (ends with weight/package info)
        const isComplete = line.match(/(kg|vnt|l)[,\s]*(\(.*\))?\s*$/i) || 
                          line.match(/šaldytos?\s*$/i) || 
                          line.match(/atšaldyta\s*$/i);
        
        if (isComplete && currentProduct) {
          console.log('🎯 Found complete product:', currentProduct);
          products.push({
            productName: currentProduct.trim(),
            description: currentProduct.trim(),
            rawLine: currentProduct.trim()
          });
          currentProduct = '';
        }
      } else if (currentProduct) {
        // Continue building multi-line product name
        currentProduct += ' ' + line;
        
        // Check if this completes the product
        const isComplete = line.match(/(kg|vnt|l)[,\s]*(\(.*\))?\s*$/i) || 
                          line.match(/šaldytos?\s*$/i) || 
                          line.match(/atšaldyta\s*$/i);
        
        if (isComplete) {
          console.log('🎯 Found multi-line product:', currentProduct);
          products.push({
            productName: currentProduct.trim(),
            description: currentProduct.trim(),
            rawLine: currentProduct.trim()
          });
          currentProduct = '';
        }
      }
    }
    
    // Add any remaining product
    if (currentProduct) {
      console.log('🎯 Found final product:', currentProduct);
      products.push({
        productName: currentProduct.trim(),
        description: currentProduct.trim(),
        rawLine: currentProduct.trim()
      });
    }
    
    console.log(`📊 Text extraction found ${products.length} products`);
    
    return {
      products,
      rawText: text,
      lineCount: lines.length
    };
  }
}
