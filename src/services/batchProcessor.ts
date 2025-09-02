import { extractInvoiceData } from './invoiceParser';
import type { InvoiceProcessingResult } from '../data/types';

export interface BatchProcessingOptions {
  concurrency?: number; // Number of files to process simultaneously
  retryAttempts?: number; // Number of retry attempts for failed files
  retryDelay?: number; // Delay between retries in milliseconds
}

export interface BatchProcessingResult {
  file: File;
  success: boolean;
  result?: InvoiceProcessingResult;
  error?: string;
  processingTime: number;
}

export interface BatchProgressCallback {
  (progress: {
    total: number;
    completed: number;
    failed: number;
    currentFile?: string;
  }): void;
}

export class BatchInvoiceProcessor {
  private options: Required<BatchProcessingOptions>;

  constructor(options: BatchProcessingOptions = {}) {
    this.options = {
      concurrency: 1, // Process one at a time to avoid API rate limits
      retryAttempts: 2,
      retryDelay: 1000,
      ...options
    };
  }

  async processFiles(
    files: File[],
    onProgress?: BatchProgressCallback
  ): Promise<BatchProcessingResult[]> {
    const results: BatchProcessingResult[] = [];
    let completed = 0;
    let failed = 0;

    // Process files with limited concurrency
    for (let i = 0; i < files.length; i += this.options.concurrency) {
      const batch = files.slice(i, i + this.options.concurrency);
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        if (onProgress) {
          onProgress({
            total: files.length,
            completed,
            failed,
            currentFile: file.name
          });
        }

        const result = await this.processFileWithRetry(file);
        
        if (result.success) {
          completed++;
        } else {
          failed++;
        }

        if (onProgress) {
          onProgress({
            total: files.length,
            completed,
            failed
          });
        }

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private async processFileWithRetry(file: File): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    let lastError: string = '';

    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        }

        const result = await extractInvoiceData(file);
        
        return {
          file,
          success: true,
          result,
          processingTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Attempt ${attempt + 1} failed for ${file.name}:`, error);
      }
    }

    return {
      file,
      success: false,
      error: lastError,
      processingTime: Date.now() - startTime
    };
  }

  // Static utility method for simple batch processing
  static async processFiles(
    files: File[],
    onProgress?: BatchProgressCallback,
    options?: BatchProcessingOptions
  ): Promise<BatchProcessingResult[]> {
    const processor = new BatchInvoiceProcessor(options);
    return processor.processFiles(files, onProgress);
  }
}

// Enhanced file validation for batch processing
export function validateFilesForBatch(files: File[]): {
  validFiles: File[];
  invalidFiles: Array<{ file: File; reason: string }>;
} {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; reason: string }> = [];

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of files) {
    let isValid = true;
    let reason = '';

    // Check file type
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      isValid = false;
      reason = `Unsupported file type: ${file.type}. Allowed: PDF, JPG, PNG, HEIC`;
    }

    // Check file size
    if (file.size > maxSize) {
      isValid = false;
      reason = `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`;
    }

    // Check file name for duplicates
    if (validFiles.some(validFile => validFile.name === file.name)) {
      isValid = false;
      reason = 'Duplicate file name';
    }

    if (isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, reason });
    }
  }

  return { validFiles, invalidFiles };
}

// Utility to estimate processing time
export function estimateProcessingTime(fileCount: number): {
  estimated: number; // in milliseconds
  formattedTime: string;
} {
  // Estimate based on average processing time per file
  const avgTimePerFile = 15000; // 15 seconds per file
  const estimated = fileCount * avgTimePerFile;

  const minutes = Math.floor(estimated / 60000);
  const seconds = Math.floor((estimated % 60000) / 1000);

  let formattedTime = '';
  if (minutes > 0) {
    formattedTime = `${minutes}m ${seconds}s`;
  } else {
    formattedTime = `${seconds}s`;
  }

  return { estimated, formattedTime };
}
