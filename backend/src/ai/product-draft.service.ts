import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProductsService } from '../products/products.service';
import { AiUsageService } from './ai-usage.service';
import { GEMINI_MODELS } from './gemini-models';
import { PRODUCT_DRAFT_PROMPT } from './product-draft.prompt';
import {
  DraftModel,
  DraftModelSchema,
  DraftSource,
  normalizeDraft,
} from './product-draft.schema';

export type ProductDraftMode = 'photo' | 'barcode' | 'url' | 'text';

export type ProductDraftInput = {
  mode: ProductDraftMode;
  images?: { mimeType: string; dataBase64: string }[];
  barcode?: string;
  url?: string;
  text?: string;
  hints?: { category?: string; brand?: string };
  webSearch?: boolean;
};

type GeminiResult = {
  ok: boolean;
  data?: any;
  status?: number;
  error?: string;
};

@Injectable()
export class ProductDraftService {
  private readonly logger = new Logger(ProductDraftService.name);

  constructor(
    private usage: AiUsageService,
    private products: ProductsService,
  ) {}

  async generate(userId: string, input: ProductDraftInput) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('IA no configurada (falta GEMINI_API_KEY)');
    }
    if (!this.hasInput(input)) {
      throw new BadRequestException('Envía al menos una foto, código de barras, URL o texto');
    }

    const quota = await this.usage.consume(userId);
    let succeeded = false;
    const startedAt = Date.now();
    const images = input.images || [];
    const ocrText = [input.text, input.barcode, input.url].filter(Boolean).join('\n');
    const wantsWebSearch = input.webSearch === true || input.mode === 'url';

    const parts: any[] = [{ text: this.buildUserPrompt(input) }];
    for (const image of images) {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.dataBase64 } });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let lastStatus = 0;
    let lastError = '';
    let parsedAnyResponse = false;

    try {
      for (const model of GEMINI_MODELS) {
        let webSearchUsed = wantsWebSearch;
        let result = await this.callModel(apiKey, model, parts, webSearchUsed, controller.signal);

        // Grounding puede no estar disponible para el modelo/región: degradar sin romper.
        if (!result.ok && webSearchUsed && result.status === 400) {
          webSearchUsed = false;
          result = await this.callModel(apiKey, model, parts, false, controller.signal);
        }

        if (!result.ok) {
          lastStatus = result.status;
          lastError = result.error;
          this.logger.error(`Gemini draft ${result.status} (${model}): ${result.error.slice(0, 200)}`);
          // 400/401/403 no se arreglan cambiando de modelo.
          if ([400, 401, 403].includes(result.status)) break;
          continue;
        }

        parsedAnyResponse = true;
        const data = result.data;
        const text = this.extractText(data);
        // Un JSON cortado por MAX_TOKENS nunca va a parsear: better fallar claro
        // que quemar cuota en reintentos con el mismo prompt.
        if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
          this.logger.warn('Gemini draft: respuesta truncada (MAX_TOKENS)');
          continue;
        }
        const tokens = Number(data?.usageMetadata?.totalTokenCount) || 0;
        if (tokens > 0) {
          await this.usage.addTokens(userId, tokens).catch((e: any) => {
            this.logger.warn(`No se pudo registrar tokens: ${e?.message}`);
          });
        }

        const parsed = this.safeParse(text);
        if (!parsed) continue;

        const normalized = normalizeDraft(parsed, {
          ocrText,
          inputBarcode: input.barcode,
          hasPhoto: images.length > 0,
        });

        const webSources = webSearchUsed ? this.extractGroundingSources(data) : [];
        const sources = this.dedupeSources([...normalized.draft.sources, ...webSources]);

        const duplicates = await this.products.findDuplicates({
          name: normalized.draft.name || undefined,
          barcode: normalized.draft.barcode || undefined,
        });

        const latencyMs = Date.now() - startedAt;
        this.logger.log(
          `Product draft ok model=${model} latencyMs=${latencyMs} web=${webSearchUsed} quota=${quota.used}/${quota.limit}`,
        );

        succeeded = true;
        return {
          draftId: randomUUID(),
          ...normalized.draft,
          sources,
          confidence: normalized.confidence,
          duplicates,
          warnings: normalized.warnings,
          meta: {
            model,
            latencyMs,
            webSearchUsed,
            quota: { used: quota.used, limit: quota.limit, resetAt: quota.resetAt },
          },
        };
      }

      if (parsedAnyResponse) {
        throw new UnprocessableEntityException(
          'La IA devolvió un borrador con formato inválido. Intenta de nuevo.',
        );
      }
      if ([400, 401, 403].includes(lastStatus)) {
        throw new ServiceUnavailableException('La IA rechazó la solicitud. Revisa la configuración de Gemini.');
      }
      if (lastStatus === 429) {
        throw new ServiceUnavailableException('La IA está saturada. Intenta en unos minutos.');
      }
      throw new HttpException(
        `La IA no respondió (${lastStatus || 'sin conexión'}). Intenta de nuevo.`,
        HttpStatus.GATEWAY_TIMEOUT,
      );
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      if (e?.name === 'AbortError') {
        throw new HttpException('La IA tardó demasiado. Intenta de nuevo.', HttpStatus.GATEWAY_TIMEOUT);
      }
      this.logger.error(`Product draft failed: ${e?.message || lastError}`);
      throw new ServiceUnavailableException('La IA no respondió. Intenta de nuevo.');
    } finally {
      clearTimeout(timer);
      if (!succeeded) {
        await this.usage.refund(userId).catch((e: any) => {
          this.logger.warn(`No se pudo reembolsar la cuota: ${e?.message}`);
        });
      }
    }
  }

  private hasInput(input: ProductDraftInput): boolean {
    return (
      (Array.isArray(input.images) && input.images.length > 0) ||
      !!String(input.barcode || '').trim() ||
      !!String(input.url || '').trim() ||
      !!String(input.text || '').trim()
    );
  }

  private buildUserPrompt(input: ProductDraftInput): string {
    const lines = [PRODUCT_DRAFT_PROMPT, `Modo de entrada: ${input.mode}`];
    if (input.text) lines.push(`Texto entregado por el usuario:\n${String(input.text).slice(0, 3000)}`);
    if (input.barcode) lines.push(`Código de barras: ${String(input.barcode).slice(0, 32)}`);
    if (input.url) lines.push(`URL oficial: ${String(input.url).slice(0, 500)}`);
    if (input.hints?.category) lines.push(`Categoría sugerida por el usuario: ${String(input.hints.category).slice(0, 80)}`);
    if (input.hints?.brand) lines.push(`Marca sugerida por el usuario: ${String(input.hints.brand).slice(0, 80)}`);
    if (input.images?.length) lines.push(`Analiza también las ${input.images.length} imagen(es) adjunta(s).`);
    return lines.join('\n');
  }

  private async callModel(
    apiKey: string,
    model: string,
    parts: any[],
    useWebSearch: boolean,
    signal: AbortSignal,
  ): Promise<GeminiResult> {
    const body: any = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };
    if (useWebSearch) {
      body.tools = [{ google_search: {} }];
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        },
      );

      if (!response.ok) {
        const error = await response.text().catch(() => '');
        return { ok: false, status: response.status, error };
      }

      return { ok: true, data: await response.json() };
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      return { ok: false, status: 0, error: e?.message || 'fetch failed' };
    }
  }

  /**
   * Gemini puede devolver varios parts (pensamiento, texto, llamadas a tools).
   * Tomar solo parts[0] descarta el JSON cuando el primero es un thought vacío.
   */
  private extractText(data: any): string {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
      .filter((part: any) => part?.thought !== true && typeof part?.text === 'string')
      .map((part: any) => part.text)
      .join('')
      .trim();
  }

  /** Cuota actual sin consumirla; también sirve para precalentar Render. */
  async status(userId: string) {
    return {
      ...(await this.usage.peek(userId)),
      configured: !!process.env.GEMINI_API_KEY,
    };
  }

  private safeParse(text: string): DraftModel | null {
    if (!text.trim()) {
      this.logger.warn('Gemini draft: respuesta vacía');
      return null;
    }

    const clean = text
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();

    try {
      const json = JSON.parse(clean);
      const result = DraftModelSchema.safeParse(json);
      if (!result.success) {
        this.logger.warn(`Gemini draft: esquema inválido (${result.error.issues[0]?.message})`);
        return null;
      }
      return result.data;
    } catch {
      this.logger.warn('Gemini draft: JSON inválido');
      return null;
    }
  }

  private extractGroundingSources(data: any): DraftSource[] {
    const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const now = new Date().toISOString();
    const sources: DraftSource[] = [];

    for (const chunk of chunks) {
      const web = chunk?.web;
      if (!web?.uri || !/^https?:\/\//i.test(String(web.uri))) continue;
      sources.push({
        type: 'web',
        title: String(web.title || web.uri).slice(0, 200),
        url: String(web.uri).slice(0, 500),
        field: 'market',
        retrievedAt: now,
      });
      if (sources.length >= 10) break;
    }

    return sources;
  }

  private dedupeSources(sources: DraftSource[]): DraftSource[] {
    const seen = new Set<string>();
    const result: DraftSource[] = [];
    for (const source of sources) {
      const key = source.url ? `url:${source.url}` : `${source.type}:${source.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(source);
      if (result.length >= 10) break;
    }
    return result;
  }
}
