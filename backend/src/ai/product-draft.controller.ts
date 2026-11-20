import { BadRequestException, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductDraftMode, ProductDraftService } from './product-draft.service';

const MODES: ProductDraftMode[] = ['photo', 'barcode', 'url', 'text'];
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BASE64 = 560_000; // ≈ 420 KB reales
const MAX_IMAGES = 4;

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductDraftController {
  constructor(private service: ProductDraftService) {}

  @Get('product-draft/status')
  @Roles(Role.ADMIN)
  status(@Req() req: any) {
    return this.service.status(req.user.id);
  }

  @Post('product-draft')
  @Roles(Role.ADMIN)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async create(@Req() req: any) {
    const body = await readJsonBody(req, '5mb');
    const mode = body?.mode as ProductDraftMode;

    if (!MODES.includes(mode)) {
      throw new BadRequestException('mode debe ser photo, barcode, url o text');
    }

    const images = Array.isArray(body?.images) ? body.images : [];
    if (images.length > MAX_IMAGES) {
      throw new BadRequestException(`Máximo ${MAX_IMAGES} imágenes`);
    }
    for (const image of images) {
      if (!MIME_TYPES.has(String(image?.mimeType))) {
        throw new BadRequestException('Formato de imagen no soportado (usa JPEG, PNG o WebP)');
      }
      if (typeof image?.dataBase64 !== 'string' || image.dataBase64.length === 0) {
        throw new BadRequestException('Imagen sin datos');
      }
      if (image.dataBase64.length > MAX_IMAGE_BASE64) {
        throw new BadRequestException('Imagen demasiado grande (máximo 400 KB)');
      }
    }

    const barcode = body?.barcode ? String(body.barcode).trim().slice(0, 32) : undefined;
    const url = body?.url ? String(body.url).trim().slice(0, 500) : undefined;
    const text = body?.text ? String(body.text).trim().slice(0, 3000) : undefined;

    if (url && !/^https?:\/\/\S+$/i.test(url)) {
      throw new BadRequestException('URL inválida (debe empezar con http:// o https://)');
    }
    if (mode === 'photo' && images.length === 0) {
      throw new BadRequestException('El modo photo requiere al menos una imagen');
    }
    if (mode === 'barcode' && !barcode) {
      throw new BadRequestException('El modo barcode requiere barcode');
    }
    if (mode === 'url' && !url) {
      throw new BadRequestException('El modo url requiere url');
    }
    if (mode === 'text' && !text) {
      throw new BadRequestException('El modo text requiere text');
    }

    return this.service.generate(req.user.id, {
      mode,
      images: images.map((image: any) => ({
        mimeType: String(image.mimeType),
        dataBase64: String(image.dataBase64),
      })),
      barcode,
      url,
      text,
      hints: body?.hints
        ? {
            category: body.hints.category ? String(body.hints.category).slice(0, 80) : undefined,
            brand: body.hints.brand ? String(body.hints.brand).slice(0, 80) : undefined,
          }
        : undefined,
      webSearch: body?.webSearch === true || mode === 'url',
    });
  }
}
