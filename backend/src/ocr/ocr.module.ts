import { Module } from '@nestjs/common';
import { OCRService } from './ocr.service';
import { GeminiOCRProvider } from './gemini-ocr.provider';

@Module({
  providers: [OCRService, GeminiOCRProvider],
  exports: [OCRService],
})
export class OCRModule {}
