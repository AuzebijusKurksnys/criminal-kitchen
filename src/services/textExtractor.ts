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
        
        // Combine all text items with their positioning
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
          
        fullText += pageText + '\n';
      }
      
      console.log('📄 Extracted raw PDF text:', fullText.substring(0, 500) + '...');
      return fullText;
      
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  // Parse invoice data from extracted text using pattern matching
  static parseInvoiceFromText(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('📝 Processing text lines:', lines.slice(0, 20));
    
    // Look for Lithuanian product patterns
    const productPatterns = [
      /sūrio.*lazdelės/i,
      /kiaulienos.*šoninė/i, 
      /viščiukų.*broilerių.*filė/i,
      /bulvės.*dippers/i,
      /sūrio.*čili.*pipirų/i,
      /krevetės.*torpedo/i
    ];
    
    const products = [];
    
    for (const line of lines) {
      // Check if line contains product patterns
      const hasProduct = productPatterns.some(pattern => pattern.test(line));
      
      if (hasProduct) {
        console.log('🎯 Found potential product line:', line);
        products.push({
          productName: line,
          description: line,
          rawLine: line
        });
      }
    }
    
    return {
      products,
      rawText: text,
      lineCount: lines.length
    };
  }
}
