// PDF Processing Service for Invoice OCR
// Converts PDF pages to images for OCR processing

export interface PDFPageImage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export interface PDFProcessingResult {
  success: boolean;
  pages: PDFPageImage[];
  error?: string;
  totalPages: number;
}

class PDFProcessor {
  private pdfjsLib: any = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Don't initialize immediately - wait until first use
  }

  private async initializePDFJS(): Promise<void> {
    if (this.pdfjsLib) return;
    
    // Prevent multiple initialization attempts
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('🔄 Loading PDF.js library...');
      
      // Dynamically import PDF.js only when needed
      const pdfjs = await import('pdfjs-dist');
      this.pdfjsLib = pdfjs;
      
      // Use local worker file (more reliable than CDNs)
      const workerUrl = '/js/pdf.worker.min.js';
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      
      console.log(`✅ PDF.js v${pdfjs.version} loaded successfully`);
      console.log(`🔗 Using local worker: ${workerUrl}`);
    } catch (error) {
      console.error('❌ Failed to load PDF.js:', error);
      this.initPromise = null; // Reset so we can try again
      throw new Error('PDF.js library not available. Please check your internet connection.');
    }
  }

  async processPDF(file: File): Promise<PDFProcessingResult> {
    try {
      await this.initializePDFJS();
      
      if (!this.pdfjsLib) {
        throw new Error('PDF.js not initialized');
      }

      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      const pages: PDFPageImage[] = [];
      
      // Process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Failed to get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/png', 0.95);
        
        pages.push({
          pageNumber: pageNum,
          imageDataUrl,
          width: viewport.width,
          height: viewport.height
        });
      }
      
      return {
        success: true,
        pages,
        totalPages
      };
      
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        success: false,
        pages: [],
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Unknown PDF processing error'
      };
    }
  }

  async processFirstPageOnly(file: File): Promise<PDFProcessingResult> {
    try {
      await this.initializePDFJS();
      
      if (!this.pdfjsLib) {
        throw new Error('PDF.js not initialized');
      }

      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      // Process only the first page
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to image data URL
      const imageDataUrl = canvas.toDataURL('image/png', 0.95);
      
      return {
        success: true,
        pages: [{
          pageNumber: 1,
          imageDataUrl,
          width: viewport.width,
          height: viewport.height
        }],
        totalPages
      };
      
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        success: false,
        pages: [],
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Unknown PDF processing error'
      };
    }
  }

  // Utility method to check if file is a PDF
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  // Utility method to validate PDF file
  static validatePDFFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.isPDFFile(file)) {
      return { valid: false, error: 'File is not a PDF' };
    }
    
    // Check file size (max 50MB for PDFs)
    if (file.size > 50 * 1024 * 1024) {
      return { valid: false, error: 'PDF file too large (max 50MB)' };
    }
    
    return { valid: true };
  }
}

// Export singleton instance
export const pdfProcessor = new PDFProcessor();
export default PDFProcessor;
