import { Injectable, Logger } from '@nestjs/common';
import { DocumentOCRProvider, DocumentInput, OCRResult } from './ocr.types';

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);
  private providers: DocumentOCRProvider[] = [];

  registerProvider(provider: DocumentOCRProvider) {
    this.providers.push(provider);
    this.logger.log(`OCR provider registered: ${provider.name}`);
  }

  async processDocument(input: DocumentInput): Promise<OCRResult | null> {
    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable();
        if (!available) continue;

        this.logger.log(`Processing document with ${provider.name}`);
        const result = await provider.processDocument(input);
        return result;
      } catch (err: any) {
        this.logger.warn(`OCR provider ${provider.name} failed: ${err?.message}`);
      }
    }

    this.logger.warn('No OCR provider could process the document');
    return null;
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) available.push(provider.name);
      } catch {}
    }
    return available;
  }
}
