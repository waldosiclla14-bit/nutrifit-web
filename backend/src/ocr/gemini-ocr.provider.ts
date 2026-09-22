import { Injectable, Logger } from '@nestjs/common';
import { DocumentOCRProvider, DocumentInput, OCRResult } from './ocr.types';

// Ordered fallback chain (see AiService): retired/overloaded models 404/503.
const OCR_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

@Injectable()
export class GeminiOCRProvider implements DocumentOCRProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiOCRProvider.name);

  async isAvailable(): Promise<boolean> {
    return !!process.env.GEMINI_API_KEY;
  }

  async processDocument(input: DocumentInput): Promise<OCRResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    let base64Clean = input.base64Data;
    if (base64Clean.includes(',')) base64Clean = base64Clean.split(',')[1];

    const prompt = `Analiza esta imagen de documento comercial (factura, boleta, nota de venta, etc.) y extrae la siguiente informacion en formato JSON exacto:

{
  "supplier": { "value": "nombre del proveedor", "confidence": 0.0-1.0 },
  "documentType": { "value": "FACTURA|BOLETA|NOTA_VENTA|GUIA_DESPACHO|OTRO", "confidence": 0.0-1.0 },
  "documentNumber": { "value": "numero de documento", "confidence": 0.0-1.0 },
  "documentDate": { "value": "YYYY-MM-DD", "confidence": 0.0-1.0 },
  "subtotal": { "value": 0, "confidence": 0.0-1.0 },
  "tax": { "value": 0, "confidence": 0.0-1.0 },
  "total": { "value": 0, "confidence": 0.0-1.0 },
  "products": [
    {
      "name": { "value": "nombre producto", "confidence": 0.0-1.0 },
      "quantity": { "value": 1, "confidence": 0.0-1.0 },
      "unitPrice": { "value": 0, "confidence": 0.0-1.0 },
      "totalLine": { "value": 0, "confidence": 0.0-1.0 }
    }
  ]
}

Reglas:
- Si un campo no se detecta, usa confidence 0 y value vacio/0
- Los montos deben ser enteros en CLP (sin decimales)
- La fecha debe ser YYYY-MM-DD
- Solo responde con el JSON, sin texto adicional`;

    this.logger.log(`Calling Gemini API for ${input.fileName} (${input.mimeType})`);

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: input.mimeType, data: base64Clean } },
        ],
      }],
      generationConfig: { maxOutputTokens: 2048 },
    };

    let lastErr = '';
    for (const model of OCR_MODELS) {
      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          },
        );
      } catch (e: any) {
        lastErr = e?.message || 'fetch failed';
        continue;
      }
      if (response.ok) {
        const data = await response.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        this.logger.log(`Gemini response (${model}): ${text.slice(0, 200)}`);
        if (!text) {
          lastErr = 'empty response';
          continue;
        }
        return this.parseOcrText(text);
      }
      lastErr = await response.text().catch(() => '');
      this.logger.error(`Gemini OCR error ${response.status} (${model}): ${lastErr.slice(0, 200)}`);
    }
    throw new Error(`Gemini OCR failed: ${lastErr.slice(0, 200)}`);
  }

  private parseOcrText(text: string): OCRResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON found in Gemini response: ${text.slice(0, 200)}`);

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      supplier: parsed.supplier || { value: '', confidence: 0 },
      documentType: parsed.documentType || { value: 'OTRO', confidence: 0 },
      documentNumber: parsed.documentNumber || { value: '', confidence: 0 },
      documentDate: parsed.documentDate || { value: '', confidence: 0 },
      subtotal: parsed.subtotal || { value: 0, confidence: 0 },
      tax: parsed.tax || { value: 0, confidence: 0 },
      total: parsed.total || { value: 0, confidence: 0 },
      products: (parsed.products || []).map((p: any) => ({
        name: p.name || { value: 'Producto desconocido', confidence: 0 },
        quantity: p.quantity || { value: 1, confidence: 0 },
        unitPrice: p.unitPrice || { value: 0, confidence: 0 },
        totalLine: p.totalLine || { value: 0, confidence: 0 },
        barcode: p.barcode,
        sku: p.sku,
      })),
      rawText: text,
      provider: this.name,
      processedAt: new Date().toISOString(),
    };
  }
}
